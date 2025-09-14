# AI Handyman Assistant

An AI-powered hands-free assistant for device repair and furniture assembly using smart glasses and voice commands.

## Features

- **Voice Activation**: "Hey Mentra" wake word detection for hands-free operation
- **Object Detection**: Multi-service computer vision to identify furniture and electronics
- **Instruction Retrieval**: RAG-based system for finding and parsing instruction manuals
- **Visual Guidance**: Real-time display rendering on Even G1 smart glasses
- **Remote Assistance**: RTMP streaming for expert help when needed
- **Natural Language Understanding**: Context-aware voice commands and progress tracking

## Architecture

The system consists of several integrated modules:

1. **Voice Activation Module**: Porcupine-based wake word detection
2. **Speech-to-Text Service**: Azure/OpenAI Whisper for transcription
3. **Computer Vision Pipeline**: Azure AI, Google Vision, AWS Rekognition
4. **Instruction Retrieval System**: Pinecone vector DB with manual parsing
5. **Display Renderer**: Monochromatic image generation for smart glasses
6. **RTMP Streaming Module**: Live video streaming for remote assistance
7. **Application Orchestrator**: Central coordination of all services

## Prerequisites

- Node.js 18+ and npm
- Smart Glasses:
  - Mentra Live (camera input)
  - Even Realities G1 (display output)
- API Keys:
  - OpenAI API key (required)
  - Porcupine access key (required)
  - Azure Cognitive Services (optional)
  - Google Cloud Vision (optional)
  - AWS credentials (optional)
  - Pinecone API key (optional)

## Installation

1. Clone the repository:
```bash
git clone [repository-url]
cd ai-handyman-assistant
```

2. Install dependencies:
```bash
npm install
```

3. Copy environment configuration:
```bash
cp .env.example .env
```

4. Configure your `.env` file with required API keys

5. Build the project:
```bash
npm run build
```

## Configuration

Edit `.env` file with your credentials:

```env
# Required
OPENAI_API_KEY=your_openai_key
PORCUPINE_ACCESS_KEY=your_porcupine_key

# Optional but recommended
AZURE_COMPUTER_VISION_KEY=your_azure_cv_key
AZURE_COMPUTER_VISION_ENDPOINT=your_azure_endpoint
AZURE_SPEECH_KEY=your_azure_speech_key
AZURE_SPEECH_REGION=your_region

# Vector database for manuals
PINECONE_API_KEY=your_pinecone_key
PINECONE_ENVIRONMENT=your_environment
PINECONE_INDEX_NAME=handyman-instructions
```

## Usage

### Starting the Application

```bash
# Development mode
npm run dev

# Production mode
npm run build
npm start
```

### API Endpoints

The application runs on port 3000 by default:

- `GET /health` - Health check
- `POST /api/session/start` - Start a new assistance session
- `POST /api/session/end` - End current session
- `GET /api/session/current` - Get current session status
- `POST /api/image/process` - Process an image for object detection
- `POST /api/command` - Send a voice command
- `GET /api/glasses/status` - Check glasses connection status
- `POST /api/assistance/request` - Request remote assistance

### Voice Commands

After wake word activation:
- "What am I looking at?" - Identify object
- "Next step" - Show next instruction
- "Previous step" - Go back one step
- "I've attached the screws" - Report progress
- "Help me" - Request remote assistance

### RTMP Streaming

The RTMP server runs on port 1935:
- Stream URL: `rtmp://localhost:1935/live/{stream-key}`
- HLS playback: `http://localhost:8000/live/{stream-key}/index.m3u8`

### WebSocket Events

Connect to WebSocket on port 8001 for real-time updates:
- `streamStarted` - New stream began
- `streamEnded` - Stream stopped
- `overlayUpdate` - Display overlay changed
- `assistanceRequest` - Help requested

## Development

### Running Tests

```bash
npm test
```

### Linting

```bash
npm run lint
```

### Type Checking

```bash
npm run typecheck
```

## Docker Deployment

```bash
# Build image
docker build -t ai-handyman-assistant .

# Run container
docker run -p 3000:3000 -p 1935:1935 -p 8000:8000 --env-file .env ai-handyman-assistant
```

## Project Structure

```
ai-handyman-assistant/
├── src/
│   ├── core/               # Core modules
│   │   ├── orchestrator.ts # Main application coordinator
│   │   └── voice-activation.ts
│   ├── services/           # Service integrations
│   │   ├── computer-vision.ts
│   │   ├── instruction-retrieval.ts
│   │   ├── speech-to-text.ts
│   │   └── nlu-service.ts
│   ├── modules/            # Feature modules
│   │   ├── display-renderer.ts
│   │   ├── rtmp-streaming.ts
│   │   └── glasses-connector.ts
│   ├── api/                # REST API
│   │   └── server.ts
│   ├── config/             # Configuration
│   │   └── config.ts
│   ├── utils/              # Utilities
│   │   └── logger.ts
│   └── index.ts            # Entry point
├── package.json
├── tsconfig.json
└── .env.example
```

## Troubleshooting

### Wake Word Not Detected
- Check microphone permissions
- Verify Porcupine access key
- Adjust sensitivity in config

### Glasses Not Connecting
- Ensure Bluetooth is enabled
- Check device pairing
- Verify SDK keys

### Object Detection Failing
- Confirm at least one vision API is configured
- Check network connectivity
- Ensure good lighting conditions

### No Instructions Found
- Verify Pinecone database is configured
- Check manual scraping permissions
- Fallback to generic instructions

## License

MIT

## Support

For issues and questions, please open a GitHub issue or contact support.