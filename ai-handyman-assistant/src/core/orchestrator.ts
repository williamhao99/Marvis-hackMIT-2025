import { EventEmitter } from 'events';
import { VoiceActivationModule } from './voice-activation';
import { SpeechToTextService } from '../services/speech-to-text';
import { ComputerVisionService } from '../services/computer-vision';
import { InstructionRetrievalService, InstructionManual, InstructionStep } from '../services/instruction-retrieval';
import { DisplayRenderer, DisplayContent } from '../modules/display-renderer';
import { RTMPStreamingModule } from '../modules/rtmp-streaming';
import { NLUService } from '../services/nlu-service';
import { GlassesConnector } from '../modules/glasses-connector';
import { Logger } from '../utils/logger';
import OpenAI from 'openai';

export interface SessionState {
  id: string;
  userId?: string;
  currentManual?: InstructionManual;
  currentStep: number;
  startTime: Date;
  lastInteraction: Date;
  isActive: boolean;
  detectedObject?: string;
  streamSessionId?: string;
  conversationHistory: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
  }>;
}

export interface OrchestratorConfig {
  voiceConfig: any;
  sttConfig: any;
  visionConfig: any;
  ragConfig: any;
  displayConfig: any;
  rtmpConfig: any;
  openaiKey: string;
  sessionTimeout?: number;
}

export class ApplicationOrchestrator extends EventEmitter {
  private logger: Logger;
  private voiceModule: VoiceActivationModule;
  private sttService: SpeechToTextService;
  private visionService: ComputerVisionService;
  private instructionService: InstructionRetrievalService;
  private displayRenderer: DisplayRenderer;
  private rtmpModule: RTMPStreamingModule;
  private nluService: NLUService;
  private glassesConnector: GlassesConnector;
  private openai: OpenAI;

  private sessions: Map<string, SessionState> = new Map();
  private currentSession: SessionState | null = null;

  constructor(config: OrchestratorConfig) {
    super();
    this.logger = new Logger('Orchestrator');

    this.voiceModule = new VoiceActivationModule(config.voiceConfig);
    this.sttService = new SpeechToTextService(config.sttConfig);
    this.visionService = new ComputerVisionService(config.visionConfig);
    this.instructionService = new InstructionRetrievalService(config.ragConfig);
    this.displayRenderer = new DisplayRenderer(config.displayConfig);
    this.rtmpModule = new RTMPStreamingModule(config.rtmpConfig);
    this.nluService = new NLUService({ openaiKey: config.openaiKey });
    this.glassesConnector = new GlassesConnector();

    this.openai = new OpenAI({ apiKey: config.openaiKey });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.voiceModule.on('wakeWordDetected', async () => {
      await this.handleWakeWord();
    });

    this.sttService.on('transcription', async (result) => {
      await this.handleTranscription(result);
    });

    this.rtmpModule.on('streamStarted', (session) => {
      if (this.currentSession) {
        this.currentSession.streamSessionId = session.id;
      }
    });

    this.rtmpModule.on('assistanceRequested', async (data) => {
      await this.handleAssistanceRequest(data);
    });

    this.glassesConnector.on('imageCapture', async (imageBuffer) => {
      await this.processImage(imageBuffer);
    });

    this.glassesConnector.on('connected', () => {
      this.logger.info('Glasses connected');
      this.emit('glassesConnected');
    });
  }

  async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing application orchestrator...');

      await Promise.all([
        this.voiceModule.initialize(),
        this.sttService.initialize(),
        this.visionService.initialize(),
        this.instructionService.initialize(),
        this.nluService.initialize(),
        this.glassesConnector.initialize(),
        this.rtmpModule.start()
      ]);

      await this.voiceModule.startListening();

