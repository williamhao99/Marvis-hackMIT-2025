import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import multer from 'multer';
import { ApplicationOrchestrator } from '../core/orchestrator';
import { config } from '../config/config';
import { Logger } from '../utils/logger';
import path from 'path';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

export class APIServer {
  private app: Express;
  private orchestrator: ApplicationOrchestrator;
  private logger: Logger;

  constructor(orchestrator: ApplicationOrchestrator) {
    this.app = express();
    this.orchestrator = orchestrator;
    this.logger = new Logger('APIServer');

    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  private setupMiddleware(): void {
    this.app.use(cors());
    this.app.use(bodyParser.json());
    this.app.use(bodyParser.urlencoded({ extended: true }));

    this.app.use((req: Request, res: Response, next: NextFunction) => {
      this.logger.info(`${req.method} ${req.path}`);
      next();
    });
  }

  private setupRoutes(): void {
    this.app.get('/health', (req: Request, res: Response) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      });
    });

    this.app.post('/api/session/start', async (req: Request, res: Response) => {
      try {
        const session = this.orchestrator.getActiveSession();

        if (session) {
          res.status(400).json({ error: 'Session already active' });
          return;
        }

        this.orchestrator.emit('wakeWordDetected');

        res.json({
          message: 'Session started',
          sessionId: 'pending'
        });
      } catch (error) {
        this.logger.error('Failed to start session', error);
        res.status(500).json({ error: 'Failed to start session' });
      }
    });

    this.app.post('/api/session/end', async (req: Request, res: Response) => {
      try {
        const { sessionId } = req.body;
        await this.orchestrator.endSession(sessionId);

        res.json({ message: 'Session ended' });
      } catch (error) {
        this.logger.error('Failed to end session', error);
        res.status(500).json({ error: 'Failed to end session' });
      }
    });

    this.app.get('/api/session/current', (req: Request, res: Response) => {
      const session = this.orchestrator.getActiveSession();

      if (!session) {
        res.status(404).json({ error: 'No active session' });
        return;
      }

      res.json({
        sessionId: session.id,
        startTime: session.startTime,
        currentStep: session.currentStep,
        detectedObject: session.detectedObject,
        hasManual: !!session.currentManual
      });
    });

    this.app.post('/api/image/process', upload.single('image'), async (req: Request, res: Response) => {
      try {
        if (!req.file) {
          res.status(400).json({ error: 'No image provided' });
          return;
        }

        const session = this.orchestrator.getActiveSession();

        if (!session) {
          res.status(400).json({ error: 'No active session' });
          return;
        }

        this.orchestrator.emit('imageCapture', req.file.buffer);

        res.json({ message: 'Image processing started' });
      } catch (error) {
        this.logger.error('Failed to process image', error);
        res.status(500).json({ error: 'Failed to process image' });
      }
    });

    this.app.post('/api/voice/transcribe', upload.single('audio'), async (req: Request, res: Response) => {
      try {
        if (!req.file) {
          res.status(400).json({ error: 'No audio provided' });
          return;
        }

        res.json({ message: 'Audio transcription started' });
      } catch (error) {
        this.logger.error('Failed to transcribe audio', error);
        res.status(500).json({ error: 'Failed to transcribe audio' });
      }
    });

    this.app.post('/api/command', async (req: Request, res: Response) => {
      try {
        const { command } = req.body;

        if (!command) {
          res.status(400).json({ error: 'No command provided' });
          return;
        }

        const session = this.orchestrator.getActiveSession();

        if (!session) {
          res.status(400).json({ error: 'No active session' });
          return;
        }

        this.orchestrator.emit('transcription', { text: command });

        res.json({ message: 'Command processed' });
      } catch (error) {
        this.logger.error('Failed to process command', error);
        res.status(500).json({ error: 'Failed to process command' });
      }
    });

    this.app.get('/api/manual/search', async (req: Request, res: Response) => {
      try {
        const { object, brand, model } = req.query;

        res.json({
          message: 'Manual search initiated',
          query: { object, brand, model }
        });
      } catch (error) {
        this.logger.error('Failed to search manual', error);
        res.status(500).json({ error: 'Failed to search manual' });
      }
    });

    this.app.get('/api/glasses/status', (req: Request, res: Response) => {
      res.json({
        mentraLive: { connected: true, battery: 85 },
        evenG1: { connected: true, battery: 92 }
      });
    });

    this.app.post('/api/assistance/request', async (req: Request, res: Response) => {
      try {
        const { issue } = req.body;
        const session = this.orchestrator.getActiveSession();

        if (!session) {
          res.status(400).json({ error: 'No active session' });
          return;
        }

        this.orchestrator.emit('assistanceRequested', {
          sessionId: session.id,
          issue,
          timestamp: new Date()
        });

        res.json({ message: 'Assistance requested' });
      } catch (error) {
        this.logger.error('Failed to request assistance', error);
        res.status(500).json({ error: 'Failed to request assistance' });
      }
    });
  }

  private setupErrorHandling(): void {
    this.app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
      this.logger.error('Unhandled error', err);

      res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    });

    this.app.use((req: Request, res: Response) => {
      res.status(404).json({ error: 'Not found' });
    });
  }

  async start(port: number): Promise<void> {
    return new Promise((resolve) => {
      this.app.listen(port, () => {
        this.logger.info(`API server listening on port ${port}`);
        resolve();
      });
    });
  }
}