import { ComputerVisionClient } from '@azure/cognitiveservices-computervision';
import { ApiKeyCredentials } from '@azure/ms-rest-js';
import * as vision from '@google-cloud/vision';
import AWS from 'aws-sdk';
import axios from 'axios';
import { Logger } from '../utils/logger';

export interface ObjectDetectionResult {
  object: string;
  confidence: number;
  category?: string;
  brand?: string;
  model?: string;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  provider: string;
}

export interface ComputerVisionConfig {
  azureKey?: string;
  azureEndpoint?: string;
  googleCredentialsPath?: string;
  awsAccessKey?: string;
  awsSecretKey?: string;
  awsRegion?: string;
  customModelEndpoints?: {
    furniture?: string;
    electronics?: string;
  };
}

export class ComputerVisionService {
  private logger: Logger;
  private azureClient?: ComputerVisionClient;
  private googleClient: vision.ImageAnnotatorClient | null = null;
  private awsRekognition?: AWS.Rekognition;
  private config: ComputerVisionConfig;

  constructor(config: ComputerVisionConfig) {
    this.config = config;
    this.logger = new Logger('ComputerVision');
  }

  async initialize(): Promise<void> {
    try {
      if (this.config.azureKey && this.config.azureEndpoint) {
        this.azureClient = new ComputerVisionClient(
          new ApiKeyCredentials({ inHeader: { 'Ocp-Apim-Subscription-Key': this.config.azureKey } }),
          this.config.azureEndpoint
        );
        this.logger.info('Azure Computer Vision initialized');
      }

      if (this.config.googleCredentialsPath) {
        this.googleClient = new vision.ImageAnnotatorClient({
          keyFilename: this.config.googleCredentialsPath
        });
        this.logger.info('Google Vision initialized');
      }

      if (this.config.awsAccessKey && this.config.awsSecretKey) {
        AWS.config.update({
          accessKeyId: this.config.awsAccessKey,
          secretAccessKey: this.config.awsSecretKey,
          region: this.config.awsRegion || 'us-east-1'
        });
        this.awsRekognition = new AWS.Rekognition();
        this.logger.info('AWS Rekognition initialized');
      }

      this.logger.info('Computer Vision service initialized');
    } catch (error) {
      this.logger.error('Failed to initialize Computer Vision service', error);
      throw error;
    }
  }

  async detectObjects(imageBuffer: Buffer): Promise<ObjectDetectionResult[]> {
    const results: ObjectDetectionResult[] = [];
    const detectPromises: Promise<ObjectDetectionResult[]>[] = [];

    if (this.azureClient) {
      detectPromises.push(this.detectWithAzure(imageBuffer));
    }

    if (this.googleClient) {
      detectPromises.push(this.detectWithGoogle(imageBuffer));
    }

    if (this.awsRekognition) {
      detectPromises.push(this.detectWithAWS(imageBuffer));
    }

    if (this.config.customModelEndpoints) {
      detectPromises.push(this.detectWithCustomModels(imageBuffer));
    }

    const allResults = await Promise.allSettled(detectPromises);

    for (const result of allResults) {
      if (result.status === 'fulfilled') {
        results.push(...result.value);
      } else {
        this.logger.warn('One detection provider failed', result.reason);
      }
    }

    return this.consolidateResults(results);
  }

  private async detectWithAzure(imageBuffer: Buffer): Promise<ObjectDetectionResult[]> {
    try {
      const streamResponse = await this.azureClient!.analyzeImageInStream(imageBuffer, {
        visualFeatures: ['Objects', 'Brands', 'Categories', 'Description', 'Tags']
      });

      const results: ObjectDetectionResult[] = [];

      if (streamResponse.objects) {
        for (const obj of streamResponse.objects) {
          results.push({
            object: obj.object || 'unknown',
            confidence: obj.confidence || 0,
            boundingBox: obj.rectangle ? {
              x: obj.rectangle.x || 0,
              y: obj.rectangle.y || 0,
              width: obj.rectangle.w || 0,
              height: obj.rectangle.h || 0
            } : undefined,
            provider: 'azure'
          });
        }
      }

      if (streamResponse.brands) {
        for (const brand of streamResponse.brands) {
          results.push({
            object: 'branded_item',
            brand: brand.name,
            confidence: brand.confidence || 0,
            boundingBox: brand.rectangle ? {
              x: brand.rectangle.x || 0,
              y: brand.rectangle.y || 0,
              width: brand.rectangle.w || 0,
              height: brand.rectangle.h || 0
            } : undefined,
            provider: 'azure'
          });
        }
      }

      return results;
    } catch (error) {
      this.logger.error('Azure detection failed', error);
      return [];
    }
  }

