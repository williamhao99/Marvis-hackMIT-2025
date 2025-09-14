# AI Hands-Free Handyman Assistant - Initial Request

## Project Overview
Build a voice-activated AI system that helps users with device repair and assembly by identifying objects through camera glasses (Mentra Live), providing instructions through display glasses (Even Realities G1), and offering optional visual overlays for guidance.

## Core Requirements

### 1. Voice Activation System
- Implement always-listening wake word detection for "Hey Mentra"
- Set up speech-to-text API integration for follow-up questions
- Handle continuous conversation flow for multi-step instructions
- Process natural language queries like "What do I do next? I've put the 4 screws into the bottom of the chair"

### 2. Device Identification Pipeline
- Integrate with Mentra Live camera glasses API for image capture
- Implement object detection/recognition system to identify devices/products
- Use reverse image search or product database matching to find exact model
- Handle partial views and different angles of objects
- Fallback to general category identification if exact match not found

### 3. Instruction Retrieval System
- Build web scraper for manufacturer instruction manuals (PDFs, websites)
- Create database of common device manuals and instructions
- Implement RAG (Retrieval Augmented Generation) system to extract relevant steps
- Parse and structure instructions into step-by-step format
- Match user's current progress to appropriate instruction step

### 4. Display Integration (Even Realities G1)
- Format instructions for 640x200 pixel display constraint
- Create clear, concise text overlays
- Implement progressive disclosure (show current step + next step preview)
- Design minimalist UI that doesn't obstruct user's view

### 5. Optional Audio Feedback
- Implement text-to-speech for instruction readout
- Synchronize audio with visual display
- Allow user to toggle between visual-only and audio+visual modes

## Advanced Features (Jarvis Mode)

### Visual Overlay System
- Create simple 2D overlays for spatial guidance (640x200 resolution)
- Implement arrow indicators for screw holes, connection points, etc.
- Build basic rendering system for:
  - Directional arrows
  - Highlighted regions
  - Part placement indicators
  - Assembly sequence visualization

### Livestream Integration
- Set up phone app for livestream viewing
- Implement WebRTC or similar for low-latency streaming
- Overlay instruction graphics on livestream
- Handle "visual guide not available" gracefully

## Technical Architecture

### Backend Services

**Request Date:** 2025-09-13
**Status:** Initial Requirements Gathering