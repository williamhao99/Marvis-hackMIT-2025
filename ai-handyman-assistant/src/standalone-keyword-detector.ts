#!/usr/bin/env node

import * as sdk from 'microsoft-cognitiveservices-speech-sdk';
import OpenAI from 'openai';
import { EventEmitter } from 'events';
import dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

// Configuration
const KEYWORDS = ['next', 'skip'];
const USE_AZURE = !!process.env.AZURE_SPEECH_KEY;

interface TranscriptionResult {
  text: string;
  isFinal: boolean;
  timestamp: Date;
}

class StandaloneKeywordDetector extends EventEmitter {
  private isListening: boolean = false;
  private azureRecognizer?: sdk.SpeechRecognizer;
  private openaiClient?: OpenAI;
  private keywordBuffer: string = '';
  private lastDetection: { [key: string]: number } = {};
  private debounceMs: number = 1000; // Prevent duplicate detections within 1 second

  constructor() {
    super();
    this.initialize();
  }

  private initialize(): void {
    if (USE_AZURE && process.env.AZURE_SPEECH_KEY && process.env.AZURE_SPEECH_REGION) {
      this.initializeAzure();
    } else if (process.env.OPENAI_API_KEY) {
      this.initializeOpenAI();
    } else {
      console.error('❌ Either Azure Speech or OpenAI credentials required');
      process.exit(1);
    }
  }

  private initializeAzure(): void {
    const speechConfig = sdk.SpeechConfig.fromSubscription(
      process.env.AZURE_SPEECH_KEY!,
      process.env.AZURE_SPEECH_REGION!
    );

    speechConfig.speechRecognitionLanguage = 'en-US';

    const audioConfig = sdk.AudioConfig.fromDefaultMicrophoneInput();
    this.azureRecognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);

    // Handle interim results
    this.azureRecognizer.recognizing = (s, e) => {
      if (e.result.text) {
        this.processTranscript({
          text: e.result.text,
          isFinal: false,
          timestamp: new Date()
        });
      }
    };

    // Handle final results
    this.azureRecognizer.recognized = (s, e) => {
      if (e.result.reason === sdk.ResultReason.RecognizedSpeech && e.result.text) {
        this.processTranscript({
          text: e.result.text,
          isFinal: true,
          timestamp: new Date()
        });
      }
    };

    this.azureRecognizer.canceled = (s, e) => {
      console.error('❌ Azure STT canceled:', e.errorDetails);
      this.emit('error', new Error(e.errorDetails));
    };

    console.log('✅ Azure Speech Services initialized');
  }

  private initializeOpenAI(): void {
    this.openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    console.log('✅ OpenAI Whisper initialized (requires manual audio recording)');
    console.log('⚠️  Note: OpenAI mode requires audio file input. Use Azure for real-time.');
  }

  private processTranscript(result: TranscriptionResult): void {
    const lowerText = result.text.toLowerCase();

    // Add to buffer for context
    this.keywordBuffer = (this.keywordBuffer + ' ' + lowerText).slice(-200);

    // Check for keywords
    for (const keyword of KEYWORDS) {
      if (lowerText.includes(keyword)) {
        this.handleKeywordDetected(keyword, result.text, result.isFinal);
      }
    }

    // Show transcript in dim text if not a keyword
    if (!KEYWORDS.some(k => lowerText.includes(k))) {
      process.stdout.write(`\r\x1b[90m${result.isFinal ? '📝' : '👂'} ${result.text}\x1b[0m`);
      if (result.isFinal) {
        process.stdout.write('\n');
      }
    }
  }

  private handleKeywordDetected(keyword: string, fullTranscript: string, isFinal: boolean): void {
    const now = Date.now();

    // Debounce check
    if (this.lastDetection[keyword] && (now - this.lastDetection[keyword]) < this.debounceMs) {
      return;
    }

    if (isFinal) {
      this.lastDetection[keyword] = now;
    }

    const timestamp = new Date().toISOString();
    const emoji = keyword === 'next' ? '⏭️' : '⏩';

    // Clear the line and show keyword detection
    process.stdout.write('\r' + ' '.repeat(80) + '\r');

    console.log(`\n${emoji} \x1b[1m\x1b[32mKEYWORD DETECTED: "${keyword.toUpperCase()}"\x1b[0m`);
    console.log(`   📝 Full transcript: "${fullTranscript}"`);
    console.log(`   ✓ Is final: ${isFinal}`);
    console.log(`   🕐 Timestamp: ${timestamp}`);
    console.log('─'.repeat(50));

    this.emit('keywordDetected', {
      keyword,
      transcript: fullTranscript,
      isFinal,
      timestamp
    });
  }

  async startListening(): Promise<void> {
    if (this.isListening) {
      console.log('⚠️  Already listening');
      return;
    }

    if (this.azureRecognizer) {
      await this.azureRecognizer.startContinuousRecognitionAsync();
      this.isListening = true;
      console.log('🎙️  Started continuous speech recognition');
      console.log(`🔊 Listening for keywords: ${KEYWORDS.map(k => k.toUpperCase()).join(', ')}`);
      console.log('─'.repeat(50));
    } else {
      console.log('⚠️  OpenAI mode requires manual audio file processing');
      console.log('Use Azure Speech Services for real-time detection');
    }
  }

  async stopListening(): Promise<void> {
    if (!this.isListening) return;

    if (this.azureRecognizer) {
      await this.azureRecognizer.stopContinuousRecognitionAsync();
    }

    this.isListening = false;
    console.log('🛑 Stopped listening');
  }

  async processAudioFile(filePath: string): Promise<void> {
    if (!this.openaiClient) {
      console.error('❌ OpenAI client not initialized');
      return;
    }

    try {
      console.log(`📁 Processing audio file: ${filePath}`);

      const transcription = await this.openaiClient.audio.transcriptions.create({
        file: fs.createReadStream(filePath),
        model: 'whisper-1',
        language: 'en'
      });

      this.processTranscript({
        text: transcription.text,
        isFinal: true,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('❌ Failed to process audio file:', error);
    }
  }
}

// Main execution
async function main() {
  console.clear();
  console.log('🚀 \x1b[1mStandalone Voice Keyword Detector\x1b[0m');
  console.log('─'.repeat(50));

  const detector = new StandaloneKeywordDetector();

  // Handle keyword detection
  detector.on('keywordDetected', (data) => {
    // You can add custom actions here
    if (data.keyword === 'next') {
      // Trigger next action
      console.log('   → Triggering NEXT action...');
    } else if (data.keyword === 'skip') {
      // Trigger skip action
      console.log('   → Triggering SKIP action...');
    }
  });

  // Handle errors
  detector.on('error', (error) => {
    console.error('❌ Error:', error);
  });

  // Start listening
  await detector.startListening();

  // Handle process termination
  process.on('SIGINT', async () => {
    console.log('\n\n🛑 Shutting down...');
    await detector.stopListening();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await detector.stopListening();
    process.exit(0);
  });

  // Keep process alive
  setInterval(() => {
    // Health check
  }, 60000);
}

// Run if executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
}

export { StandaloneKeywordDetector };