  private async detectWithGoogle(imageBuffer: Buffer): Promise<ObjectDetectionResult[]> {
    if (!this.googleClient) {
      this.logger.warn('Google Vision client not initialized');
      return [];
    }

    try {
      const client = this.googleClient!; // TypeScript now knows this is not null
      const response = await client.objectLocalization?.({
        image: { content: imageBuffer.toString('base64') }
      });

      if (!response) {
        return [];
      }

      const [result] = response;
      const results: ObjectDetectionResult[] = [];

      if (result?.localizedObjectAnnotations) {
        for (const obj of result.localizedObjectAnnotations) {
          const vertices = obj.boundingPoly?.normalizedVertices;
          let boundingBox;

          if (vertices && vertices.length >= 2) {
            boundingBox = {
              x: vertices[0].x || 0,
              y: vertices[0].y || 0,
              width: (vertices[2].x || 0) - (vertices[0].x || 0),
              height: (vertices[2].y || 0) - (vertices[0].y || 0)
            };
          }

          results.push({
            object: obj.name || 'unknown',
            confidence: obj.score || 0,
            boundingBox,
            provider: 'google'
          });
        }
      }

      const [labelResult] = await client.labelDetection({
        image: { content: imageBuffer.toString('base64') }
      });

      if (labelResult.labelAnnotations) {
        for (const label of labelResult.labelAnnotations) {
          if (this.isFurnitureOrElectronics(label.description || '')) {
            results.push({
              object: label.description || 'unknown',
              confidence: label.score || 0,
              category: this.categorizeObject(label.description || ''),
              provider: 'google'
            });
          }
        }
      }

      return results;
    } catch (error) {
      this.logger.error('Google detection failed', error);
      return [];
    }
  }

  private async detectWithAWS(imageBuffer: Buffer): Promise<ObjectDetectionResult[]> {
    try {
      const params = {
        Image: { Bytes: imageBuffer },
        MaxLabels: 20,
        MinConfidence: 70
      };

      const detectLabels = await this.awsRekognition!.detectLabels(params).promise();
      const results: ObjectDetectionResult[] = [];

      if (detectLabels.Labels) {
        for (const label of detectLabels.Labels) {
          if (this.isFurnitureOrElectronics(label.Name || '')) {
            const instances = label.Instances || [];

            if (instances.length > 0) {
              for (const instance of instances) {
                const bbox = instance.BoundingBox;
                results.push({
                  object: label.Name || 'unknown',
                  confidence: (instance.Confidence || 0) / 100,
                  category: this.categorizeObject(label.Name || ''),
                  boundingBox: bbox ? {
                    x: bbox.Left || 0,
                    y: bbox.Top || 0,
                    width: bbox.Width || 0,
                    height: bbox.Height || 0
                  } : undefined,
                  provider: 'aws'
                });
              }
            } else {
              results.push({
                object: label.Name || 'unknown',
                confidence: (label.Confidence || 0) / 100,
                category: this.categorizeObject(label.Name || ''),
                provider: 'aws'
              });
            }
          }
        }
      }

      return results;
    } catch (error) {
      this.logger.error('AWS detection failed', error);
      return [];
    }
  }

