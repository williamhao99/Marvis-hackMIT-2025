# MentraOS Hello World App

A Hello World application for MentraOS that works with both Even Realities G1 glasses (with display) and Mentra Live (audio-only).

## Features

- **Display Support**: Automatically detects and uses Even Realities G1 display
- **Audio Fallback**: Works with Mentra Live using text-to-speech
- **Voice Commands**: Responds to "hello", "time", "menu", "help"
- **Button Controls**: Capture button cycles through messages
- **Head Tracking**: Detects head movement on compatible devices

## Setup

### Prerequisites

- [Bun](https://bun.sh) runtime installed
- MentraOS Developer Account at [console.mentra.glass](https://console.mentra.glass)
- ngrok for local testing

### Installation

1. Clone the repository and navigate to the project:
```bash
cd hackmit2025
```

2. Install dependencies:
```bash
bun install
```

3. Configure environment variables:
   - Copy `.env.example` to `.env` (or create `.env`)
   - Add your API key from console.mentra.glass
```bash
PACKAGE_NAME=com.hackmit2025.helloworld
MENTRAOS_API_KEY=your_actual_api_key_here
PORT=3000
```

### Running the App

1. Start the development server:
```bash
bun run dev
```

2. In a new terminal, expose with ngrok:
```bash
ngrok http 3000
```

3. Register your app at [console.mentra.glass](https://console.mentra.glass):
   - Package name: `com.hackmit2025.helloworld`
   - Public URL: Your ngrok URL (e.g., `https://abc123.ngrok.io`)
   - Permissions: Enable MICROPHONE

4. Connect using the MentraOS mobile app:
   - Open MentraOS app on your phone
   - Connect your glasses (Even Realities G1 or Mentra Live)
   - Find and launch "Hello World App"

## Voice Commands

- **"hello"** - Display/speak a greeting
- **"time"** - Show current time and date
- **"menu"** - Display available commands
- **"help"** - Get help information
- **"next"** - Cycle to next message
- **"clear"** - Clear the display (display mode only)

## Button Controls

- **Capture Button** - Cycles through different hello messages

## Project Structure

```
hackmit2025/
├── src/
│   └── index.ts        # Main application
├── package.json        # Dependencies and scripts
├── tsconfig.json       # TypeScript configuration
├── bun.lockb          # Lock file (commit this!)
├── .env               # Environment variables (don't commit!)
├── .gitignore         # Git ignore rules
└── README.md          # This file
```

## For Team Members

After cloning:
1. Run `bun install` to get dependencies
2. Create your own `.env` file with your API key
3. Each member needs their own ngrok URL for testing

## Building for Production

```bash
bun run build
bun run start
```

## Monitoring & Status Checks

### Quick Health Check
```bash
# Check local server
curl http://localhost:3000/health

# Check via ngrok (replace with your URL)
curl https://YOUR-NGROK-URL.ngrok-free.app/health

# Expected response:
# {"status":"healthy","app":"com.hackmit2025.helloworld","activeSessions":1}
```

### Key Indicators
- `activeSessions: 0` - No glasses connected
- `activeSessions: 1+` - Active connection(s) established
- Look for `INFO: Displaying Hello World for user [userId]` in logs

### Monitoring Commands
```bash
# Watch real-time logs
bun run dev 2>&1 | grep -E "(INFO|ERROR|session)"

# Check ngrok web interface for requests
open http://127.0.0.1:4040

# Check running processes
ps aux | grep -E "(bun|ngrok)"

# Kill stuck processes if needed
pkill -f "bun --watch"
pkill ngrok
```

## Troubleshooting

### App Not Starting?
- Check `.env` file has `MENTRAOS_API_KEY`
- Ensure port 3000 is free: `lsof -i :3000`
- Dependencies installed: `bun install`

### Ngrok Issues?
- Verify ngrok is authenticated: `ngrok config check`
- Check ngrok web UI: http://127.0.0.1:4040
- Ensure URL matches console.mentra.glass configuration

### Glasses Not Displaying?
- Glasses powered on and Bluetooth connected to phone
- Mentra app is open and active
- App URL correctly entered in Mentra app
- Check `activeSessions` count in `/health` endpoint
- Try disconnecting and reconnecting in Mentra app
- Check glasses battery level and firmware updates

### Connection But No Display?
- **"Cannot connect"**: Check ngrok is running and URL matches console
- **"No audio"**: Verify `await` is used with `session.audio.speak()`
- **"Permission denied"**: Enable MICROPHONE permission in console
- **Display not working**: Even Realities G1 must be connected via MentraOS app

## Documentation

- [MentraOS Docs](https://docs.mentra.glass)
- [Even Realities G1](https://www.evenrealities.com)
- [Developer Console](https://console.mentra.glass)

---

This project was created using `bun init` in bun v1.2.21. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.