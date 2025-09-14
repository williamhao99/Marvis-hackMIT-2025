#!/usr/bin/env node

import { VoiceKeywordDetector } from './utils/voice-keyword-detector';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Configuration
const PACKAGE_NAME = process.env.PACKAGE_NAME || 'com.hackmit2025.keyworddetector';
const MENTRAOS_API_KEY = process.env.MENTRAOS_API_KEY;
const PORT = parseInt(process.env.KEYWORD_DETECTOR_PORT || '3002', 10);

// Keywords to detect
const KEYWORDS = ['next', 'skip'];

if (!MENTRAOS_API_KEY) {
  console.error('❌ MENTRAOS_API_KEY is required. Please set it in your .env file');
  process.exit(1);
}

console.log('🚀 Starting Voice Keyword Detector...');
console.log(`📦 Package: ${PACKAGE_NAME}`);
console.log(`🔊 Listening for keywords: ${KEYWORDS.join(', ')}`);
console.log(`🌐 Port: ${PORT}`);
console.log('');

// Create and start the detector
const detector = new VoiceKeywordDetector({
  packageName: PACKAGE_NAME,
  apiKey: MENTRAOS_API_KEY,
  port: PORT,
  keywords: KEYWORDS,
  onKeywordDetected: (keyword, sessionId, userId) => {
    // Custom handler - you can add additional logic here

    // Log with emoji for clarity
    const emoji = keyword === 'next' ? '⏭️' : '⏩';
    console.log(`${emoji} Action: ${keyword.toUpperCase()} command received`);

    // You could trigger other actions here, like:
    // - Advance to next step in instructions
    // - Skip current content
    // - Send to another service
    // - Update a database
    // - Emit an event
  }
});

// Start the server
detector.start()
  .then(() => {
    console.log('✅ Voice Keyword Detector is running!');
    console.log('');
    console.log('To connect your glasses:');
    console.log('1. Run: ngrok http ' + PORT);
    console.log('2. Register at console.mentra.glass with your ngrok URL');
    console.log('3. Connect via MentraOS mobile app');
    console.log('');
    console.log('📊 Monitoring keywords in real-time...');
    console.log('─'.repeat(50));
  })
  .catch((error) => {
    console.error('❌ Failed to start detector:', error);
    process.exit(1);
  });

// Health check endpoint
setInterval(() => {
  const sessionCount = detector.getActiveSessionCount();
  if (sessionCount > 0) {
    console.log(`💚 Health: ${sessionCount} active session(s)`);
  }
}, 30000); // Every 30 seconds

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');

  // Notify all sessions
  await detector.broadcast('Keyword detector shutting down');

  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  await detector.broadcast('Keyword detector shutting down');
  process.exit(0);
});

// Handle errors
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled rejection:', reason);
  process.exit(1);
});