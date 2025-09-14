# AI Hands-Free Handyman Assistant - Requirements Specification

## Problem Statement
Users struggle with device repair and furniture assembly due to:
- Complex instruction manuals that are hard to follow while working
- Need for hands-free guidance during assembly/repair tasks
- Difficulty identifying exact models and finding correct instructions
- Lack of real-time contextual help when stuck on specific steps

## Solution Overview
A voice-activated AI system that uses smart glasses to:
1. Identify devices/furniture through camera vision
2. Retrieve and parse relevant instruction manuals
3. Provide step-by-step guidance via display and voice
4. Offer real-time visual overlays and remote assistance
5. Understand user progress and provide contextual next steps

## Functional Requirements

### FR1: Voice Activation System
- **FR1.1**: Always-listening wake word detection for "Hey Mentra"
- **FR1.2**: Natural language voice command processing in English
- **FR1.3**: Continuous conversation flow for multi-step instructions
- **FR1.4**: Process progress updates like "I've put the 4 screws into the bottom of the chair"
- **FR1.5**: Sub-100ms wake word response time using on-device processing

### FR2: Device Identification Pipeline  
- **FR2.1**: Real-time object detection for furniture and electronics
- **FR2.2**: Multi-service computer vision approach (Azure AI, Amazon Rekognition, Google Vision)
- **FR2.3**: Handle partial views and different angles of objects
- **FR2.4**: Fallback to general category identification when exact match unavailable
- **FR2.5**: Focus on IKEA-style furniture, appliances, and consumer electronics

### FR3: Instruction Retrieval System
- **FR3.1**: Custom RAG pipeline with manual-specific parsing logic
- **FR3.2**: Real-time cloud retrieval of instruction manuals
- **FR3.3**: Web scraping for manufacturer PDF manuals
- **FR3.4**: Format-aware parsing handling different manual structures
- **FR3.5**: AI-powered contextual step matching based on user progress

### FR4: Display Integration
- **FR4.1**: Render instructions as direct images on Even G1's 640x200 monochromatic display
- **FR4.2**: Progressive disclosure showing current step + next step preview
- **FR4.3**: Minimalist UI design that doesn't obstruct user's view
- **FR4.4**: Clear, concise text overlays optimized for small display
- **FR4.5**: Real-time visual overlays with directional arrows and highlighted regions

### FR5: Remote Assistance Integration
- **FR5.1**: RTMP streaming from Mentra Live to phone app
- **FR5.2**: Real-time video sharing for remote supervision
- **FR5.3**: Overlay instruction graphics on livestream
- **FR5.4**: Support for complex repair scenarios requiring expert help

### FR6: Audio Feedback System
- **FR6.1**: Text-to-speech for instruction readout
- **FR6.2**: Synchronization between visual display and audio
- **FR6.3**: User toggle between visual-only and audio+visual modes
- **FR6.4**: English language voice processing only

## Technical Requirements

### TR1: Hardware Integration
- **TR1.1**: MentraOS SDK integration for Mentra Live camera glasses
- **TR1.2**: Even Realities G1 SDK integration for display rendering
- **TR1.3**: Dual BLE connection management for G1 glasses
- **TR1.4**: Camera access via MentraOS for image capture and RTMP streaming

### TR2: Voice Processing Architecture
- **TR2.1**: Porcupine SDK implementation for on-device wake word detection
- **TR2.2**: Custom "Hey Mentra" wake word training
- **TR2.3**: OpenAI Whisper or Azure Speech Services for STT
- **TR2.4**: GPT-4o for natural language understanding
- **TR2.5**: Azure Speech or OpenAI TTS for audio output

### TR3: Computer Vision Pipeline
- **TR3.1**: Cloud-based object detection APIs (Azure AI Vision primary)
- **TR3.2**: Specialized furniture recognition (Ximilar, Roboflow models)
- **TR3.3**: Multi-service fallback system for maximum coverage
- **TR3.4**: Image preprocessing and optimization for API calls

### TR4: RAG System Architecture
- **TR4.1**: Custom PDF parsing with format-specific handlers
- **TR4.2**: Vector database for instruction storage (Pinecone/Weaviate)
- **TR4.3**: Semantic search for step matching
- **TR4.4**: Manual chunking and preprocessing pipeline
- **TR4.5**: Real-time instruction retrieval and processing

### TR5: Display Rendering System
- **TR5.1**: Image generation for 640x200 monochromatic display
- **TR5.2**: Text rendering with optimal font sizing and contrast
- **TR5.3**: Simple graphic overlays (arrows, highlighted regions)
- **TR5.4**: Progressive disclosure UI patterns
- **TR5.5**: Real-time image updates based on user progress

### TR6: Cloud Infrastructure
- **TR6.1**: Scalable backend services (AWS/Azure)
- **TR6.2**: API Gateway for device authentication and rate limiting
- **TR6.3**: WebRTC implementation for livestream functionality
- **TR6.4**: Vector database hosting and management
- **TR6.5**: Session management and user state tracking

## Implementation Hints and Patterns

### Development Approach
1. **Phase 1**: Core voice activation and device identification
2. **Phase 2**: Basic instruction retrieval and display rendering
3. **Phase 3**: Advanced visual overlays and context awareness
4. **Phase 4**: Remote assistance and RTMP streaming integration

### Key Integration Points
- **MentraOS → Cloud**: Image capture and streaming via JavaScript/TypeScript SDK
- **Cloud → Even G1**: BLE communication for display updates
- **Voice Pipeline**: Always-listening → Porcupine → STT → NLU → Response
- **Visual Pipeline**: Camera → Object detection → Manual lookup → Image rendering

### Data Flow Architecture
```
[Mentra Live Camera] → [Object Detection] → [Manual Identification]
                                              ↓
[Even G1 Display] ← [Image Rendering] ← [Instruction Retrieval]
                                              ↓
[Voice Input] → [Wake Word] → [STT] → [Context Processing]
```

## Acceptance Criteria

### AC1: Voice Interaction
- User can activate system with "Hey Mentra" wake word
- System responds within 2 seconds of voice command
- Natural language queries are understood and processed correctly
- User can report progress and receive contextual next steps

### AC2: Visual Guidance
- Objects are identified with >90% accuracy for common furniture/electronics
- Instructions are displayed clearly on Even G1 screen
- Visual overlays provide helpful directional guidance
- Progressive disclosure keeps user focused on current step

### AC3: Remote Assistance
- RTMP stream provides clear video quality for remote viewing
- Remote assistant can see user's perspective in real-time
- Overlay graphics are visible on streamed video
- Low latency communication for effective collaboration

### AC4: System Performance
- Sub-100ms wake word detection response time
- <2 second end-to-end response for voice queries
- Reliable object detection in various lighting conditions
- Consistent display rendering and updates

## Assumptions
- Users have stable internet connection during repair sessions
- Instruction manuals are available in digital format from manufacturers
- Users work primarily with mainstream furniture and electronics brands
- English-only implementation sufficient for initial deployment
- Battery life of smart glasses supports 2+ hour repair sessions

## Dependencies
- MentraOS SDK access and documentation
- Even Realities G1 SDK and BLE specifications
- Cloud service provider accounts (Azure/AWS)
- Computer vision API subscriptions
- Vector database hosting service

---

**Document Version**: 1.0
**Date**: 2025-09-13
**Status**: Complete
**Next Steps**: Technical design and architecture planning