      this.logger.info('Application orchestrator initialized successfully');
      this.emit('ready');
    } catch (error) {
      this.logger.error('Failed to initialize orchestrator', error);
      throw error;
    }
  }

  private async handleWakeWord(): Promise<void> {
    this.logger.info('Wake word detected, starting session');

    const sessionId = this.generateSessionId();
    const session: SessionState = {
      id: sessionId,
      currentStep: 0,
      startTime: new Date(),
      lastInteraction: new Date(),
      isActive: true,
      conversationHistory: []
    };

    this.sessions.set(sessionId, session);
    this.currentSession = session;

    await this.displayRenderer.renderContent({
      type: 'text',
      title: 'Hello!',
      content: 'How can I help you today? Show me what you\'re working on.'
    });

    await this.glassesConnector.sendDisplay(
      await this.displayRenderer.renderContent({
        type: 'text',
        title: 'Ready',
        content: 'Listening...'
      })
    );

    await this.sttService.startContinuousRecognition();

    this.emit('sessionStarted', sessionId);
  }

  private async handleTranscription(result: any): Promise<void> {
    if (!this.currentSession) return;

    const userInput = result.text;
    this.logger.info(`User said: ${userInput}`);

    this.currentSession.conversationHistory.push({
      role: 'user',
      content: userInput,
      timestamp: new Date()
    });

    const intent = await this.nluService.parseIntent(userInput);

    switch (intent.type) {
      case 'identify_object':
        await this.handleObjectIdentification();
        break;

      case 'progress_update':
        await this.handleProgressUpdate(intent.data);
        break;

      case 'next_step':
        await this.showNextStep();
        break;

      case 'previous_step':
        await this.showPreviousStep();
        break;

      case 'request_help':
        await this.requestRemoteAssistance(intent.data);
        break;

      case 'general_question':
        await this.handleGeneralQuestion(userInput);
        break;

      default:
        await this.handleUnknownIntent(userInput);
    }

    this.currentSession.lastInteraction = new Date();
  }

  private async handleObjectIdentification(): Promise<void> {
    if (!this.currentSession) return;

    await this.displayRenderer.renderContent({
      type: 'text',
      content: 'Analyzing what you\'re looking at...'
    });

    const imageBuffer = await this.glassesConnector.captureImage();

    if (imageBuffer) {
      await this.processImage(imageBuffer);
    } else {
      await this.displayRenderer.renderContent({
        type: 'text',
        content: 'Unable to capture image. Please try again.'
      });
    }
  }

  private async processImage(imageBuffer: Buffer): Promise<void> {
    if (!this.currentSession) return;

    try {
      const detectionResults = await this.visionService.detectObjects(imageBuffer);

      if (detectionResults.length > 0) {
        const bestMatch = detectionResults[0];
        this.currentSession.detectedObject = bestMatch.object;

        await this.displayRenderer.renderContent({
          type: 'text',
          title: 'Object Detected',
          content: `I see: ${bestMatch.object}${bestMatch.brand ? ' by ' + bestMatch.brand : ''}`
        });

        const manual = await this.instructionService.findManual(
          bestMatch.object,
          bestMatch.brand,
          bestMatch.model
        );

        if (manual) {
          this.currentSession.currentManual = manual;
          this.currentSession.currentStep = 0;

          await this.displayManualStart(manual);
        } else {
          await this.displayRenderer.renderContent({
            type: 'text',
            content: 'I couldn\'t find specific instructions, but I can guide you with general steps.'
          });
        }
      } else {
        await this.displayRenderer.renderContent({
          type: 'text',
          content: 'I couldn\'t identify the object. Can you tell me what you\'re working on?'
        });
      }
    } catch (error) {
      this.logger.error('Failed to process image', error);
      await this.displayRenderer.renderContent({
        type: 'text',
        content: 'Error processing image. Please try again.'
      });
    }
  }

  private async displayManualStart(manual: InstructionManual): Promise<void> {
    const firstStep = manual.steps[0];

    const content: DisplayContent = {
      type: 'instruction',
      step: firstStep,
      content: firstStep.description,
      progress: {
        current: 1,
        total: manual.totalSteps
      }
    };

    const displayBuffer = await this.displayRenderer.renderContent(content);
    await this.glassesConnector.sendDisplay(displayBuffer);

    if (this.currentSession?.streamSessionId) {
      this.rtmpModule.broadcastOverlay(this.currentSession.streamSessionId, content);
    }

    this.emit('instructionStarted', {
      sessionId: this.currentSession?.id,
      manual: manual
    });
  }

  private async handleProgressUpdate(data: any): Promise<void> {
    if (!this.currentSession || !this.currentSession.currentManual) return;

    const manual = this.currentSession.currentManual;
    const currentStep = this.currentSession.currentStep;

    const nextStep = await this.instructionService.getNextStep(
      manual,
      currentStep,
      data.progress || ''
    );

    if (nextStep) {
      this.currentSession.currentStep = nextStep.stepNumber;
      await this.displayStep(nextStep);
    } else {
      await this.displayCompletion();
    }
  }

  private async showNextStep(): Promise<void> {
    if (!this.currentSession || !this.currentSession.currentManual) return;

    const manual = this.currentSession.currentManual;
    const nextStepNumber = this.currentSession.currentStep + 1;

    if (nextStepNumber < manual.totalSteps) {
      const nextStep = manual.steps[nextStepNumber];
      this.currentSession.currentStep = nextStepNumber;
      await this.displayStep(nextStep);
    } else {
      await this.displayCompletion();
    }
  }

  private async showPreviousStep(): Promise<void> {
    if (!this.currentSession || !this.currentSession.currentManual) return;

    const manual = this.currentSession.currentManual;
    const prevStepNumber = Math.max(0, this.currentSession.currentStep - 1);

    const prevStep = manual.steps[prevStepNumber];
    this.currentSession.currentStep = prevStepNumber;
    await this.displayStep(prevStep);
  }

  private async displayStep(step: InstructionStep): Promise<void> {
    if (!this.currentSession?.currentManual) return;

    const content: DisplayContent = {
      type: 'instruction',
      step: step,
      content: step.description,
      progress: {
        current: step.stepNumber + 1,
        total: this.currentSession.currentManual.totalSteps
      }
    };

    const displayBuffer = await this.displayRenderer.renderContent(content);
    await this.glassesConnector.sendDisplay(displayBuffer);

    if (this.currentSession.streamSessionId) {
      this.rtmpModule.broadcastOverlay(this.currentSession.streamSessionId, content);
    }
  }

  private async displayCompletion(): Promise<void> {
    const content: DisplayContent = {
      type: 'progress',
      title: 'Complete!',
      content: 'Great job! You\'ve completed all the steps.',
      progress: {
        current: this.currentSession?.currentManual?.totalSteps || 0,
        total: this.currentSession?.currentManual?.totalSteps || 0
      }
    };

    const displayBuffer = await this.displayRenderer.renderContent(content);
    await this.glassesConnector.sendDisplay(displayBuffer);

    if (this.currentSession?.streamSessionId) {
      this.rtmpModule.broadcastOverlay(this.currentSession.streamSessionId, content);
    }

    this.emit('instructionCompleted', {
      sessionId: this.currentSession?.id,
      manual: this.currentSession?.currentManual
    });
  }

  private async requestRemoteAssistance(data: any): Promise<void> {
    if (!this.currentSession) return;

    this.emit('assistanceRequested', {
      sessionId: this.currentSession.id,
      issue: data.issue || 'User requested help',
      currentStep: this.currentSession.currentStep,
      manual: this.currentSession.currentManual
    });

    await this.displayRenderer.renderContent({
      type: 'text',
      title: 'Help Requested',
      content: 'A remote assistant will join your stream shortly.'
    });
  }

  private async handleGeneralQuestion(question: string): Promise<void> {
    try {
      const context = this.currentSession?.currentManual
        ? `User is working on: ${this.currentSession.currentManual.model}, Step ${this.currentSession.currentStep + 1}`
        : 'No specific context';

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful handyman assistant. Provide clear, concise guidance.'
          },
          {
            role: 'user',
            content: `Context: ${context}\nQuestion: ${question}`
          }
        ]
      });

      const answer = response.choices[0].message.content || 'I\'m not sure about that.';

      await this.displayRenderer.renderContent({
        type: 'text',
        content: answer
      });

      this.currentSession?.conversationHistory.push({
        role: 'assistant',
        content: answer,
        timestamp: new Date()
      });
    } catch (error) {
      this.logger.error('Failed to handle general question', error);
      await this.displayRenderer.renderContent({
        type: 'text',
        content: 'Sorry, I couldn\'t process that question.'
      });
    }
  }

  private async handleUnknownIntent(input: string): Promise<void> {
    await this.displayRenderer.renderContent({
      type: 'text',
      content: 'I didn\'t understand that. You can say "next step", "previous step", or "help".'
    });
  }

  private async handleAssistanceRequest(data: any): Promise<void> {
    this.logger.info('Remote assistance requested', data);
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async endSession(sessionId?: string): Promise<void> {
    const session = sessionId
      ? this.sessions.get(sessionId)
      : this.currentSession;

    if (session) {
      session.isActive = false;

      await this.sttService.stopContinuousRecognition();

      if (session === this.currentSession) {
        this.currentSession = null;
      }

      this.emit('sessionEnded', session.id);
      this.logger.info(`Session ended: ${session.id}`);
    }
  }

  getActiveSession(): SessionState | null {
    return this.currentSession;
  }

  getAllSessions(): SessionState[] {
    return Array.from(this.sessions.values());
  }

  async shutdown(): Promise<void> {
    this.logger.info('Shutting down orchestrator...');

    await this.voiceModule.cleanup();
    await this.sttService.cleanup();
    await this.rtmpModule.stop();
    await this.glassesConnector.disconnect();

    this.logger.info('Orchestrator shutdown complete');
  }
}