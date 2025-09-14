import NodeMediaServer from 'node-media-server';
import { EventEmitter } from 'events';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { createServer } from 'http';
import express from 'express';
import { Logger } from '../utils/logger';

export interface RTMPConfig {
  rtmpPort: number;
  httpPort: number;
  mediaRoot: string;
  allowOrigin?: string;
  secretKey?: string;
}

export interface StreamSession {
  id: string;
  streamKey: string;
  userId?: string;
  startTime: Date;
  endTime?: Date;
  isActive: boolean;
  viewers: number;
  overlayData?: any;
}

export class RTMPStreamingModule extends EventEmitter {
  private config: RTMPConfig;
  private logger: Logger;
  private nms: NodeMediaServer;
  private io: SocketIOServer;
  private app: express.Application;
  private httpServer: any;
  private activeSessions: Map<string, StreamSession> = new Map();

  constructor(config: RTMPConfig) {
    super();
    this.config = config;
    this.logger = new Logger('RTMPStreaming');

    this.app = express();
    this.httpServer = createServer(this.app);
    this.io = new SocketIOServer(this.httpServer, {
      cors: {
        origin: config.allowOrigin || '*',
        methods: ['GET', 'POST']
      }
    });

    const nmsConfig = {
      rtmp: {
        port: config.rtmpPort,
        chunk_size: 60000,
        gop_cache: true,
        ping: 30,
        ping_timeout: 60
      },
      http: {
        port: config.httpPort,
        mediaroot: config.mediaRoot || './media',
        allow_origin: config.allowOrigin || '*'
      },
      trans: {
        ffmpeg: '/usr/local/bin/ffmpeg',
        tasks: [
          {
            app: 'live',
            hls: true,
            hlsFlags: '[hls_time=2:hls_list_size=3:hls_flags=delete_segments]',
            hlsKeep: false,
            dash: true,
            dashFlags: '[f=dash:window_size=3:extra_window_size=5]',
            dashKeep: false
          }
        ]
      }
    };

    this.nms = new NodeMediaServer(nmsConfig);

    this.setupEventHandlers();
    this.setupSocketIO();
  }

  private setupEventHandlers(): void {
    this.nms.on('preConnect', (id: string, args: any) => {
      this.logger.info(`Stream pre-connect: ${id}`, args);

      if (this.config.secretKey && args.token !== this.config.secretKey) {
        this.logger.warn(`Unauthorized stream attempt: ${id}`);
        const session = this.nms.getSession(id);
        session?.reject();
        return;
      }
    });

    this.nms.on('postConnect', (id: string, args: any) => {
      this.logger.info(`Stream connected: ${id}`);
    });

    this.nms.on('doneConnect', (id: string, args: any) => {
      this.logger.info(`Stream disconnected: ${id}`);

      const session = this.activeSessions.get(id);
      if (session) {
        session.isActive = false;
        session.endTime = new Date();
        this.emit('streamEnded', session);
      }
    });

    this.nms.on('prePublish', (id: string, StreamPath: string, args: any) => {
      this.logger.info(`Stream starting: ${id} on path ${StreamPath}`);

      const streamKey = StreamPath.split('/').pop();

      const session: StreamSession = {
        id,
        streamKey: streamKey || id,
        startTime: new Date(),
        isActive: true,
        viewers: 0,
        userId: args.userId
      };

      this.activeSessions.set(id, session);
      this.emit('streamStarted', session);

      this.io.emit('streamStarted', {
        sessionId: id,
        streamKey: session.streamKey,
        streamUrl: this.getStreamUrl(session.streamKey)
      });
    });

    this.nms.on('donePublish', (id: string, StreamPath: string, args: any) => {
      this.logger.info(`Stream ended: ${id}`);

      const session = this.activeSessions.get(id);
      if (session) {
        session.isActive = false;
        session.endTime = new Date();

        this.io.emit('streamEnded', {
          sessionId: id,
          streamKey: session.streamKey
        });
      }
    });

    this.nms.on('prePlay', (id: string, StreamPath: string, args: any) => {
      this.logger.info(`Viewer joining: ${id} for stream ${StreamPath}`);

      const streamKey = StreamPath.split('/').pop();
      const session = Array.from(this.activeSessions.values())
        .find(s => s.streamKey === streamKey);

      if (session) {
        session.viewers++;
        this.emit('viewerJoined', { sessionId: session.id, viewers: session.viewers });
      }
    });

    this.nms.on('donePlay', (id: string, StreamPath: string, args: any) => {
      this.logger.info(`Viewer left: ${id}`);

      const streamKey = StreamPath.split('/').pop();
      const session = Array.from(this.activeSessions.values())
        .find(s => s.streamKey === streamKey);

      if (session && session.viewers > 0) {
        session.viewers--;
        this.emit('viewerLeft', { sessionId: session.id, viewers: session.viewers });
      }
    });
  }

