import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export interface AppConfig {
  port: number;
  nodeEnv: string;
  logLevel: string;
  sessionTimeout: number;
  maxConcurrentSessions: number;

  azure: {
    computerVisionKey: string;
    computerVisionEndpoint: string;
    speechKey: string;
    speechRegion: string;
    storageConnectionString: string;
  };

  openai: {
    apiKey: string;
    model: string;
    embeddingModel: string;
  };

  google: {
    credentialsPath: string;
  };

  aws: {
    accessKeyId: string;
    secretAccessKey: string;
    region: string;
  };

  pinecone: {
    apiKey: string;
    environment: string;
    indexName: string;
  };

  porcupine: {
    accessKey: string;
  };

  rtmp: {
    port: number;
    httpPort: number;
    serverUrl: string;
  };

  glasses: {
    mentraSDKKey: string;
    evenG1UUID: string;
  };
}

export const config: AppConfig = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  logLevel: process.env.LOG_LEVEL || 'info',
  sessionTimeout: parseInt(process.env.SESSION_TIMEOUT_MS || '7200000', 10),
  maxConcurrentSessions: parseInt(process.env.MAX_CONCURRENT_SESSIONS || '100', 10),

  azure: {
    computerVisionKey: process.env.AZURE_COMPUTER_VISION_KEY || '',
    computerVisionEndpoint: process.env.AZURE_COMPUTER_VISION_ENDPOINT || '',
    speechKey: process.env.AZURE_SPEECH_KEY || '',
    speechRegion: process.env.AZURE_SPEECH_REGION || '',
    storageConnectionString: process.env.AZURE_STORAGE_CONNECTION_STRING || ''
  },

  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    model: process.env.OPENAI_MODEL || 'gpt-4o',
    embeddingModel: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small'
  },

  google: {
    credentialsPath: process.env.GOOGLE_APPLICATION_CREDENTIALS || ''
  },

  aws: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    region: process.env.AWS_REGION || 'us-east-1'
  },

  pinecone: {
    apiKey: process.env.PINECONE_API_KEY || '',
    environment: process.env.PINECONE_ENVIRONMENT || '',
    indexName: process.env.PINECONE_INDEX_NAME || 'handyman-instructions'
  },

  porcupine: {
    accessKey: process.env.PORCUPINE_ACCESS_KEY || ''
  },

  rtmp: {
    port: parseInt(process.env.RTMP_PORT || '1935', 10),
    httpPort: parseInt(process.env.HTTP_PORT || '8000', 10),
    serverUrl: process.env.RTMP_SERVER_URL || 'rtmp://localhost:1935/live'
  },

  glasses: {
    mentraSDKKey: process.env.MENTRA_SDK_KEY || '',
    evenG1UUID: process.env.EVEN_G1_BLE_UUID || ''
  }
};

export function validateConfig(): boolean {
  const requiredEnvVars = [
    'OPENAI_API_KEY',
    'PORCUPINE_ACCESS_KEY'
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    console.error('Missing required environment variables:', missingVars);
    return false;
  }

  const warnings = [];

  if (!process.env.AZURE_COMPUTER_VISION_KEY) {
    warnings.push('Azure Computer Vision not configured');
  }

  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    warnings.push('Google Vision not configured');
  }

  if (!process.env.AWS_ACCESS_KEY_ID) {
    warnings.push('AWS Rekognition not configured');
  }

  if (!process.env.PINECONE_API_KEY) {
    warnings.push('Pinecone vector database not configured');
  }

  if (warnings.length > 0) {
    console.warn('Configuration warnings:', warnings);
  }

  return true;
}