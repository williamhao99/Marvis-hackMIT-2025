import { createCanvas, Canvas, CanvasRenderingContext2D, registerFont } from 'canvas';
import Jimp from 'jimp';
import { InstructionStep } from '../services/instruction-retrieval';
import { Logger } from '../utils/logger';
import { EventEmitter } from 'events';

export interface DisplayConfig {
  width: number;
  height: number;
  isMonochrome: boolean;
  fontSize?: number;
  fontFamily?: string;
  padding?: number;
  lineHeight?: number;
}

export interface DisplayContent {
  type: 'text' | 'instruction' | 'overlay' | 'progress';
  title?: string;
  content: string;
  step?: InstructionStep;
  progress?: {
    current: number;
    total: number;
  };
  overlay?: {
    arrows?: Array<{
      startX: number;
      startY: number;
      endX: number;
      endY: number;
    }>;
    highlights?: Array<{
      x: number;
      y: number;
      width: number;
      height: number;
    }>;
  };
}

export class DisplayRenderer extends EventEmitter {
  private config: DisplayConfig;
  private logger: Logger;
  private canvas: Canvas;
  private ctx: CanvasRenderingContext2D;
  private currentContent: DisplayContent | null = null;

  constructor(config: DisplayConfig) {
    super();
    this.config = {
      width: config.width || 640,
      height: config.height || 200,
      isMonochrome: config.isMonochrome !== false,
      fontSize: config.fontSize || 14,
      fontFamily: config.fontFamily || 'Arial',
      padding: config.padding || 10,
      lineHeight: config.lineHeight || 1.5
    };

    this.logger = new Logger('DisplayRenderer');

    this.canvas = createCanvas(this.config.width, this.config.height);
    this.ctx = this.canvas.getContext('2d');

    this.setupCanvas();
  }

  private setupCanvas(): void {
    this.ctx.fillStyle = this.config.isMonochrome ? '#000000' : '#FFFFFF';
    this.ctx.fillRect(0, 0, this.config.width, this.config.height);

    this.ctx.font = `${this.config.fontSize}px ${this.config.fontFamily}`;
    this.ctx.textBaseline = 'top';
  }

  async renderContent(content: DisplayContent): Promise<Buffer> {
    this.currentContent = content;

    this.clearCanvas();

    switch (content.type) {
      case 'text':
        this.renderText(content);
        break;
      case 'instruction':
        await this.renderInstruction(content);
        break;
      case 'overlay':
        await this.renderOverlay(content);
        break;
      case 'progress':
        this.renderProgress(content);
        break;
    }

    const buffer = this.canvas.toBuffer('image/png');

    if (this.config.isMonochrome) {
      return await this.convertToMonochrome(buffer);
    }

    return buffer;
  }

  private clearCanvas(): void {
    this.ctx.fillStyle = this.config.isMonochrome ? '#FFFFFF' : '#000000';
    this.ctx.fillRect(0, 0, this.config.width, this.config.height);
  }

  private renderText(content: DisplayContent): void {
    const padding = this.config.padding!;
    const maxWidth = this.config.width - (padding * 2);

    this.ctx.fillStyle = this.config.isMonochrome ? '#000000' : '#FFFFFF';

    if (content.title) {
      this.ctx.font = `bold ${this.config.fontSize! + 2}px ${this.config.fontFamily}`;
      this.ctx.fillText(content.title, padding, padding);

      const titleHeight = (this.config.fontSize! + 2) * this.config.lineHeight!;
      this.ctx.font = `${this.config.fontSize}px ${this.config.fontFamily}`;

      this.wrapText(
        content.content,
        padding,
        padding + titleHeight,
        maxWidth,
        this.config.fontSize! * this.config.lineHeight!
      );
    } else {
      this.wrapText(
        content.content,
        padding,
        padding,
        maxWidth,
        this.config.fontSize! * this.config.lineHeight!
      );
    }
  }

