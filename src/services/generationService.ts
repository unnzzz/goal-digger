// Generation service that persists across page navigation
class GenerationService {
  private controller: AbortController | null = null;
  private isGenerating = false;
  private progress = 0;
  private statusMessage = '';
  private data: any = null;
  private error: string | null = null;
  private goal = '';
  private dailyMinutes = 30;
  private totalDays = 10;
  private goalName = '';
  
  private listeners: Set<() => void> = new Set();
  private isDestroyed = false;
  private jobId: string | null = null;

  // Subscribe to state changes
  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // Notify all listeners of state changes
  private notify() {
    if (this.isDestroyed) return;
    this.listeners.forEach(listener => {
      try {
        listener();
      } catch (error) {
        console.error('Error in generation service listener:', error);
      }
    });
  }

  // Get current state
  getState() {
    return {
      isGenerating: this.isGenerating,
      progress: this.progress,
      statusMessage: this.statusMessage,
      data: this.data,
      error: this.error,
      goal: this.goal,
      dailyMinutes: this.dailyMinutes,
      totalDays: this.totalDays,
      goalName: this.goalName,
    };
  }

  // Start generation
  async startGeneration(goal: string, dailyMinutes: number, totalDays: number) {
    console.log('GenerationService: Starting generation for goal:', goal);
    
    // Cancel any existing generation
    if (this.controller) {
      console.log('GenerationService: Cancelling existing generation');
      this.controller.abort();
    }

    this.isGenerating = true;
    this.progress = 0;
    this.statusMessage = "Starting generation...";
    this.data = null;
    this.error = null;
    this.goal = goal;
    this.dailyMinutes = dailyMinutes;
    this.totalDays = totalDays;
    this.goalName = '';
    this.notify();

    const requestData = {
      goal,
      daily_minutes: dailyMinutes,
      total_days: totalDays,
    };

  // Use server-side job approach for true persistence
  this.performServerSideGeneration(requestData);
  }

  // Server-side job approach for true persistence
  private async performServerSideGeneration(requestData: any) {
    try {
      console.log('GenerationService: Starting server-side generation...');

      // Start the generation job
      const startResponse = await fetch('/api/generate/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
      });

      if (!startResponse.ok) {
        const errorText = await startResponse.text();
        throw new Error(`Failed to start generation: ${startResponse.statusText} - ${errorText}`);
      }

      const { jobId } = await startResponse.json();
      console.log('GenerationService: Job started with ID:', jobId);

      // Store job ID for persistence
      this.jobId = jobId;

      // Poll for status updates
      const pollInterval = setInterval(async () => {
        try {
          const statusResponse = await fetch(`/api/generate/status?jobId=${jobId}`);
          
          if (!statusResponse.ok) {
            throw new Error(`Failed to get status: ${statusResponse.statusText}`);
          }

          const status = await statusResponse.json();
          console.log('GenerationService: Status update:', status);

          this.progress = status.progress || 0;
          this.statusMessage = status.message || 'Processing...';

          if (status.status === 'completed') {
            console.log('GenerationService: Generation completed successfully');
            this.data = status.result;
            this.statusMessage = "Complete!";
            this.isGenerating = false;
            this.goalName = status.result?.title || '';
            this.jobId = null;
            this.notify();
            clearInterval(pollInterval);
          } else if (status.status === 'failed') {
            console.error('GenerationService: Generation failed:', status.error);
            this.error = status.error || 'Generation failed';
            this.isGenerating = false;
            this.jobId = null;
            this.notify();
            clearInterval(pollInterval);
          } else {
            // Still running, update progress
            this.notify();
          }
        } catch (error) {
          console.error('GenerationService: Polling error:', error);
          this.error = 'Failed to check generation status';
          this.isGenerating = false;
          this.jobId = null;
          this.notify();
          clearInterval(pollInterval);
        }
      }, 2000); // Poll every 2 seconds

      // Store the interval for potential cancellation
      this.controller = {
        abort: () => {
          clearInterval(pollInterval);
          this.isGenerating = false;
          this.statusMessage = "Generation cancelled";
          this.jobId = null;
          this.notify();
        }
      } as any;

    } catch (e: any) {
      console.error('GenerationService: Generation failed:', e);
      this.error = e?.message || "Generation failed";
      this.isGenerating = false;
      this.jobId = null;
      this.notify();
    }
  }

  // Stop generation
  stopGeneration() {
    if (this.controller) {
      this.controller.abort();
      this.controller = null;
    }
    
    this.isGenerating = false;
    this.statusMessage = "Generation stopped";
    this.notify();
  }

  // Clear generation data
  clearGeneration() {
    this.isGenerating = false;
    this.progress = 0;
    this.statusMessage = '';
    this.data = null;
    this.error = null;
    this.goal = '';
    this.dailyMinutes = 30;
    this.totalDays = 10;
    this.goalName = '';
    this.notify();
  }

  // Set goal name
  setGoalName(name: string) {
    this.goalName = name;
    this.notify();
  }

  // Set data (for loading saved goals)
  setData(data: any) {
    this.data = data;
    this.isGenerating = false;
    this.error = null;
    this.notify();
  }

  // Check if service is still active
  isActive() {
    return !this.isDestroyed;
  }

  // Destroy the service (cleanup)
  destroy() {
    this.isDestroyed = true;
    if (this.controller) {
      this.controller.abort();
      this.controller = null;
    }
    this.listeners.clear();
  }
}

// Create singleton instance - ensure it persists across module reloads
let generationServiceInstance: GenerationService | null = null;

function getGenerationService(): GenerationService {
  if (!generationServiceInstance) {
    console.log('Creating new GenerationService instance');
    generationServiceInstance = new GenerationService();
  } else {
    console.log('Using existing GenerationService instance, current state:', generationServiceInstance.getState());
  }
  return generationServiceInstance;
}

export const generationService = getGenerationService();

// Store the service globally to prevent garbage collection
if (typeof window !== 'undefined') {
  (window as any).generationService = generationService;
}
