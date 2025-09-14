import { ApplicationOrchestrator } from './core/orchestrator';
import { APIServer } from './api/server';
import { config, validateConfig } from './config/config';
import { Logger } from './utils/logger';

const logger = new Logger('Main');

async function main() {
  try {
    logger.info('Starting AI Handyman Assistant...');

    if (!validateConfig()) {
      logger.error('Invalid configuration. Please check your environment variables.');
      process.exit(1);
    }

    const orchestratorConfig = {
      voiceConfig: {
        accessKey: config.porcupine.accessKey,
        sensitivity: 0.5
      },
      sttConfig: {
        provider: config.azure.speechKey ? 'azure' : 'openai',
        azureKey: config.azure.speechKey,
        azureRegion: config.azure.speechRegion,
        openaiKey: config.openai.apiKey,
        language: 'en'
      },
      visionConfig: {
        azureKey: config.azure.computerVisionKey,
        azureEndpoint: config.azure.computerVisionEndpoint,
        googleCredentialsPath: config.google.credentialsPath,
        awsAccessKey: config.aws.accessKeyId,
        awsSecretKey: config.aws.secretAccessKey,
        awsRegion: config.aws.region
      },
      ragConfig: {
        pineconeApiKey: config.pinecone.apiKey,
        pineconeEnvironment: config.pinecone.environment,
        pineconeIndexName: config.pinecone.indexName,
        openaiApiKey: config.openai.apiKey,
        embeddingModel: config.openai.embeddingModel
      },
      displayConfig: {
        width: 640,
        height: 200,
        isMonochrome: true,
        fontSize: 14
      },
      rtmpConfig: {
        rtmpPort: config.rtmp.port,
        httpPort: config.rtmp.httpPort,
        mediaRoot: './media'
      },
      openaiKey: config.openai.apiKey,
      sessionTimeout: config.sessionTimeout
    };

    const orchestrator = new ApplicationOrchestrator(orchestratorConfig);

    await orchestrator.initialize();

    const apiServer = new APIServer(orchestrator);
    await apiServer.start(config.port);

    logger.info(`AI Handyman Assistant running on port ${config.port}`);

    orchestrator.on('sessionStarted', (sessionId) => {
      logger.info(`New session started: ${sessionId}`);
    });

    orchestrator.on('sessionEnded', (sessionId) => {
      logger.info(`Session ended: ${sessionId}`);
    });

    orchestrator.on('instructionStarted', (data) => {
      logger.info(`Instructions started for ${data.manual.model}`);
    });

    orchestrator.on('instructionCompleted', (data) => {
      logger.info(`Instructions completed for ${data.manual.model}`);
    });

    orchestrator.on('assistanceRequested', (data) => {
      logger.info(`Remote assistance requested: ${data.issue}`);
    });

    process.on('SIGINT', async () => {
      logger.info('Shutting down gracefully...');
      await orchestrator.shutdown();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      logger.info('Shutting down gracefully...');
      await orchestrator.shutdown();
      process.exit(0);
    });

    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception', error);
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled rejection', reason);
      process.exit(1);
    });

  } catch (error) {
    logger.error('Failed to start application', error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});