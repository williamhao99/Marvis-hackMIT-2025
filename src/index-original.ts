import { AppServer, AppSession, TranscriptionData, ViewType } from "@mentra/sdk"
import axios from "axios"

const PACKAGE_NAME = process.env.PACKAGE_NAME || "com.hackmit2025.helloworld"
const MENTRAOS_API_KEY = process.env.MENTRAOS_API_KEY
const CEREBRAS_API_KEY = process.env.CEREBRAS_API_KEY
const EXA_API_KEY = process.env.EXA_API_KEY
const PORT = parseInt(process.env.PORT || "3000")

// Hardcoded barcode for now
const HARDCODED_BARCODE = "673419406871"

if (!MENTRAOS_API_KEY) {
  console.error("MENTRAOS_API_KEY environment variable is required")
  console.error("Please set it in your .env file")
  process.exit(1)
}

if (!CEREBRAS_API_KEY) {
  console.warn("CEREBRAS_API_KEY not found - voice command processing will be limited")
}

if (!EXA_API_KEY) {
  console.warn("EXA_API_KEY not found - search functionality will be disabled")
}

interface InstructionStep {
  id: number
  title: string
  description: string
  details?: string[]
  tips?: string
  diagram?: string[]
}

interface Project {
  id: string
  name: string
  totalSteps: number
  steps: InstructionStep[]
}

const PROJECTS: Record<string, Project> = {
  bookshelf: {
    id: "bookshelf",
    name: "Room Essentials 3-Shelf Bookcase",
    totalSteps: 6,
    steps: [
      {
        id: 1,
        title: "Unpack Components",
        description: "Remove all parts from the box and lay them flat",
        details: [
          "• 2 side panels (A)",
          "• 3 shelves (B)",
          "• 1 back panel (C)",
          "• Hardware bag with screws"
        ],
        tips: "Check against the parts list to ensure nothing is missing"
      },
      {
        id: 2,
        title: "Attach Bottom Shelf",
        description: "Connect the bottom shelf to both side panels",
        details: [
          "• Place side panels parallel, 24 inches apart",
          "• Insert bottom shelf between panels",
          "• Use 4 screws (type A) to secure",
          "• Tighten with included Allen key"
        ],
        tips: "Don't fully tighten screws until all are in place"
      },
      {
        id: 3,
        title: "Install Middle Shelf",
        description: "Position and secure the middle shelf",
        details: [
          "• Measure 16 inches from bottom shelf",
          "• Align middle shelf with pre-drilled holes",
          "• Insert 4 screws (type A)",
          "• Ensure shelf is level before tightening"
        ],
        tips: "Use a level or phone app to check alignment"
      },
      {
        id: 4,
        title: "Add Top Shelf",
        description: "Complete the frame with the top shelf",
        details: [
          "• Position top shelf at the top of side panels",
          "• Align with top mounting holes",
          "• Secure with 4 screws (type A)",
          "• Tighten all screws firmly"
        ],
        tips: "Have someone hold the shelf while you screw"
      },
      {
        id: 5,
        title: "Attach Back Panel",
        description: "Secure the backing for stability",
        details: [
          "• Lay bookshelf face down on soft surface",
          "• Position back panel over frame",
          "• Use 12 small nails provided",
          "• Hammer nails around all edges"
        ],
        tips: "Start with corners, then fill in sides"
      },
      {
        id: 6,
        title: "Final Setup",
        description: "Stand upright and secure to wall",
        details: [
          "• Carefully lift bookshelf upright",
          "• Position against wall",
          "• Use wall anchor kit (included)",
          "• Attach anti-tip strap to wall stud"
        ],
        tips: "Wall anchoring is essential for safety"
      }
    ]
  },
  lego: {
    id: "lego",
    name: "Luke Skywalker LEGO Mini Set",
    totalSteps: 8,
    steps: [
      {
        id: 1,
        title: "Sort Your Pieces",
        description: "Organize all LEGO pieces by color and size",
        details: [
          "• Tan pieces: 4 (torso, legs)",
          "• Brown pieces: 3 (hair, belt)",
          "• Black pieces: 2 (boots)",
          "• Light gray: 1 (lightsaber hilt)",
          "• Green transparent: 1 (blade)"
        ],
        tips: "Use the instruction sheet to verify all pieces"
      },
      {
        id: 2,
        title: "Build the Legs",
        description: "Start with Luke's lower body",
        details: [
          "• Take tan leg piece",
          "• Attach black boot pieces to bottom",
          "• Add brown belt detail piece",
          "• Set aside completed legs"
        ],
        tips: "Press firmly but don't force pieces"
      },
      {
        id: 3,
        title: "Construct the Torso",
        description: "Build Luke's upper body",
        details: [
          "• Take tan torso piece",
          "• Check front has Jedi robe printing",
          "• Ensure arm sockets are clear",
          "• Do not attach arms yet"
        ],
        tips: "The printing should face forward"
      },
      {
        id: 4,
        title: "Attach Arms",
        description: "Add arms to the torso",
        details: [
          "• Take two tan arm pieces",
          "• Insert left arm (clicks into place)",
          "• Insert right arm (clicks into place)",
          "• Test rotation - arms should move freely"
        ],
        tips: "Arms are identical - either works on either side"
      },
      {
        id: 5,
        title: "Connect Body Parts",
        description: "Join torso to legs",
        details: [
          "• Take completed leg assembly",
          "• Take completed torso with arms",
          "• Press torso onto leg connector peg",
          "• Should click and rotate at waist"
        ],
        tips: "Align the peg carefully before pressing"
      },
      {
        id: 6,
        title: "Add the Head",
        description: "Attach Luke's head piece",
        details: [
          "• Take flesh-colored head piece",
          "• Check face printing orientation",
          "• Press onto neck peg on torso",
          "• Head should rotate freely"
        ],
        tips: "Gentle pressure - the head is delicate"
      },
      {
        id: 7,
        title: "Place the Hair",
        description: "Complete Luke's appearance",
        details: [
          "• Take brown hair piece",
          "• Align with head top stud",
          "• Press down gently until secure",
          "• Hair should not wobble"
        ],
        tips: "The hair piece only fits one way"
      },
      {
        id: 8,
        title: "Add Lightsaber",
        description: "Give Luke his iconic weapon",
        details: [
          "• Take gray lightsaber hilt",
          "• Insert green blade into hilt",
          "• Place complete saber in right hand",
          "• Close hand around hilt"
        ],
        tips: "The blade can be removed for 'deactivated' look"
      }
    ]
  }
}

