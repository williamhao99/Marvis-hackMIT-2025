import { AppServer, AppSession } from '@mentra/sdk';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

const PACKAGE_NAME = process.env.PACKAGE_NAME ?? (() => { throw new Error('PACKAGE_NAME is not set'); })();
const MENTRAOS_API_KEY = process.env.MENTRAOS_API_KEY ?? (() => { throw new Error('MENTRAOS_API_KEY is not set'); })();
const PORT = parseInt(process.env.PORT || '3000');
const IMAGE_STORAGE_PATH = './captured_images';

class SimpleCameraApp extends AppServer {
  private photoCount: number = 0;

  constructor() {
    super({
      packageName: PACKAGE_NAME,
      apiKey: MENTRAOS_API_KEY,
      port: PORT,
    });

    console.log('✅ App initialized');
  }

  protected async onSession(session: AppSession, sessionId: string, userId: string): Promise<void> {
    console.log(`Session started for user ${userId}`);

    session.events.onButtonPress(async (button) => {
      console.log(`Button pressed: ${button.pressType}`);

      try {
        console.log('Taking photo...');
        const photo = await session.camera.requestPhoto();

        if (!photo) {
          console.error('Failed to capture photo');
          return;
        }

        console.log('Photo captured successfully');

        await fs.mkdir(IMAGE_STORAGE_PATH, { recursive: true });

        this.photoCount++;
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `photo_${timestamp}_${this.photoCount}.jpg`;
        const filepath = path.join(IMAGE_STORAGE_PATH, filename);

        await fs.writeFile(filepath, photo.buffer);
        console.log(`Photo saved to: ${filepath}`);

        // Feedback removed - no display on this device

      } catch (error) {
        console.error('Error:', error);
      }
    });
  }

  protected async onStop(sessionId: string, userId: string, reason: string): Promise<void> {
    console.log(`Session stopped for user ${userId}`);
  }
}

const app = new SimpleCameraApp();
app.start().then(() => {
  console.log(`Server running on port ${PORT}`);
}).catch((error) => {
  console.error('Failed to start:', error);
});