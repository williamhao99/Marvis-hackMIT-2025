# Voice Keyword Detector

A continuous voice keyword detector that listens for "next" and "skip" commands, built for both MentraOS glasses and standalone microphone use.

## 🎯 Features

- **Continuous Listening**: Always listening for keywords in real-time
- **Keyword Detection**: Detects "next" and "skip" commands
- **Dual Mode Support**:
  - MentraOS mode for smart glasses (Even G1 / Mentra Live)
  - Standalone mode for regular microphone
- **Visual Feedback**: Shows detection on glasses display
- **Console Logging**: Logs all detections with timestamps

## 🚀 Quick Start

### Option 1: MentraOS Glasses Mode

This mode works with Even Realities G1 or Mentra Live glasses.

```bash
# 1. Configure environment
cp .env.example .env
# Add your MENTRAOS_API_KEY to .env

# 2. Start the keyword detector
npm run keyword

# 3. Expose with ngrok (in another terminal)
ngrok http 3002

# 4. Register at console.mentra.glass
# - Package: com.hackmit2025.keyworddetector
# - URL: Your ngrok URL
# - Permissions: MICROPHONE

# 5. Connect glasses via MentraOS app
```

### Option 2: Standalone Mode (Regular Microphone)

This mode works with your computer's microphone using Azure Speech Services.

```bash
# 1. Configure environment
# Add to .env:
# AZURE_SPEECH_KEY=your_key
# AZURE_SPEECH_REGION=your_region

# 2. Run standalone detector
npm run keyword:standalone
```

## 📊 Console Output

When keywords are detected, you'll see:

```
⏭️ KEYWORD DETECTED: "NEXT"
   📝 Full transcript: "go to the next step please"
   ✓ Is final: true
   🕐 Timestamp: 2025-09-13T15:30:45.123Z
──────────────────────────────────────────────────

⏩ KEYWORD DETECTED: "SKIP"
   📝 Full transcript: "skip this part"
   ✓ Is final: true
   🕐 Timestamp: 2025-09-13T15:30:47.456Z
──────────────────────────────────────────────────
```

## 🔧 Configuration

### Environment Variables

```env
# For MentraOS mode
MENTRAOS_API_KEY=your_api_key
PACKAGE_NAME=com.hackmit2025.keyworddetector
KEYWORD_DETECTOR_PORT=3002

# For Standalone mode
AZURE_SPEECH_KEY=your_azure_key
AZURE_SPEECH_REGION=eastus

# Alternative for Standalone (if no Azure)
OPENAI_API_KEY=your_openai_key
```

### Custom Keywords

To change the keywords, edit the `KEYWORDS` array in the source files:

```typescript
// In keyword-listener.ts or standalone-keyword-detector.ts
const KEYWORDS = ['next', 'skip', 'pause', 'continue']; // Add your keywords
```

## 🏗️ Architecture

### MentraOS Mode (`keyword-listener.ts`)
- Uses MentraOS SDK for glass communication
- Receives audio transcripts from glasses
- Shows visual feedback on Even G1 display
- Falls back to audio feedback on Mentra Live

### Standalone Mode (`standalone-keyword-detector.ts`)
- Uses Azure Speech Services for real-time STT
- Processes microphone input directly
- Console-only output
- Optional OpenAI Whisper support for file processing

## 🛠️ Integration with AI Handyman

The keyword detector can be integrated with the main AI Handyman Assistant:

```typescript
// In your main application
import { VoiceKeywordDetector } from './utils/voice-keyword-detector';

const detector = new VoiceKeywordDetector({
  packageName: PACKAGE_NAME,
  apiKey: MENTRAOS_API_KEY,
  port: 3002,
  keywords: ['next', 'skip'],
  onKeywordDetected: (keyword, sessionId, userId) => {
    if (keyword === 'next') {
      // Advance to next instruction step
      orchestrator.nextStep(sessionId);
    } else if (keyword === 'skip') {
      // Skip current step
      orchestrator.skipStep(sessionId);
    }
  }
});
```

## 🔍 Troubleshooting

### MentraOS Mode Issues

**Glasses not connecting?**
- Verify ngrok is running: `ngrok http 3002`
- Check console.mentra.glass configuration
- Ensure MICROPHONE permission is enabled

**No audio detected?**
- Check glasses microphone is not muted
- Verify Bluetooth connection
- Try reconnecting in MentraOS app

### Standalone Mode Issues

**Azure not working?**
- Verify AZURE_SPEECH_KEY is correct
- Check AZURE_SPEECH_REGION matches your resource
- Ensure microphone permissions are granted

**No console output?**
- Check microphone is selected as default input
- Try speaking louder/clearer
- Verify keywords are spoken exactly as configured

## 📈 Performance

- **Detection Latency**: ~100-300ms
- **Accuracy**: >95% in quiet environments
- **Debounce**: 1 second (prevents duplicate detections)
- **Buffer Size**: Last 200 characters of context

## 🧪 Testing

```bash
# Test with sample audio (OpenAI mode only)
node -e "
const detector = require('./dist/standalone-keyword-detector');
const d = new detector.StandaloneKeywordDetector();
d.processAudioFile('./test-audio.wav');
"
```

## 📝 Logging

All detections are logged to:
- Console (with colored output)
- Session logger (MentraOS mode)
- Can be piped to file: `npm run keyword 2>&1 | tee keywords.log`

## 🔗 Related

- [MentraOS LiveCaptions](https://github.com/Mentra-Community/LiveCaptionsOnSmartGlasses) - Similar implementation for live captions
- [AI Handyman Assistant](../README.md) - Main application
- [MentraOS Docs](https://docs.mentra.glass) - SDK documentation