type AppState = 'welcome' | 'selecting' | 'building' | 'completed'


// Cerebras API integration - Step 1: Identify product from barcode
async function identifyProductFromBarcode(barcode: string): Promise<string | null> {
  if (!CEREBRAS_API_KEY) {
    console.warn("Cerebras API key not available")
    return null
  }

  try {
    const prompt = `Given the barcode/UPC "${barcode}", create a search query to identify what product this barcode represents. Focus on finding the product name, brand, and model.

Barcode: ${barcode}

Generate only a search query to identify this product, nothing else:`

    const response = await axios.post('https://api.cerebras.ai/v1/chat/completions', {
      model: "llama3.1-8b",
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 50,
      temperature: 0.2
    }, {
      headers: {
        'Authorization': `Bearer ${CEREBRAS_API_KEY}`,
        'Content-Type': 'application/json'
      }
    })

    return response.data.choices[0]?.message?.content?.trim() || null
  } catch (error) {
    return null
  }
}

// Cerebras API integration - Step 2: Generate instruction search query
async function generateInstructionQuery(voiceCommand: string, productTitle: string): Promise<string | null> {
  if (!CEREBRAS_API_KEY) {
    console.warn("Cerebras API key not available")
    return null
  }

  try {
    const prompt = `Given the voice command "${voiceCommand}" and the product "${productTitle}", create a search query for the Exa search API to find PDF manuals, instructions, or assembly guides for this specific product.

Voice command: ${voiceCommand}
Product: ${productTitle}

Generate only the search query text, nothing else:`

    const response = await axios.post('https://api.cerebras.ai/v1/chat/completions', {
      model: "llama3.1-8b",
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 100,
      temperature: 0.3
    }, {
      headers: {
        'Authorization': `Bearer ${CEREBRAS_API_KEY}`,
        'Content-Type': 'application/json'
      }
    })

    return response.data.choices[0]?.message?.content?.trim() || null
  } catch (error) {
    return null
  }
}

// Exa search integration
async function searchWithExa(query: string): Promise<any> {
  if (!EXA_API_KEY) {
    console.warn("Exa API key not available")
    return null
  }

  try {
    const response = await axios.post('https://api.exa.ai/search', {
      query: query,
      type: "neural",
      useAutoprompt: true,
      numResults: 3,
      contents: {
        text: true,
        highlights: true
      }
    }, {
      headers: {
        'x-api-key': EXA_API_KEY,
        'Content-Type': 'application/json'
      }
    })

    return response.data
  } catch (error) {
    return null
  }
}

// Process voice command with AI (silent - runs in background)
async function processVoiceCommandWithAI(voiceCommand: string, barcode: string): Promise<void> {
  // Step 1: Identify product from barcode
  const productQuery = await identifyProductFromBarcode(barcode)
  if (!productQuery) return

  // Step 2: Generate instruction search query
  const instructionQuery = await generateInstructionQuery(voiceCommand, productQuery)
  if (!instructionQuery) return

  // Step 3: Search with Exa
  const searchResults = await searchWithExa(instructionQuery)
  // Process results silently - could store or use them later
}

