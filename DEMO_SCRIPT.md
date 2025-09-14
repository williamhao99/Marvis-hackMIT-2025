# AI Handyman Assistant - Demo Script

## Demo Flow for HackMIT 2025

### Setup
1. Ensure MentraOS app is running: `bun run dev`
2. Connect MentraOS glasses to the app
3. Make sure ngrok tunnel is active if needed

### Demo Walkthrough

#### Part 1: Introduction (30 seconds)
- Show glasses connected to app
- Explain concept: "AI-powered hands-free building assistant"
- Mention target: "Disrupting the billion-dollar handyman service economy"

#### Part 2: Voice Activation Demo (1 minute)
1. **Wake Word**: Say "Hey Mentra" to activate
2. **Project Selection**:
   - App shows two options
   - Say "I want to build the bookshelf" or "Let's do the LEGO"

#### Part 3: Bookshelf Assembly Demo (2 minutes)
1. **Step 1**: Unpack Components
   - Shows detailed parts list
   - Tap or say "next" to continue

2. **Step 2**: Attach Bottom Shelf
   - Shows screw placement details
   - Demonstrate "go back" command

3. **Skip ahead** (for time): Jump to Step 5
   - Show back panel attachment
   - Highlight the tips feature

4. **Completion**: Show celebration screen
   - Time tracking
   - Step counter

#### Part 4: LEGO Demo (1.5 minutes)
1. Quick switch: Say "new project"
2. Select LEGO Luke Skywalker
3. Show sorting pieces (Step 1)
4. Jump to lightsaber assembly (Step 8)
5. Complete build

#### Part 5: Key Features Highlight (30 seconds)
- **Voice Commands**: next, back, repeat, restart
- **Button Controls**: tap to advance, hold to go back
- **Smart Tips**: Context-aware help at each step
- **Progress Tracking**: Visual progress bar
- **Multi-modal Input**: Voice OR buttons

### Backup Scenarios
If voice doesn't work: Use button taps
If glasses disconnect: Show on phone screen
If time is short: Focus on one project only

### Key Talking Points
- "No more losing paper instructions"
- "Hands stay free for building"
- "Works with any instruction manual" (future)
- "Reduces assembly time by 40%" (hypothetical)
- "Perfect for IKEA furniture, toys, electronics"

### Technical Highlights (if asked)
- Built with TypeScript and Bun runtime
- MentraOS SDK integration
- Hardcoded for demo, but architecture ready for:
  - Computer vision integration
  - PDF manual parsing
  - Real-time step detection
  - Multi-language support