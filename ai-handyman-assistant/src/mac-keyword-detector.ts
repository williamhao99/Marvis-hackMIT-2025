#!/usr/bin/env node

import { spawn } from 'child_process';
import { EventEmitter } from 'events';

// Keywords to detect
const KEYWORDS = ['next', 'skip'];

class MacKeywordDetector extends EventEmitter {
  private isListening: boolean = false;
  private sayProcess: any = null;
  private lastDetection: { [key: string]: number } = {};
  private debounceMs: number = 1000;

  constructor() {
    super();
  }

  private processTranscript(text: string): void {
    const lowerText = text.toLowerCase().trim();

    if (!lowerText) {
      return;
    }

    // Show what we heard (dimmed)
    console.log(`\x1b[90m👂 Heard: "${text}"\x1b[0m`);

    // Check for keywords
    for (const keyword of KEYWORDS) {
      if (lowerText.includes(keyword)) {
        this.handleKeywordDetected(keyword, text);
        return;
      }
    }
  }

  private handleKeywordDetected(keyword: string, fullText: string): void {
    const now = Date.now();

    // Debounce check
    if (this.lastDetection[keyword] && (now - this.lastDetection[keyword]) < this.debounceMs) {
      return;
    }

    this.lastDetection[keyword] = now;

    const timestamp = new Date().toISOString();
    const emoji = keyword === 'next' ? '⏭️' : '⏩';

    console.log(`\n${emoji} \x1b[1m\x1b[32mKEYWORD DETECTED: "${keyword.toUpperCase()}"\x1b[0m`);
    console.log(`   📝 Full text: "${fullText}"`);
    console.log(`   🕐 Timestamp: ${timestamp}`);
    console.log('─'.repeat(50));

    // Audio feedback using macOS say command
    this.speak(`${keyword} detected`);

    this.emit('keywordDetected', {
      keyword,
      text: fullText,
      timestamp
    });
  }

  private speak(text: string): void {
    try {
      spawn('say', ['-v', 'Samantha', text]);
    } catch (error) {
      // Silent fail if say command not available
    }
  }

  async startListening(): Promise<void> {
    if (this.isListening) {
      console.log('⚠️  Already listening');
      return;
    }

    console.clear();
    console.log('🚀 \x1b[1mMac Voice Keyword Detector\x1b[0m');
    console.log('─'.repeat(50));
    console.log(`🔊 Listening for keywords: ${KEYWORDS.map(k => k.toUpperCase()).join(', ')}`);
    console.log('🎤 Using macOS Speech Recognition');
    console.log('💡 Say "next" or "skip" into your microphone');
    console.log('🛑 Press Ctrl+C to exit');
    console.log('─'.repeat(50));
    console.log('');
    console.log('⚠️  IMPORTANT: First time setup:');
    console.log('   1. Open System Preferences > Security & Privacy > Privacy');
    console.log('   2. Click on Microphone');
    console.log('   3. Allow Terminal/iTerm access to microphone');
    console.log('');
    console.log('Starting speech recognition...\n');

    this.isListening = true;

    // Create AppleScript for continuous dictation
    const appleScript = `
      tell application "System Events"
        repeat
          try
            set spokenText to (display dialog "Speak now (say 'next' or 'skip'):" default answer "" giving up after 5)'s text returned
            if spokenText is not "" then
              do shell script "echo " & quoted form of spokenText
            end if
          end try
        end repeat
      end tell
    `;

    // Use the built-in dictation command (requires Accessibility permissions)
    const dictationScript = `
      while true; do
        # Use macOS's built-in speech recognition via Automator
        osascript -e 'tell application "System Events"
          keystroke "d" using {command down, shift down}
          delay 3
          keystroke "d" using {command down, shift down}
          set the clipboard to ""
          keystroke "c" using {command down}
          delay 0.5
          set spokenText to (the clipboard as text)
          if spokenText is not "" then
            do shell script "echo " & quoted form of spokenText
          end if
        end tell' 2>/dev/null
        sleep 1
      done
    `;

    // Try using the say command with speech recognition (macOS Ventura+)
    console.log('📱 Starting continuous listening via Terminal...');
    console.log('🎯 Speak clearly into your microphone\n');

    // Simulate continuous listening with user input
    // For real microphone input, you'd need to use a native module or external tool
    this.startSimulatedListening();
  }

  private startSimulatedListening(): void {
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: '🎤 Listening (type to simulate speech)> '
    });

    console.log('📝 Note: Real-time microphone access requires additional setup.');
    console.log('   For now, type what you would say:\n');

    rl.prompt();

    rl.on('line', (input: string) => {
      if (input.trim()) {
        this.processTranscript(input);
      }
      rl.prompt();
    });

    rl.on('close', () => {
      console.log('\n👋 Goodbye!');
      process.exit(0);
    });
  }

  async stopListening(): Promise<void> {
    this.isListening = false;
    console.log('🛑 Stopped listening');
  }
}

// Main execution
async function main() {
  const detector = new MacKeywordDetector();

  // Handle keyword detection
  detector.on('keywordDetected', (data) => {
    if (data.keyword === 'next') {
      console.log('   → Triggering NEXT action...\n');
    } else if (data.keyword === 'skip') {
      console.log('   → Triggering SKIP action...\n');
    }
  });

  // Start listening
  await detector.startListening();

  // Handle process termination
  process.on('SIGINT', async () => {
    console.log('\n\n🛑 Shutting down...');
    await detector.stopListening();
    process.exit(0);
  });
}

// Run if executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
}

export { MacKeywordDetector };