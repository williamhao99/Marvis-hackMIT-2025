import { UserSession, InstructionManual, InstructionStep } from './types';

export class SessionManager {
  private sessions = new Map<string, UserSession>();

  createSession(userId: string): UserSession {
    const session: UserSession = {
      userId,
      currentStep: 0,
      startTime: new Date(),
      completedSteps: [],
      sessionNotes: []
    };

    this.sessions.set(userId, session);
    return session;
  }

  getSession(userId: string): UserSession | null {
    return this.sessions.get(userId) || null;
  }

  setCurrentManual(userId: string, manual: InstructionManual): UserSession | null {
    const session = this.getSession(userId) || this.createSession(userId);
    session.currentManual = manual;
    session.currentStep = 1;
    session.completedSteps = [];
    session.sessionNotes.push(`Started ${manual.type} for ${manual.deviceName}`);

    this.sessions.set(userId, session);
    return session;
  }

  moveToStep(userId: string, stepNumber: number): UserSession | null {
    const session = this.getSession(userId);
    if (!session || !session.currentManual) return null;

    if (stepNumber < 1 || stepNumber > session.currentManual.totalSteps) {
      return null;
    }

    session.currentStep = stepNumber;
    this.sessions.set(userId, session);
    return session;
  }

  nextStep(userId: string): UserSession | null {
    const session = this.getSession(userId);
    if (!session || !session.currentManual) return null;

    if (session.currentStep < session.currentManual.totalSteps) {
      session.currentStep++;
      this.sessions.set(userId, session);
    }

    return session;
  }

  previousStep(userId: string): UserSession | null {
    const session = this.getSession(userId);
    if (!session || !session.currentManual) return null;

    if (session.currentStep > 1) {
      session.currentStep--;
      this.sessions.set(userId, session);
    }

    return session;
  }

  completeStep(userId: string, stepNumber?: number): UserSession | null {
    const session = this.getSession(userId);
    if (!session) return null;

    const completedStep = stepNumber || session.currentStep;

    if (!session.completedSteps.includes(completedStep)) {
      session.completedSteps.push(completedStep);
      session.sessionNotes.push(`Completed step ${completedStep}`);
    }

    this.sessions.set(userId, session);
    return session;
  }

  addNote(userId: string, note: string): UserSession | null {
    const session = this.getSession(userId);
    if (!session) return null;

    session.sessionNotes.push(`${new Date().toLocaleTimeString()}: ${note}`);
    this.sessions.set(userId, session);
    return session;
  }

  getCurrentStep(userId: string): InstructionStep | null {
    const session = this.getSession(userId);
    if (!session || !session.currentManual) return null;

    return session.currentManual.steps.find(step => step.stepNumber === session.currentStep) || null;
  }

  getProgress(userId: string): { current: number; total: number; percentage: number; completed: number[] } | null {
    const session = this.getSession(userId);
    if (!session || !session.currentManual) return null;

    const total = session.currentManual.totalSteps;
    const completed = session.completedSteps.length;
    const percentage = Math.round((completed / total) * 100);

    return {
      current: session.currentStep,
      total,
      percentage,
      completed: session.completedSteps
    };
  }

  endSession(userId: string): void {
    const session = this.getSession(userId);
    if (session) {
      session.sessionNotes.push(`Session ended at ${new Date().toLocaleTimeString()}`);

      setTimeout(() => {
        this.sessions.delete(userId);
      }, 300000);
    }
  }

  getAllSessions(): UserSession[] {
    return Array.from(this.sessions.values());
  }
}