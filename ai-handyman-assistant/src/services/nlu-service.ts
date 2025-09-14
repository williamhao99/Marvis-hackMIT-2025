import OpenAI from 'openai';
import { Logger } from '../utils/logger';

export interface Intent {
  type: string;
  confidence: number;
  data?: any;
}

export interface NLUConfig {
  openaiKey: string;
  model?: string;
}

export class NLUService {
  private openai: OpenAI;
  private logger: Logger;
  private config: NLUConfig;

  constructor(config: NLUConfig) {
    this.config = config;
    this.logger = new Logger('NLUService');
    this.openai = new OpenAI({ apiKey: config.openaiKey });
  }

  async initialize(): Promise<void> {
    this.logger.info('NLU service initialized');
  }

  async parseIntent(input: string): Promise<Intent> {
    try {
      const response = await this.openai.chat.completions.create({
        model: this.config.model || 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are an intent classifier for a handyman assistant. Classify the user input into one of these intents:
            - identify_object: User wants to identify what they're looking at
            - progress_update: User is reporting progress (e.g., "I've attached the screws")
            - next_step: User wants to see the next instruction
            - previous_step: User wants to go back to the previous instruction
            - request_help: User needs remote assistance
            - general_question: User has a general question
            - end_session: User wants to end the session

            Return a JSON object with: { "type": "intent_type", "confidence": 0.0-1.0, "data": {} }`
          },
          {
            role: 'user',
            content: input
          }
        ],
        response_format: { type: 'json_object' }
      });

      const content = response.choices[0].message.content;
      if (content) {
        return JSON.parse(content);
      }

      return { type: 'unknown', confidence: 0 };
    } catch (error) {
      this.logger.error('Failed to parse intent', error);
      return { type: 'unknown', confidence: 0 };
    }
  }

  async extractEntities(input: string): Promise<any> {
    try {
      const response = await this.openai.chat.completions.create({
        model: this.config.model || 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'Extract entities from the user input. Return as JSON.'
          },
          {
            role: 'user',
            content: input
          }
        ],
        response_format: { type: 'json_object' }
      });

      const content = response.choices[0].message.content;
      return content ? JSON.parse(content) : {};
    } catch (error) {
      this.logger.error('Failed to extract entities', error);
      return {};
    }
  }
}