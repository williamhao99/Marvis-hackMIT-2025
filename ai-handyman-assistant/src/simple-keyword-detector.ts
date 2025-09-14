#!/usr/bin/env node

import { EventEmitter } from 'events';
import * as readline from 'readline';

// Keywords to detect
const KEYWORDS = ['next', 'skip'];

class SimpleKeywordDetector extends EventEmitter {
  private rl: readline.Interface;

  constructor() {
    super();

    // Set up readline interface for console input
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: '🎤 > '
    });

    this.setupHandlers();
  }

  private setupHandlers(): void {
    this.rl.on('line', (input: string) => {
      this.processInput(input);
      this.rl.prompt();
    });

    this.rl.on('close', () => {
      console.log('\n👋 Goodbye!');
      process.exit(0);
    });
  }

  private processInput(input: string): void {
    const lowerInput = input.toLowerCase().trim();

    if (!lowerInput) {
      return;
    }

    // Check for keywords
    for (const keyword of KEYWORDS) {
      if (lowerInput.includes(keyword)) {
        this.handleKeywordDetected(keyword, input);
        return;
      }
    }

    // No keyword found
    console.log(`   📝 Heard: "${input}" (no keyword detected)`);
  }

  private handleKeywordDetected(keyword: string, fullText: string): void {
    const timestamp = new Date().toISOString();
    const emoji = keyword === 'next' ? '⏭️' : '⏩';

    console.log(`\n${emoji} \x1b[1m\x1b[32mKEYWORD DETECTED: "${keyword.toUpperCase()}"\x1b[0m`);
    console.log(`   📝 Full text: "${fullText}"`);
    console.log(`   🕐 Timestamp: ${timestamp}`);
    console.log('─'.repeat(50));

    this.emit('keywordDetected', {
      keyword,
      text: fullText,
      timestamp
    });

    // Trigger action based on keyword
    if (keyword === 'next') {
      console.log('   → Triggering NEXT action...\n');
    } else if (keyword === 'skip') {
      console.log('   → Triggering SKIP action...\n');
    }
  }

  start(): void {
    console.clear();
    console.log('🚀 \x1b[1mSimple Voice Keyword Detector\x1b[0m');
    console.log('─'.repeat(50));
    console.log(`🔊 Listening for keywords: ${KEYWORDS.map(k => k.toUpperCase()).join(', ')}`);
    console.log('💡 Type sentences containing "next" or "skip"');
    console.log('   Example: "go to the next step"');
    console.log('   Example: "skip this part"');
    console.log('🛑 Press Ctrl+C to exit');
    console.log('─'.repeat(50));
    console.log('');

    this.rl.prompt();
  }
}

// Main execution
function main() {
  const detector = new SimpleKeywordDetector();

  // Handle keyword detection events
  detector.on('keywordDetected', (data) => {
    // You can add custom actions here
    // For example, send to another service, update a database, etc.
  });

  // Start the detector
  detector.start();

  // Handle process termination
  process.on('SIGINT', () => {
    console.log('\n\n🛑 Shutting down...');
    process.exit(0);
  });
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { SimpleKeywordDetector };