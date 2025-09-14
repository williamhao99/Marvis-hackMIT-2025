import { Pinecone } from '@pinecone-database/pinecone';
import OpenAI from 'openai';
import pdfParse from 'pdf-parse';
import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';
import { Logger } from '../utils/logger';

export interface InstructionStep {
  stepNumber: number;
  title?: string;
  description: string;
  imageUrl?: string;
  parts?: string[];
  tools?: string[];
  warnings?: string[];
  estimatedTime?: number;
  nextStep?: number;
  previousStep?: number;
}

export interface InstructionManual {
  id: string;
  brand?: string;
  model: string;
  category: string;
  steps: InstructionStep[];
  totalSteps: number;
  estimatedTotalTime?: number;
  requiredTools?: string[];
  sourceUrl?: string;
  language: string;
}

export interface RAGConfig {
  pineconeApiKey: string;
  pineconeEnvironment: string;
  pineconeIndexName: string;
  openaiApiKey: string;
  embeddingModel?: string;
  manualStoragePath?: string;
}

export class InstructionRetrievalService {
  private logger: Logger;
  private pinecone: Pinecone;
  private openai: OpenAI;
  private config: RAGConfig;
  private index: any;
  private manualCache: Map<string, InstructionManual> = new Map();

  constructor(config: RAGConfig) {
    this.config = config;
    this.logger = new Logger('InstructionRetrieval');

    this.pinecone = new Pinecone({
      apiKey: config.pineconeApiKey
    });

    this.openai = new OpenAI({
      apiKey: config.openaiApiKey
    });
  }

  async initialize(): Promise<void> {
    try {
      this.index = this.pinecone.index(this.config.pineconeIndexName);

      await this.ensureIndexExists();

      this.logger.info('Instruction retrieval service initialized');
    } catch (error) {
      this.logger.error('Failed to initialize instruction retrieval service', error);
      throw error;
    }
  }

  private async ensureIndexExists(): Promise<void> {
    try {
      const indexes = await this.pinecone.listIndexes();
      const indexExists = indexes.indexes?.some(idx => idx.name === this.config.pineconeIndexName);

      if (!indexExists) {
        await this.pinecone.createIndex({
          name: this.config.pineconeIndexName,
          dimension: 1536,
          metric: 'cosine',
          spec: {
            serverless: {
              cloud: 'aws',
              region: 'us-east-1'
            }
          }
        });

        this.logger.info('Created new Pinecone index');
      }
    } catch (error) {
      this.logger.warn('Could not ensure index exists', error);
    }
  }

  async findManual(objectName: string, brand?: string, model?: string): Promise<InstructionManual | null> {
    try {
      const cacheKey = `${brand || ''}_${model || objectName}`;

      if (this.manualCache.has(cacheKey)) {
        return this.manualCache.get(cacheKey)!;
      }

      const queryEmbedding = await this.generateEmbedding(
        `${brand || ''} ${model || ''} ${objectName} assembly instructions manual guide`
      );

      const queryResponse = await this.index.query({
        vector: queryEmbedding,
        topK: 5,
        includeMetadata: true
      });

      if (queryResponse.matches && queryResponse.matches.length > 0) {
        const bestMatch = queryResponse.matches[0];

        if (bestMatch.score && bestMatch.score > 0.8) {
          const manualId = bestMatch.metadata?.manualId as string;
          const manual = await this.fetchManualById(manualId);

          if (manual) {
            this.manualCache.set(cacheKey, manual);
            return manual;
          }
        }
      }

      const scrapedManual = await this.scrapeManualFromWeb(objectName, brand, model);

      if (scrapedManual) {
        await this.indexManual(scrapedManual);
        this.manualCache.set(cacheKey, scrapedManual);
        return scrapedManual;
      }

      return this.generateGenericManual(objectName);
    } catch (error) {
      this.logger.error('Failed to find manual', error);
      return null;
    }
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    const response = await this.openai.embeddings.create({
      model: this.config.embeddingModel || 'text-embedding-3-small',
      input: text
    });

    return response.data[0].embedding;
  }

  private async fetchManualById(manualId: string): Promise<InstructionManual | null> {
    try {
      if (this.config.manualStoragePath) {
        const filePath = path.join(this.config.manualStoragePath, `${manualId}.json`);
        const content = await fs.readFile(filePath, 'utf-8');
        return JSON.parse(content);
      }

      return null;
    } catch (error) {
      this.logger.error('Failed to fetch manual by ID', error);
      return null;
    }
  }

  private async scrapeManualFromWeb(
    objectName: string,
    brand?: string,
    model?: string
  ): Promise<InstructionManual | null> {
    try {
      const searchQuery = `${brand || ''} ${model || objectName} manual pdf filetype:pdf`;
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`;

      const manualUrls = await this.findManualUrls(brand, model, objectName);

      for (const url of manualUrls) {
        try {
          const manual = await this.downloadAndParseManual(url, objectName, brand, model);
          if (manual) {
            return manual;
          }
        } catch (error) {
          this.logger.warn(`Failed to parse manual from ${url}`, error);
        }
      }

      return null;
    } catch (error) {
      this.logger.error('Failed to scrape manual from web', error);
      return null;
    }
  }

  private async findManualUrls(brand?: string, model?: string, objectName?: string): Promise<string[]> {
    const urls: string[] = [];

    if (brand?.toLowerCase() === 'ikea' && model) {
      urls.push(`https://www.ikea.com/us/en/assembly_instructions/${model.toLowerCase()}.pdf`);
    }

    const manufacturerSites = {
      samsung: 'https://www.samsung.com/support/manuals/',
      lg: 'https://www.lg.com/us/support/manuals',
      sony: 'https://www.sony.com/electronics/support/manuals',
      apple: 'https://support.apple.com/manuals/',
      dell: 'https://www.dell.com/support/manuals/',
      hp: 'https://support.hp.com/manuals/'
    };

    if (brand) {
      const site = manufacturerSites[brand.toLowerCase() as keyof typeof manufacturerSites];
      if (site) {
        urls.push(site);
      }
    }

    return urls;
  }