class HandymanVoiceAssistant extends AppServer {
  private sessions: Map<string, {
    state: AppState
    currentProject?: Project
    currentStep: number
    startTime: number
  }> = new Map()

  // Track active transcription cleanups
  private transcriptionCleanups = new Map<string, () => void>()

  protected async onSession(
    session: AppSession,
    sessionId: string,
    userId: string
  ): Promise<void> {
    console.log(`
=======================================
🎉 NEW SESSION CONNECTED!
Session ID: ${sessionId}
User ID: ${userId}
Time: ${new Date().toISOString()}
=======================================
    `)
    session.logger.info(`New session started for user ${userId}`)

    // Initialize session state
    this.sessions.set(sessionId, {
      state: 'welcome',
      currentStep: 0,
      startTime: Date.now()
    })


    // Set up transcription for voice commands
    await this.setupVoiceTranscription(session, sessionId, userId)

    // Show welcome screen
    this.showWelcomeScreen(session)
  }

  protected async onStop(sessionId: string, userId: string, reason: string): Promise<void> {
    // Session stopped

    // Clean up session resources
    this.sessions.delete(sessionId)

    // Clean up transcription handlers
    const cleanup = this.transcriptionCleanups.get(sessionId)
    if (cleanup) {
      cleanup()
      this.transcriptionCleanups.delete(sessionId)
    }
  }

  private async setupVoiceTranscription(
    session: AppSession,
    sessionId: string,
    userId: string
  ): Promise<void> {
    try {
      // Set up transcription handler for English
      const transcriptionHandler = (data: TranscriptionData) => {
        this.handleVoiceTranscription(session, sessionId, userId, data)
      }

      const cleanup = session.onTranscriptionForLanguage('en-US', transcriptionHandler)
      this.transcriptionCleanups.set(sessionId, cleanup)

      // Voice transcription set up
    } catch (error) {
      // Error setting up voice transcription
    }
  }

  private handleVoiceTranscription(
    session: AppSession,
    sessionId: string,
    userId: string,
    transcriptionData: TranscriptionData
  ): void {
    const state = this.sessions.get(sessionId)
    if (!state) return

    // Only process final transcriptions for commands
    if (!transcriptionData.isFinal) return

    const command = transcriptionData.text?.toLowerCase().trim()
    if (!command) return

    // Process with AI silently in background
    processVoiceCommandWithAI(command, HARDCODED_BARCODE).catch(() => {})

    // Process the voice command
    this.processVoiceCommand(session, sessionId, command)
  }


  private processVoiceCommand(session: AppSession, sessionId: string, command: string): void {
    const state = this.sessions.get(sessionId)
    if (!state) return

    // Welcome screen - any "continue" or "start" word advances
    if (state.state === 'welcome') {
      if (command.includes('continue') || command.includes('start') || command.includes('begin') ||
          command.includes('next') || command.includes('go') || command.includes('yes')) {
        state.state = 'selecting'
        this.showProjectSelection(session)
        this.sessions.set(sessionId, state)
        return
      }
    }

    // Project selection by voice
    if (state.state === 'selecting') {
      if (command.includes('book') || command.includes('shelf') || command.includes('case') ||
          command.includes('1') || command.includes('one') || command.includes('first')) {
        this.handleProjectSelection(session, sessionId, 'bookshelf')
        return
      } else if (command.includes('lego') || command.includes('luke') || command.includes('star') ||
                 command.includes('2') || command.includes('two') || command.includes('second')) {
        this.handleProjectSelection(session, sessionId, 'lego')
        return
      }
    }

    // Navigation commands during building
    if (state.state === 'building' && state.currentProject) {
      // Next step
      if (command.includes('next') || command.includes('continue') || command.includes('forward') ||
          command.includes('advance') || command.includes('go on') || command.includes('proceed')) {
        this.handleNextStep(session, sessionId)
        return
      }
      // Previous step
      else if (command.includes('back') || command.includes('previous') || command.includes('last') ||
               command.includes('undo') || command.includes('reverse')) {
        this.handlePreviousStep(session, sessionId)
        return
      }
      // Repeat current step
      else if (command.includes('repeat') || command.includes('again') || command.includes('what') ||
               command.includes('say that') || command.includes('read')) {
        this.showInstructionStep(session, state.currentProject, state.currentStep)
        return
      }
      // Restart project
      else if (command.includes('start over') || command.includes('restart') || command.includes('beginning') ||
               command.includes('reset') || command.includes('first step')) {
        state.currentStep = 0
        this.showInstructionStep(session, state.currentProject, state.currentStep)
        this.sessions.set(sessionId, state)
        return
      }
    }

    // Completed state - new project
    if (state.state === 'completed') {
      if (command.includes('new') || command.includes('another') || command.includes('different') ||
          command.includes('next') || command.includes('continue') || command.includes('start')) {
        this.handleNewProject(session, sessionId)
        return
      }
    }
  }

