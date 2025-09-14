import * as sdk from 'microsoft-cognitiveservices-speech-sdk';
import OpenAI from 'openai';
import { Logger } from '../utils/logger';
import { EventEmitter } from 'events';
import fs from 'fs';
import path from 'path';

export interface STTConfig {
  provider: 'azure' | 'openai';
  azureKey?: string;
  azureRegion?: string;
  openaiKey?: string;
  language?: string;
}

export interface TranscriptionResult {
  text: string;
  confidence?: number;
  language?: string;
  duration?: number;
  timestamp: number;
}

export class SpeechToTextService extends EventEmitter {
  private config: STTConfig;
  private logger: Logger;
  private azureRecognizer?: sdk.SpeechRecognizer;
  private openaiClient?: OpenAI;
  private isProcessing: boolean = false;

  constructor(config: STTConfig) {
    super();
    this.config = config;
    this.logger = new Logger('SpeechToText');
  }

  async initialize(): Promise<void> {
    try {
      if (this.config.provider === 'azure' && this.config.azureKey && this.config.azureRegion) {
        this.initializeAzure();
      } else if (this.config.provider === 'openai' && this.config.openaiKey) {
        this.initializeOpenAI();
      } else {
        throw new Error('Invalid STT provider configuration');
      }

      this.logger.info(`STT service initialized with provider: ${this.config.provider}`);
    } catch (error) {
      this.logger.error('Failed to initialize STT service', error);
      throw error;
    }
  }

  private initializeAzure(): void {
    const speechConfig = sdk.SpeechConfig.fromSubscription(
      this.config.azureKey!,
      this.config.azureRegion!
    );

    speechConfig.speechRecognitionLanguage = this.config.language || 'en-US';
    speechConfig.outputFormat = sdk.OutputFormat.Detailed;
    speechConfig.setProfanity(sdk.ProfanityOption.Raw);

    const audioConfig = sdk.AudioConfig.fromDefaultMicrophoneInput();

    this.azureRecognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);

    this.azureRecognizer.recognized = (s, e) => {
      if (e.result.reason === sdk.ResultReason.RecognizedSpeech) {
        const result: TranscriptionResult = {
          text: e.result.text,
          confidence: e.result.properties.getProperty(sdk.PropertyId.SpeechServiceResponse_JsonResult)
            ? JSON.parse(e.result.properties.getProperty(sdk.PropertyId.SpeechServiceResponse_JsonResult))
                .NBest[0]?.Confidence
            : undefined,
          duration: e.result.duration / 10000000,
          timestamp: Date.now()
        };
        this.emit('transcription', result);
      }
    };

    this.azureRecognizer.canceled = (s, e) => {
      this.logger.error('Azure STT canceled', e.errorDetails);
      this.emit('error', new Error(e.errorDetails));
    };
  }

  private initializeOpenAI(): void {
    this.openaiClient = new OpenAI({
      apiKey: this.config.openaiKey
    });
  }

  async transcribeAudio(audioBuffer: Buffer): Promise<TranscriptionResult> {
    if (this.isProcessing) {
      throw new Error('Already processing audio');
    }

    this.isProcessing = true;

    try {
      if (this.config.provider === 'azure') {
        return await this.transcribeWithAzure(audioBuffer);
      } else if (this.config.provider === 'openai') {
        return await this.transcribeWithOpenAI(audioBuffer);
      } else {
        throw new Error('Invalid STT provider');
      }
    } finally {
      this.isProcessing = false;
    }
  }

  private async transcribeWithAzure(audioBuffer: Buffer): Promise<TranscriptionResult> {
    return new Promise((resolve, reject) => {
      const pushStream = sdk.AudioInputStream.createPushStream(
        sdk.AudioStreamFormat.getWaveFormatPCM(16000, 16, 1)
      );

      pushStream.write(audioBuffer.buffer.slice(audioBuffer.byteOffset, audioBuffer.byteOffset + audioBuffer.byteLength) as ArrayBuffer);
      pushStream.close();

      const audioConfig = sdk.AudioConfig.fromStreamInput(pushStream);
      const speechConfig = sdk.SpeechConfig.fromSubscription(
        this.config.azureKey!,
        this.config.azureRegion!
      );

      speechConfig.speechRecognitionLanguage = this.config.language || 'en-US';

      const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);

      recognizer.recognizeOnceAsync(
        (result) => {
          recognizer.close();

          if (result.reason === sdk.ResultReason.RecognizedSpeech) {
            resolve({
              text: result.text,
              duration: result.duration / 10000000,
              timestamp: Date.now()
            });
          } else {
            reject(new Error('Failed to recognize speech'));
          }
        },
        (error) => {
          recognizer.close();
          reject(error);
        }
      );
    });
  }

  private async transcribeWithOpenAI(audioBuffer: Buffer): Promise<TranscriptionResult> {
    const tempFilePath = path.join('/tmp', `audio_${Date.now()}.wav`);

    try {
      const wavHeader = this.createWavHeader(audioBuffer.length);
      const wavBuffer = Buffer.concat([wavHeader, audioBuffer]);

      fs.writeFileSync(tempFilePath, wavBuffer);

      const transcription = await this.openaiClient!.audio.transcriptions.create({
        file: fs.createReadStream(tempFilePath),
        model: 'whisper-1',
        language: this.config.language || 'en',
        response_format: 'verbose_json'
      });

      return {
        text: transcription.text,
        language: transcription.language,
        duration: transcription.duration,
        timestamp: Date.now()
      };
    } finally {
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
    }
  }

  private createWavHeader(dataLength: number): Buffer {
    const header = Buffer.alloc(44);

    header.write('RIFF', 0);
    header.writeUInt32LE(36 + dataLength, 4);
    header.write('WAVE', 8);
    header.write('fmt ', 12);
    header.writeUInt32LE(16, 16);
    header.writeUInt16LE(1, 20);
    header.writeUInt16LE(1, 22);
    header.writeUInt32LE(16000, 24);
    header.writeUInt32LE(32000, 28);
    header.writeUInt16LE(2, 32);
    header.writeUInt16LE(16, 34);
    header.write('data', 36);
    header.writeUInt32LE(dataLength, 40);

    return header;
  }

  async startContinuousRecognition(): Promise<void> {
    if (this.config.provider !== 'azure' || !this.azureRecognizer) {
      throw new Error('Continuous recognition only available with Azure');
    }

    await this.azureRecognizer.startContinuousRecognitionAsync();
    this.logger.info('Started continuous speech recognition');
  }

  async stopContinuousRecognition(): Promise<void> {
    if (this.config.provider !== 'azure' || !this.azureRecognizer) {
      return;
    }

    await this.azureRecognizer.stopContinuousRecognitionAsync();
    this.logger.info('Stopped continuous speech recognition');
  }

  async cleanup(): Promise<void> {
    if (this.azureRecognizer) {
      await this.azureRecognizer.close();
    }
    this.logger.info('STT service cleaned up');
  }
}