  private async downloadAndParseManual(
    url: string,
    objectName: string,
    brand?: string,
    model?: string
  ): Promise<InstructionManual | null> {
    try {
      const response = await axios.get(url, { responseType: 'arraybuffer' });
      const pdfBuffer = Buffer.from(response.data);

      const pdfData = await pdfParse(pdfBuffer);
      const text = pdfData.text;

      const steps = await this.extractStepsFromText(text);

      if (steps.length > 0) {
        const manual: InstructionManual = {
          id: `${brand}_${model}_${Date.now()}`,
          brand,
          model: model || objectName,
          category: this.categorizeObject(objectName),
          steps,
          totalSteps: steps.length,
          sourceUrl: url,
          language: 'en'
        };

        return manual;
      }

      return null;
    } catch (error) {
      this.logger.error('Failed to download and parse manual', error);
      return null;
    }
  }

  private async extractStepsFromText(text: string): Promise<InstructionStep[]> {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'Extract assembly/repair steps from the following manual text. Return a JSON array of steps.'
          },
          {
            role: 'user',
            content: text.substring(0, 8000)
          }
        ],
        response_format: { type: 'json_object' }
      });

      const content = response.choices[0].message.content;
      if (content) {
        const parsed = JSON.parse(content);
        return parsed.steps || [];
      }

      return [];
    } catch (error) {
      this.logger.error('Failed to extract steps from text', error);
      return [];
    }
  }

  private async indexManual(manual: InstructionManual): Promise<void> {
    try {
      const vectors = [];

      for (const step of manual.steps) {
        const stepText = `${manual.brand || ''} ${manual.model} ${step.title || ''} ${step.description}`;
        const embedding = await this.generateEmbedding(stepText);

        vectors.push({
          id: `${manual.id}_step_${step.stepNumber}`,
          values: embedding,
          metadata: {
            manualId: manual.id,
            brand: manual.brand,
            model: manual.model,
            stepNumber: step.stepNumber,
            description: step.description
          }
        });
      }

      await this.index.upsert(vectors);

      if (this.config.manualStoragePath) {
        const filePath = path.join(this.config.manualStoragePath, `${manual.id}.json`);
        await fs.writeFile(filePath, JSON.stringify(manual, null, 2));
      }

      this.logger.info(`Indexed manual: ${manual.id}`);
    } catch (error) {
      this.logger.error('Failed to index manual', error);
    }
  }

  private generateGenericManual(objectName: string): InstructionManual {
    const category = this.categorizeObject(objectName);

    const genericSteps: InstructionStep[] = [
      {
        stepNumber: 1,
        title: 'Preparation',
        description: `Unpack all parts and verify against the parts list for your ${objectName}`,
        estimatedTime: 5
      },
      {
        stepNumber: 2,
        title: 'Identify Components',
        description: 'Lay out all components and hardware in an organized manner',
        estimatedTime: 3
      },
      {
        stepNumber: 3,
        title: 'Begin Assembly',
        description: `Start assembling the main structure of your ${objectName}`,
        estimatedTime: 15
      },
      {
        stepNumber: 4,
        title: 'Secure Connections',
        description: 'Ensure all connections are properly tightened and secure',
        estimatedTime: 10
      },
      {
        stepNumber: 5,
        title: 'Final Check',
        description: `Verify that your ${objectName} is stable and all parts are correctly installed`,
        estimatedTime: 5
      }
    ];

    return {
      id: `generic_${objectName}_${Date.now()}`,
      model: objectName,
      category,
      steps: genericSteps,
      totalSteps: genericSteps.length,
      estimatedTotalTime: 38,
      language: 'en'
    };
  }

  private categorizeObject(objectName: string): string {
    const lowerName = objectName.toLowerCase();

    if (lowerName.includes('chair') || lowerName.includes('table') || lowerName.includes('desk')) {
      return 'furniture';
    } else if (lowerName.includes('tv') || lowerName.includes('computer') || lowerName.includes('phone')) {
      return 'electronics';
    } else if (lowerName.includes('washer') || lowerName.includes('dryer') || lowerName.includes('refrigerator')) {
      return 'appliance';
    }

    return 'general';
  }

  async getNextStep(
    manual: InstructionManual,
    currentStep: number,
    userProgress: string
  ): Promise<InstructionStep | null> {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'Based on user progress, determine the appropriate next step.'
          },
          {
            role: 'user',
            content: `Current step: ${currentStep}\nUser progress: ${userProgress}\nManual steps: ${JSON.stringify(manual.steps)}`
          }
        ]
      });

      const content = response.choices[0].message.content;

      if (content) {
        const stepNumberMatch = content.match(/step (\d+)/i);
        if (stepNumberMatch) {
          const nextStepNumber = parseInt(stepNumberMatch[1]);
          return manual.steps.find(s => s.stepNumber === nextStepNumber) || null;
        }
      }

      return manual.steps.find(s => s.stepNumber === currentStep + 1) || null;
    } catch (error) {
      this.logger.error('Failed to get next step', error);
      return manual.steps.find(s => s.stepNumber === currentStep + 1) || null;
    }
  }
}