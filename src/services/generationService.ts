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
    console.log('GenerationService: Service will continue running across page navigation');
    
    // Cancel any existing generation
    if (this.controller) {
      console.log('GenerationService: Cancelling existing generation');
      this.controller.abort();
    }

    // Create new abort controller for this generation
    this.controller = new AbortController();

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

  // Use Gemini API with web scraping for free, real resources
  this.performGeminiGeneration(requestData);
  }

  // Gemini API with web scraping for free, real resources
  private async performGeminiGeneration(requestData: any) {
    try {
      console.log('GenerationService: Starting Gemini generation...');
      
      // Check if generation was aborted
      if (this.controller?.signal.aborted) {
        console.log('GenerationService: Generation was aborted before starting');
        return;
      }
      
      this.statusMessage = "Initializing roadmap generation...";
      this.progress = 5;
      this.notify();

      // Import the Gemini generator
      const { generateRoadmapWithGemini } = await import('@/lib/geminiRoadmapGenerator');
      
      // Check if generation was aborted
      if (this.controller?.signal.aborted) {
        console.log('GenerationService: Generation was aborted during import');
        return;
      }
      
      this.statusMessage = "Generating roadmap structure...";
      this.progress = 10;
      this.notify();

      // Generate roadmap with Gemini and web scraping
      const result = await generateRoadmapWithGemini(requestData, (progress, message) => {
        // Check if generation was aborted during progress updates
        if (this.controller?.signal.aborted) {
          console.log('GenerationService: Generation was aborted during progress update');
          return;
        }
        this.progress = progress;
        this.statusMessage = message;
        this.notify();
      }, this.controller?.signal);
      
      // Check if generation was aborted after completion
      if (this.controller?.signal.aborted) {
        console.log('GenerationService: Generation was aborted after completion');
        return;
      }
      
      this.statusMessage = "Creating daily learning topics...";
      this.progress = 20;
      this.notify();

      // Simulate progress during topic creation
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Check if generation was aborted
      if (this.controller?.signal.aborted) {
        console.log('GenerationService: Generation was aborted during topic creation');
        return;
      }
      
      this.statusMessage = "Generating AI content...";
      this.progress = 40;
      this.notify();

      // Simulate progress during AI content generation
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Check if generation was aborted
      if (this.controller?.signal.aborted) {
        console.log('GenerationService: Generation was aborted during AI content generation');
        return;
      }
      
      this.statusMessage = "Scraping real resources...";
      this.progress = 60;
      this.notify();

      // Simulate progress during resource scraping
      await new Promise(resolve => setTimeout(resolve, 1200));
      
      // Check if generation was aborted
      if (this.controller?.signal.aborted) {
        console.log('GenerationService: Generation was aborted during resource scraping');
        return;
      }
      
      this.statusMessage = "Generating practice exercises...";
      this.progress = 75;
      this.notify();

      // Simulate progress during practice generation
      await new Promise(resolve => setTimeout(resolve, 600));
      
      // Check if generation was aborted
      if (this.controller?.signal.aborted) {
        console.log('GenerationService: Generation was aborted during practice generation');
        return;
      }
      
      this.statusMessage = "Creating quiz questions...";
      this.progress = 85;
      this.notify();

      // Simulate progress during quiz generation
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Check if generation was aborted
      if (this.controller?.signal.aborted) {
        console.log('GenerationService: Generation was aborted during quiz generation');
        return;
      }
      
      this.statusMessage = "Finalizing roadmap...";
      this.progress = 95;
      this.notify();

      // Simulate final processing
      await new Promise(resolve => setTimeout(resolve, 300));

      this.data = result;
      this.statusMessage = "Complete!";
      this.progress = 100;
      this.isGenerating = false;
      this.goalName = result?.goal || '';
      console.log('GenerationService: Gemini generation completed successfully');
      this.notify();
      
    } catch (e: any) {
      // Check if the error is due to abortion
      if (e.name === 'AbortError' || e.message?.includes('aborted')) {
        console.log('GenerationService: Generation was aborted by user');
        this.isGenerating = false;
        this.statusMessage = "Generation cancelled";
        this.error = null; // Don't show error for user cancellation
        this.notify();
        return;
      }
      
      console.error('GenerationService: Gemini generation failed:', e);
      this.error = e?.message || "Generation failed";
      this.isGenerating = false;
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
