declare module 'node-media-server' {
  interface NodeMediaServerConfig {
    rtmp?: {
      port?: number;
      chunk_size?: number;
      gop_cache?: boolean;
      ping?: number;
      ping_timeout?: number;
    };
    http?: {
      port?: number;
      allow_origin?: string;
      mediaroot?: string;
    };
    trans?: {
      ffmpeg?: string;
      tasks?: Array<{
        app: string;
        mp4?: boolean;
        mp4Flags?: string;
      }>;
    };
  }

  interface Session {
    reject(): void;
    accept(): void;
  }

  class NodeMediaServer {
    constructor(config: NodeMediaServerConfig);
    run(): void;
    stop(): void;
    on(event: string, callback: (...args: any[]) => void): void;
    getSession(id: string): Session | null;
  }

  export default NodeMediaServer;
}