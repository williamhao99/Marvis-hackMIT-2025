import { Porcupine, BuiltinKeyword } from '@picovoice/porcupine-node';
import { EventEmitter } from 'events';
import { Logger } from '../utils/logger';

export interface VoiceActivationConfig {
  accessKey: string;
  customWakeWordPath?: string;
  sensitivity?: number;
  audioDeviceIndex?: number;
}

export class VoiceActivationModule extends EventEmitter {
  private porcupine: Porcupine | null = null;
  private isListening: boolean = false;
  private logger: Logger;
  private config: VoiceActivationConfig;
  private audioStream: any = null;

  constructor(config: VoiceActivationConfig) {
    super();
    this.config = config;
    this.logger = new Logger('VoiceActivation');
  }

  async initialize(): Promise<void> {
    try {
      const keywords = this.config.customWakeWordPath
        ? [this.config.customWakeWordPath]
        : [BuiltinKeyword.ALEXA]; // Fallback to built-in keyword for testing

      this.porcupine = new Porcupine(
        this.config.accessKey,
        keywords,
        this.config.sensitivity ? [this.config.sensitivity] : [0.5]
      );

      this.logger.info('Voice activation module initialized');
    } catch (error) {
      this.logger.error('Failed to initialize Porcupine', error);
      throw error;
    }
  }

  async startListening(): Promise<void> {
    if (this.isListening) {
      this.logger.warn('Already listening for wake word');
      return;
    }

    try {
      const recorder = require('node-record-lpcm16');

      this.audioStream = recorder.record({
        sampleRate: 16000,
        channels: 1,
        audioType: 'raw',
        device: this.config.audioDeviceIndex,
        recorder: 'sox'
      });

      this.isListening = true;
      this.logger.info('Started listening for wake word');

      this.audioStream.stream().on('data', (audioBuffer: Buffer) => {
        this.processAudio(audioBuffer);
      });

      this.audioStream.stream().on('error', (error: Error) => {
        this.logger.error('Audio stream error', error);
        this.emit('error', error);
      });

    } catch (error) {
      this.logger.error('Failed to start listening', error);
      throw error;
    }
  }

  private processAudio(audioBuffer: Buffer): void {
    if (!this.porcupine || !this.isListening) return;

    try {
      const frameLength = this.porcupine.frameLength * 2;

      for (let i = 0; i + frameLength <= audioBuffer.length; i += frameLength) {
        const frame = new Int16Array(
          audioBuffer.buffer,
          audioBuffer.byteOffset + i,
          this.porcupine.frameLength
        );

        const keywordIndex = this.porcupine.process(frame);

        if (keywordIndex >= 0) {
          this.logger.info('Wake word detected!');
          this.emit('wakeWordDetected', {
            timestamp: Date.now(),
            keywordIndex
          });

          this.pauseListening();

          setTimeout(() => {
            this.resumeListening();
          }, 5000);
        }
      }
    } catch (error) {
      this.logger.error('Error processing audio', error);
    }
  }

  pauseListening(): void {
    this.isListening = false;
    this.logger.info('Paused wake word detection');
  }

  resumeListening(): void {
    this.isListening = true;
    this.logger.info('Resumed wake word detection');
  }

  async stopListening(): Promise<void> {
    if (!this.isListening) return;

    this.isListening = false;

    if (this.audioStream) {
      this.audioStream.stop();
      this.audioStream = null;
    }

    this.logger.info('Stopped listening for wake word');
  }

  async cleanup(): Promise<void> {
    await this.stopListening();

    if (this.porcupine) {
      this.porcupine.release();
      this.porcupine = null;
    }

    this.logger.info('Voice activation module cleaned up');
  }

  getFrameLength(): number {
    return this.porcupine ? this.porcupine.frameLength : 0;
  }

  getSampleRate(): number {
    return this.porcupine ? this.porcupine.sampleRate : 16000;
  }
}