  private async detectWithCustomModels(imageBuffer: Buffer): Promise<ObjectDetectionResult[]> {
    const results: ObjectDetectionResult[] = [];

    if (this.config.customModelEndpoints?.furniture) {
      try {
        const response = await axios.post(
          this.config.customModelEndpoints.furniture,
          { image: imageBuffer.toString('base64') },
          { headers: { 'Content-Type': 'application/json' } }
        );

        if (response.data && response.data.predictions) {
          for (const pred of response.data.predictions) {
            results.push({
              object: pred.class,
              confidence: pred.confidence,
              category: 'furniture',
              brand: pred.brand,
              model: pred.model,
              provider: 'custom_furniture'
            });
          }
        }
      } catch (error) {
        this.logger.warn('Custom furniture model failed', error);
      }
    }

    if (this.config.customModelEndpoints?.electronics) {
      try {
        const response = await axios.post(
          this.config.customModelEndpoints.electronics,
          { image: imageBuffer.toString('base64') },
          { headers: { 'Content-Type': 'application/json' } }
        );

        if (response.data && response.data.predictions) {
          for (const pred of response.data.predictions) {
            results.push({
              object: pred.class,
              confidence: pred.confidence,
              category: 'electronics',
              brand: pred.brand,
              model: pred.model,
              provider: 'custom_electronics'
            });
          }
        }
      } catch (error) {
        this.logger.warn('Custom electronics model failed', error);
      }
    }

    return results;
  }

  private isFurnitureOrElectronics(label: string): boolean {
    const furnitureKeywords = [
      'chair', 'table', 'desk', 'sofa', 'couch', 'bed', 'cabinet',
      'shelf', 'drawer', 'wardrobe', 'furniture', 'ikea', 'bookcase',
      'stool', 'bench', 'ottoman', 'dresser', 'nightstand'
    ];

    const electronicsKeywords = [
      'computer', 'laptop', 'phone', 'television', 'tv', 'monitor',
      'speaker', 'headphone', 'router', 'printer', 'camera', 'tablet',
      'console', 'microwave', 'refrigerator', 'washer', 'dryer',
      'dishwasher', 'toaster', 'blender', 'coffee maker', 'vacuum'
    ];

    const lowerLabel = label.toLowerCase();

    return furnitureKeywords.some(keyword => lowerLabel.includes(keyword)) ||
           electronicsKeywords.some(keyword => lowerLabel.includes(keyword));
  }

  private categorizeObject(label: string): string {
    const lowerLabel = label.toLowerCase();

    const categories = {
      furniture: ['chair', 'table', 'desk', 'sofa', 'bed', 'cabinet', 'shelf'],
      kitchen_appliance: ['microwave', 'refrigerator', 'dishwasher', 'toaster', 'blender'],
      electronics: ['computer', 'laptop', 'phone', 'television', 'monitor', 'speaker'],
      home_appliance: ['washer', 'dryer', 'vacuum', 'heater', 'fan']
    };

    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => lowerLabel.includes(keyword))) {
        return category;
      }
    }

    return 'general';
  }

  private consolidateResults(results: ObjectDetectionResult[]): ObjectDetectionResult[] {
    const grouped = new Map<string, ObjectDetectionResult[]>();

    for (const result of results) {
      const key = `${result.object}_${result.category || ''}`;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(result);
    }

    const consolidated: ObjectDetectionResult[] = [];

    for (const [key, group] of grouped) {
      const bestResult = group.reduce((best, current) => {
        return current.confidence > best.confidence ? current : best;
      });

      const avgConfidence = group.reduce((sum, r) => sum + r.confidence, 0) / group.length;

      consolidated.push({
        ...bestResult,
        confidence: avgConfidence,
        provider: group.map(r => r.provider).join(', ')
      });
    }

    return consolidated.sort((a, b) => b.confidence - a.confidence);
  }

  async identifySpecificModel(imageBuffer: Buffer, category: string): Promise<string | null> {
    try {
      if (category === 'furniture' && this.isFurnitureIKEA(imageBuffer)) {
        return await this.identifyIKEAModel(imageBuffer);
      }

      return null;
    } catch (error) {
      this.logger.error('Failed to identify specific model', error);
      return null;
    }
  }

  private isFurnitureIKEA(imageBuffer: Buffer): boolean {
    return true;
  }

  private async identifyIKEAModel(imageBuffer: Buffer): Promise<string | null> {
    return 'IKEA_BILLY_BOOKCASE';
  }
}