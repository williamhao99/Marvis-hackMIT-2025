# Context Findings - AI Handyman Assistant

## Hardware SDK Analysis

### Mentra Live Camera Glasses
**Official Documentation:** https://docs.mentra.glass/
- **MentraOS SDK**: Cloud operating system for smart glasses
- **Language Support**: JavaScript/TypeScript (Python coming soon)
- **Camera Capabilities**: Photo capture, RTMP streaming, real-time processing
- **Key Features**: Low-latency I/O access, display/microphone/camera/speaker control
- **Licensing**: 100% open source (MIT license)
- **GitHub**: https://github.com/Mentra-Community/MentraOS
- **Integration**: Cloud-based applications with local hardware control

### Even Realities G1 Display Glasses
**GitHub Presence**: https://github.com/even-realities
- **Display**: Monochromatic HUD visible only to wearer (640x200 resolution)
- **Connectivity**: Dual BLE connections (one per lens/arm)
- **API Status**: Demo app available, SDK actively being developed
- **Community**: Growing developer ecosystem with open source projects

## Computer Vision & Object Detection

### Recommended Services for Furniture/Electronics ID
1. **Azure AI Vision**: Comprehensive object detection with furniture/electronics support
2. **Amazon Rekognition**: Strong bounding box detection for furniture/apparel/electronics
3. **Google Vision API**: Object localization with LocalizedObjectAnnotation
4. **Specialized Options**:
   - **Ximilar**: Furniture-specific recognition (real estate, interior design)
   - **Roboflow**: Pre-trained furniture detection models (8055+ images)

### Implementation Strategy
- Primary: Cloud-based APIs for accuracy and model updates
- Fallback: On-device models for offline scenarios
- Multi-service approach for best coverage (furniture vs electronics)

## Voice Processing Pipeline

### Wake Word Detection
**Recommended: Porcupine by Picovoice**
- **Custom Wake Words**: "Hey Mentra" can be trained instantly without data collection
- **Accuracy**: 97%+ detection rate, <1 false alarm per 10 hours
- **Platform Support**: Web, Android, Python, embedded devices
- **Languages**: 9+ languages (English confirmed)
- **Updated**: February 2025 (actively maintained)
- **Integration**: Direct SDK integration with always-listening capability

### Speech Processing
- **STT**: OpenAI Whisper API or Azure Speech Services
- **NLU**: GPT-4o for natural language understanding of repair context
- **TTS**: Azure Speech or OpenAI TTS for audio feedback

## Instruction Retrieval & RAG System

### OpenAI Enhanced RAG (2025)
**New Responses API with File Search**
- **PDF Processing**: GPT-4o can parse complex manuals and slide decks
- **Vector Search**: Built-in file search tool for knowledge retrieval
- **Multi-tool Orchestration**: Dynamic routing between general knowledge and specific manuals
- **Implementation**: Single API call simplifies RAG architecture

### Manual Processing Strategy
1. **Web Scraping**: Manufacturer websites for PDF manuals
2. **PDF Parsing**: GPT-4o for structure extraction and chunking
3. **Vector Storage**: OpenAI's hosted vector database or external (Pinecone, Weaviate)
4. **Retrieval**: Semantic search matching user progress to instruction steps

## Technical Architecture Recommendations

### Backend Services
- **Cloud Platform**: AWS/Azure for scalability and AI service integration
- **API Gateway**: For managing device authentication and rate limiting
- **WebRTC**: For optional livestream integration from phone app
- **Database**: Vector DB for instruction storage, traditional DB for user sessions

### Integration Points
1. **Mentra Live → Cloud**: Image capture and streaming via MentraOS SDK
2. **Cloud → Even G1**: Formatted instructions via BLE API
3. **Voice Pipeline**: Always-listening → Wake word → STT → NLU → Response
4. **Visual Pipeline**: Camera → Object detection → Manual lookup → Instruction formatting

## Performance Considerations
- **Latency**: Sub-2-second response time for voice commands
- **Bandwidth**: Efficient image compression for real-time processing
- **Battery**: Optimize for extended wear (minimize always-on processing)
- **Offline Capability**: Cache common instructions and basic object recognition

## Security & Privacy
- **Data Processing**: Cloud-based with encrypted transmission
- **User Privacy**: Optional local processing for sensitive environments
- **Authentication**: Device pairing and user session management
- **Compliance**: Consider GDPR/CCPA for user data handling