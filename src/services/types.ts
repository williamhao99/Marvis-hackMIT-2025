export interface DeviceIdentification {
  name: string;
  category: string;
  model?: string;
  brand?: string;
  confidence: number;
  description: string;
}

export interface InstructionStep {
  stepNumber: number;
  title: string;
  description: string;
  imageUrl?: string;
  estimatedTime?: number;
  tools?: string[];
  warnings?: string[];
}

export interface InstructionManual {
  id: string;
  deviceName: string;
  deviceModel?: string;
  brand?: string;
  type: 'assembly' | 'repair' | 'maintenance';
  steps: InstructionStep[];
  totalSteps: number;
  estimatedTotalTime?: number;
  difficulty: 'easy' | 'medium' | 'hard';
  tools: string[];
  parts: string[];
}

export interface UserSession {
  userId: string;
  currentManual?: InstructionManual;
  currentStep: number;
  startTime: Date;
  completedSteps: number[];
  deviceImage?: Buffer;
  sessionNotes: string[];
}

export interface VisionServiceResponse {
  identifications: DeviceIdentification[];
  rawResponse: any;
}

export interface InstructionSearchResult {
  manual: InstructionManual;
  score: number;
  source: string;
}