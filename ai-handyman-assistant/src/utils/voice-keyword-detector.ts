import { AppServer, AppSession } from '@mentra/sdk';
import { Logger } from './logger';

export interface KeywordDetectorConfig {
  packageName: string;
  apiKey: string;
  port: number;
  keywords: string[];
  onKeywordDetected?: (keyword: string, sessionId: string, userId: string) => void;
}

export class VoiceKeywordDetector extends AppServer {
  private logger: Logger;
  private keywords: string[];
  private activeSessions: Map<string, { session: AppSession; userId: string }> = new Map();
  private onKeywordDetected?: (keyword: string, sessionId: string, userId: string) => void;

  constructor(config: KeywordDetectorConfig) {
    super({
      packageName: config.packageName,
      apiKey: config.apiKey,
      port: config.port
    });

    this.logger = new Logger('VoiceKeywordDetector');
    this.keywords = config.keywords.map(k => k.toLowerCase());
    this.onKeywordDetected = config.onKeywordDetected;

    this.logger.info(`Keyword detector initialized with keywords: ${this.keywords.join(', ')}`);
  }

  protected async onSession(
    session: AppSession,
    sessionId: string,
    userId: string
  ): Promise<void> {
    this.logger.info(`New session started: ${sessionId} for user ${userId}`);

    // Store the session
    this.activeSessions.set(sessionId, { session, userId });

    // Display initial message
    try {
      await session.layouts.showTextWall('Voice Keyword Detector Active');
      await session.layouts.showNotification(`Listening for: ${this.keywords.join(', ')}`);
      session.logger.info('Display mode active - showing visual feedback');
    } catch (error) {
      // Audio-only mode
      await session.audio.speak(`Voice keyword detector is active. Listening for: ${this.keywords.join(', ')}`);
      session.logger.info('Audio-only mode active');
    }

    // Set up continuous listening
    this.setupContinuousListening(session, sessionId, userId);

    // Handle disconnect
    session.on('disconnect', () => {
      this.logger.info(`Session ${sessionId} disconnected`);
      this.activeSessions.delete(sessionId);
    });
  }

  private setupContinuousListening(
    session: AppSession,
    sessionId: string,
    userId: string
  ): void {
    // Listen for transcripts (both final and interim)
    session.microphone.on('transcript', async (transcript, isFinal) => {
      const lowerTranscript = transcript.toLowerCase();

      // Check for keywords in the transcript
      for (const keyword of this.keywords) {
        if (lowerTranscript.includes(keyword)) {
          this.handleKeywordDetected(keyword, transcript, session, sessionId, userId, isFinal);
        }
      }
    });

    // Enable continuous transcription
    session.microphone.startTranscription();

    this.logger.info(`Started continuous listening for session ${sessionId}`);
  }

  private async handleKeywordDetected(
    keyword: string,
    originalTranscript: string,
    session: AppSession,
    sessionId: string,
    userId: string,
    isFinal: boolean
  ): Promise<void> {
    const timestamp = new Date().toISOString();

    // Log to console
    console.log(`\n🎯 KEYWORD DETECTED: "${keyword}"`);
    console.log(`   Session: ${sessionId}`);
    console.log(`   User: ${userId}`);
    console.log(`   Full transcript: "${originalTranscript}"`);
    console.log(`   Is final: ${isFinal}`);
    console.log(`   Timestamp: ${timestamp}\n`);

    // Visual/audio feedback
    try {
      // Try visual feedback
      await session.layouts.showNotification(`✓ Detected: ${keyword}`);

      // Show the keyword prominently
      await session.layouts.showCenteredText(keyword.toUpperCase());

      // Clear after a short delay
      setTimeout(async () => {
        try {
          await session.layouts.clear();
          await session.layouts.showTextWall('Listening...');
        } catch (e) {
          // Ignore if session ended
        }
      }, 2000);
    } catch (error) {
      // Fall back to audio feedback
      await session.audio.speak(`Detected ${keyword}`);
    }

    // Call custom handler if provided
    if (this.onKeywordDetected) {
      this.onKeywordDetected(keyword, sessionId, userId);
    }

    // Log to session logger
    session.logger.info(`Keyword detected: ${keyword} in "${originalTranscript}"`);
  }

  // Get active session count
  getActiveSessionCount(): number {
    return this.activeSessions.size;
  }

  // Get all active sessions
  getActiveSessions(): Array<{ sessionId: string; userId: string }> {
    return Array.from(this.activeSessions.entries()).map(([sessionId, data]) => ({
      sessionId,
      userId: data.userId
    }));
  }

  // Send message to specific session
  async sendMessageToSession(sessionId: string, message: string): Promise<void> {
    const sessionData = this.activeSessions.get(sessionId);
    if (sessionData) {
      try {
        await sessionData.session.layouts.showTextWall(message);
      } catch (error) {
        await sessionData.session.audio.speak(message);
      }
    }
  }

  // Broadcast to all sessions
  async broadcast(message: string): Promise<void> {
    for (const [sessionId, sessionData] of this.activeSessions) {
      try {
        await sessionData.session.layouts.showTextWall(message);
      } catch (error) {
        await sessionData.session.audio.speak(message);
      }
    }
  }
}