  private showWelcomeScreen(session: AppSession): void {
    session.layouts.showTextWall([
      "🔧 AI HANDYMAN",
      "Your building companion",
      "",
      "",
      "Say 'continue' to begin"
    ].join("\n"), {
      view: ViewType.MAIN,
      durationMs: undefined
    })
  }

  private showProjectSelection(session: AppSession): void {
    session.layouts.showTextWall([
      "SELECT PROJECT:",
      "1. Bookcase (6 steps)",
      "2. LEGO Luke (8 steps)",
      "",
      "Say 'bookshelf' or 'lego'"
    ].join("\n"), {
      view: ViewType.MAIN,
      durationMs: undefined
    })
  }

  private showInstructionStep(session: AppSession, project: Project, stepIndex: number): void {
    const step = project.steps[stepIndex]
    const progressBar = this.createProgressBar(step.id, project.totalSteps)

    // Only show the most essential info in 5 lines
    session.layouts.showTextWall([
      `Step ${step.id}: ${step.title}`,
      progressBar,
      step.description,
      "",
      "← 'back'    'next' →"
    ].join("\n"), {
      view: ViewType.MAIN,
      durationMs: undefined
    })
  }

  private createProgressBar(current: number, total: number): string {
    const filled = Math.round((current / total) * 10)
    const empty = 10 - filled
    return `[${'█'.repeat(filled)}${'░'.repeat(empty)}] ${current}/${total}`
  }

  private showCompletionScreen(session: AppSession, sessionId: string, project: Project): void {
    const sessionData = this.sessions.get(sessionId)
    const timeElapsed = sessionData ? Math.round((Date.now() - sessionData.startTime) / 60000) : 0

    session.layouts.showTextWall([
      "🎉 COMPLETE! 🎉",
      `${project.name} done`,
      `Time: ${timeElapsed} minutes`,
      "",
      "Say 'new project'"
    ].join("\n"), {
      view: ViewType.MAIN,
      durationMs: undefined
    })
  }


  private handleNextStep(session: AppSession, sessionId: string): void {
    const state = this.sessions.get(sessionId)
    if (!state || !state.currentProject) return

    if (state.currentStep < state.currentProject.totalSteps - 1) {
      state.currentStep++
      this.showInstructionStep(session, state.currentProject, state.currentStep)
      // Advanced to next step
    } else {
      state.state = 'completed'
      this.showCompletionScreen(session, sessionId, state.currentProject)
      // Project completed
    }

    this.sessions.set(sessionId, state)
  }

  private handlePreviousStep(session: AppSession, sessionId: string): void {
    const state = this.sessions.get(sessionId)
    if (!state || !state.currentProject || state.currentStep <= 0) return

    state.currentStep--
    this.showInstructionStep(session, state.currentProject, state.currentStep)
    // Went back to previous step

    this.sessions.set(sessionId, state)
  }

  private handleNewProject(session: AppSession, sessionId: string): void {
    const state = this.sessions.get(sessionId)
    if (!state) return

    state.state = 'selecting'
    state.currentStep = 0
    state.currentProject = undefined
    state.startTime = Date.now()
    this.showProjectSelection(session)

    this.sessions.set(sessionId, state)
    // Starting new project selection
  }

  private handleProjectSelection(session: AppSession, sessionId: string, projectId: string): void {
    const state = this.sessions.get(sessionId)
    if (!state || state.state !== 'selecting') return

    const project = PROJECTS[projectId]
    if (!project) {
      // Unknown project ID
      return
    }

    state.state = 'building'
    state.currentProject = project
    state.currentStep = 0
    state.startTime = Date.now()
    this.sessions.set(sessionId, state)

    // Show first step
    this.showInstructionStep(session, project, 0)
    // Started project
  }
}

const server = new HandymanVoiceAssistant({
  packageName: PACKAGE_NAME,
  apiKey: MENTRAOS_API_KEY,
  port: PORT,
})

server.start()
  .then(() => {
    console.log(`🔧 AI Handyman Voice Assistant running on port ${PORT}`)
    console.log(`📱 Ready to connect to MentraOS glasses`)
    console.log(`🎯 Projects loaded: Bookshelf, LEGO Luke Skywalker`)
    console.log(`🎤 Voice commands enabled via transcription API`)
    console.log(`🤖 AI processing: ${CEREBRAS_API_KEY ? '✅ Cerebras' : '❌ Cerebras'} | ${EXA_API_KEY ? '✅ Exa' : '❌ Exa'}`)
    console.log(`📊 Barcode integration: ${HARDCODED_BARCODE}`)
  })
  .catch((error) => {
    console.error("Failed to start server:", error)
    process.exit(1)
  })