  private async renderInstruction(content: DisplayContent): Promise<void> {
    if (!content.step) {
      this.renderText(content);
      return;
    }

    const step = content.step;
    const padding = this.config.padding!;
    const topSection = this.config.height * 0.3;
    const mainSection = this.config.height * 0.5;
    const bottomSection = this.config.height * 0.2;

    this.ctx.fillStyle = this.config.isMonochrome ? '#000000' : '#FFFFFF';

    this.ctx.font = `bold ${this.config.fontSize! + 2}px ${this.config.fontFamily}`;
    const stepTitle = `Step ${step.stepNumber}${step.title ? ': ' + step.title : ''}`;
    this.ctx.fillText(stepTitle, padding, padding);

    this.ctx.font = `${this.config.fontSize}px ${this.config.fontFamily}`;
    const descriptionY = padding + (this.config.fontSize! + 2) * this.config.lineHeight!;
    this.wrapText(
      step.description,
      padding,
      descriptionY,
      this.config.width - (padding * 2),
      this.config.fontSize! * this.config.lineHeight!
    );

    if (step.parts && step.parts.length > 0) {
      const partsY = this.config.height - bottomSection;
      this.ctx.font = `${this.config.fontSize! - 2}px ${this.config.fontFamily}`;
      this.ctx.fillStyle = this.config.isMonochrome ? '#555555' : '#CCCCCC';

      const partsText = 'Parts: ' + step.parts.slice(0, 3).join(', ');
      this.ctx.fillText(partsText, padding, partsY);
    }

    if (step.warnings && step.warnings.length > 0) {
      const warningY = this.config.height - (bottomSection / 2);
      this.ctx.font = `bold ${this.config.fontSize! - 1}px ${this.config.fontFamily}`;
      this.ctx.fillStyle = this.config.isMonochrome ? '#000000' : '#FF0000';

      this.ctx.fillText('⚠ ' + step.warnings[0], padding, warningY);
    }

    if (content.progress) {
      this.renderProgressBar(
        this.config.width - 100,
        padding,
        80,
        10,
        content.progress.current,
        content.progress.total
      );
    }
  }

  private async renderOverlay(content: DisplayContent): Promise<void> {
    this.renderText(content);

    if (!content.overlay) return;

    this.ctx.strokeStyle = this.config.isMonochrome ? '#000000' : '#00FF00';
    this.ctx.lineWidth = 2;

    if (content.overlay.arrows) {
      for (const arrow of content.overlay.arrows) {
        this.drawArrow(arrow.startX, arrow.startY, arrow.endX, arrow.endY);
      }
    }

    if (content.overlay.highlights) {
      this.ctx.strokeStyle = this.config.isMonochrome ? '#000000' : '#FFFF00';
      this.ctx.setLineDash([5, 5]);

      for (const highlight of content.overlay.highlights) {
        this.ctx.strokeRect(highlight.x, highlight.y, highlight.width, highlight.height);
      }

      this.ctx.setLineDash([]);
    }
  }

  private renderProgress(content: DisplayContent): void {
    const padding = this.config.padding!;
    const centerY = this.config.height / 2;

    this.ctx.fillStyle = this.config.isMonochrome ? '#000000' : '#FFFFFF';
    this.ctx.font = `bold ${this.config.fontSize! + 4}px ${this.config.fontFamily}`;

    const titleText = content.title || 'Progress';
    const titleWidth = this.ctx.measureText(titleText).width;
    this.ctx.fillText(titleText, (this.config.width - titleWidth) / 2, padding * 2);

    if (content.progress) {
      const barWidth = this.config.width - (padding * 4);
      const barHeight = 30;
      const barX = padding * 2;
      const barY = centerY - (barHeight / 2);

      this.renderProgressBar(
        barX,
        barY,
        barWidth,
        barHeight,
        content.progress.current,
        content.progress.total
      );

      this.ctx.font = `${this.config.fontSize}px ${this.config.fontFamily}`;
      const progressText = `${content.progress.current} of ${content.progress.total} steps completed`;
      const textWidth = this.ctx.measureText(progressText).width;
      this.ctx.fillText(
        progressText,
        (this.config.width - textWidth) / 2,
        barY + barHeight + padding
      );
    }

    if (content.content) {
      this.ctx.font = `${this.config.fontSize! - 1}px ${this.config.fontFamily}`;
      const contentY = this.config.height - (padding * 3) - this.config.fontSize!;
      this.wrapText(
        content.content,
        padding,
        contentY,
        this.config.width - (padding * 2),
        this.config.fontSize!
      );
    }
  }