  private setupSocketIO(): void {
    this.io.on('connection', (socket: Socket) => {
      this.logger.info(`WebSocket client connected: ${socket.id}`);

      socket.on('requestStream', (streamKey: string) => {
        const session = Array.from(this.activeSessions.values())
          .find(s => s.streamKey === streamKey);

        if (session && session.isActive) {
          socket.emit('streamData', {
            sessionId: session.id,
            streamKey: session.streamKey,
            streamUrl: this.getStreamUrl(session.streamKey),
            hlsUrl: this.getHLSUrl(session.streamKey),
            dashUrl: this.getDashUrl(session.streamKey),
            isActive: session.isActive,
            viewers: session.viewers
          });
        } else {
          socket.emit('streamNotFound', { streamKey });
        }
      });

      socket.on('sendOverlay', (data: any) => {
        const { sessionId, overlayType, overlayData } = data;
        const session = this.activeSessions.get(sessionId);

        if (session) {
          session.overlayData = overlayData;

          this.io.emit('overlayUpdate', {
            sessionId,
            overlayType,
            overlayData
          });

          this.emit('overlayReceived', {
            sessionId,
            overlayType,
            overlayData
          });
        }
      });

      socket.on('requestAssistance', (data: any) => {
        const { sessionId, userId, issue } = data;

        this.emit('assistanceRequested', {
          sessionId,
          userId,
          issue,
          timestamp: new Date()
        });

        socket.broadcast.emit('assistanceRequest', {
          sessionId,
          userId,
          issue
        });
      });

      socket.on('provideAssistance', (data: any) => {
        const { sessionId, assistantId, message } = data;

        this.emit('assistanceProvided', {
          sessionId,
          assistantId,
          message,
          timestamp: new Date()
        });

        this.io.to(sessionId).emit('assistanceMessage', {
          assistantId,
          message
        });
      });

      socket.on('joinSession', (sessionId: string) => {
        socket.join(sessionId);
        this.logger.info(`Socket ${socket.id} joined session ${sessionId}`);
      });

      socket.on('leaveSession', (sessionId: string) => {
        socket.leave(sessionId);
        this.logger.info(`Socket ${socket.id} left session ${sessionId}`);
      });

      socket.on('disconnect', () => {
        this.logger.info(`WebSocket client disconnected: ${socket.id}`);
      });
    });
  }

  async start(): Promise<void> {
    try {
      this.nms.run();

      await new Promise<void>((resolve) => {
        this.httpServer.listen(this.config.httpPort + 1, () => {
          this.logger.info(`WebSocket server listening on port ${this.config.httpPort + 1}`);
          resolve();
        });
      });

      this.setupExpressRoutes();

      this.logger.info(`RTMP server started on port ${this.config.rtmpPort}`);
      this.logger.info(`HTTP server started on port ${this.config.httpPort}`);
    } catch (error) {
      this.logger.error('Failed to start RTMP streaming module', error);
      throw error;
    }
  }

  private setupExpressRoutes(): void {
    this.app.use(express.json());

    this.app.get('/api/streams', (req, res) => {
      const streams = Array.from(this.activeSessions.values())
        .filter(s => s.isActive)
        .map(s => ({
          sessionId: s.id,
          streamKey: s.streamKey,
          startTime: s.startTime,
          viewers: s.viewers,
          streamUrl: this.getStreamUrl(s.streamKey)
        }));

      res.json({ streams });
    });

    this.app.get('/api/stream/:streamKey', (req, res) => {
      const session = Array.from(this.activeSessions.values())
        .find(s => s.streamKey === req.params.streamKey);

      if (session) {
        res.json({
          sessionId: session.id,
          streamKey: session.streamKey,
          isActive: session.isActive,
          startTime: session.startTime,
          endTime: session.endTime,
          viewers: session.viewers,
          streamUrl: this.getStreamUrl(session.streamKey),
          hlsUrl: this.getHLSUrl(session.streamKey),
          dashUrl: this.getDashUrl(session.streamKey)
        });
      } else {
        res.status(404).json({ error: 'Stream not found' });
      }
    });

    this.app.post('/api/stream/:streamKey/overlay', (req, res) => {
      const session = Array.from(this.activeSessions.values())
        .find(s => s.streamKey === req.params.streamKey);

      if (session) {
        const { overlayType, overlayData } = req.body;

        session.overlayData = overlayData;

        this.io.emit('overlayUpdate', {
          sessionId: session.id,
          overlayType,
          overlayData
        });

        res.json({ success: true });
      } else {
        res.status(404).json({ error: 'Stream not found' });
      }
    });
  }

  getStreamUrl(streamKey: string): string {
    return `rtmp://localhost:${this.config.rtmpPort}/live/${streamKey}`;
  }

  getHLSUrl(streamKey: string): string {
    return `http://localhost:${this.config.httpPort}/live/${streamKey}/index.m3u8`;
  }

  getDashUrl(streamKey: string): string {
    return `http://localhost:${this.config.httpPort}/live/${streamKey}/index.mpd`;
  }

  getActiveStreams(): StreamSession[] {
    return Array.from(this.activeSessions.values()).filter(s => s.isActive);
  }

  getStreamSession(sessionId: string): StreamSession | undefined {
    return this.activeSessions.get(sessionId);
  }

  async stop(): Promise<void> {
    this.nms.stop();
    this.httpServer.close();
    this.io.close();
    this.logger.info('RTMP streaming module stopped');
  }

  broadcastOverlay(sessionId: string, overlayData: any): void {
    this.io.to(sessionId).emit('overlayUpdate', {
      sessionId,
      overlayData
    });
  }

  getViewerCount(streamKey: string): number {
    const session = Array.from(this.activeSessions.values())
      .find(s => s.streamKey === streamKey);
    return session?.viewers || 0;
  }
}