  private renderProgressBar(
    x: number,
    y: number,
    width: number,
    height: number,
    current: number,
    total: number
  ): void {
    const progress = Math.min(current / total, 1);

    this.ctx.strokeStyle = this.config.isMonochrome ? '#000000' : '#FFFFFF';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(x, y, width, height);

    this.ctx.fillStyle = this.config.isMonochrome ? '#000000' : '#00FF00';
    this.ctx.fillRect(x + 2, y + 2, (width - 4) * progress, height - 4);

    this.ctx.fillStyle = this.config.isMonochrome ? '#FFFFFF' : '#000000';
    this.ctx.font = `bold ${height * 0.6}px ${this.config.fontFamily}`;
    const percentText = `${Math.round(progress * 100)}%`;
    const textWidth = this.ctx.measureText(percentText).width;
    this.ctx.fillText(
      percentText,
      x + (width - textWidth) / 2,
      y + (height - (height * 0.6)) / 2
    );
  }

  private drawArrow(startX: number, startY: number, endX: number, endY: number): void {
    const headLength = 10;
    const angle = Math.atan2(endY - startY, endX - startX);

    this.ctx.beginPath();
    this.ctx.moveTo(startX, startY);
    this.ctx.lineTo(endX, endY);
    this.ctx.stroke();

    this.ctx.beginPath();
    this.ctx.moveTo(endX, endY);
    this.ctx.lineTo(
      endX - headLength * Math.cos(angle - Math.PI / 6),
      endY - headLength * Math.sin(angle - Math.PI / 6)
    );
    this.ctx.moveTo(endX, endY);
    this.ctx.lineTo(
      endX - headLength * Math.cos(angle + Math.PI / 6),
      endY - headLength * Math.sin(angle + Math.PI / 6)
    );
    this.ctx.stroke();
  }

  private wrapText(
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number
  ): void {
    const words = text.split(' ');
    let line = '';
    let currentY = y;

    for (const word of words) {
      const testLine = line + word + ' ';
      const metrics = this.ctx.measureText(testLine);

      if (metrics.width > maxWidth && line !== '') {
        this.ctx.fillText(line.trim(), x, currentY);
        line = word + ' ';
        currentY += lineHeight;

        if (currentY + lineHeight > this.config.height - this.config.padding!) {
          break;
        }
      } else {
        line = testLine;
      }
    }

    if (line && currentY + lineHeight <= this.config.height - this.config.padding!) {
      this.ctx.fillText(line.trim(), x, currentY);
    }
  }

  private async convertToMonochrome(buffer: Buffer): Promise<Buffer> {
    const image = await Jimp.read(buffer);

    image.greyscale();

    image.scan(0, 0, image.bitmap.width, image.bitmap.height, (x, y, idx) => {
      const gray = image.bitmap.data[idx];
      const value = gray > 128 ? 255 : 0;

      image.bitmap.data[idx] = value;
      image.bitmap.data[idx + 1] = value;
      image.bitmap.data[idx + 2] = value;
    });

    return await image.getBufferAsync(Jimp.MIME_PNG);
  }

  async generateInstructionSequence(steps: InstructionStep[]): Promise<Buffer[]> {
    const images: Buffer[] = [];

    for (let i = 0; i < steps.length; i++) {
      const content: DisplayContent = {
        type: 'instruction',
        step: steps[i],
        content: steps[i].description,
        progress: {
          current: i + 1,
          total: steps.length
        }
      };

      const image = await this.renderContent(content);
      images.push(image);
    }

    return images;
  }

  getCurrentContent(): DisplayContent | null {
    return this.currentContent;
  }

  getCanvasDimensions(): { width: number; height: number } {
    return {
      width: this.config.width,
      height: this.config.height
    };
  }
}