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

    // Use a more robust approach with keepalive and no signal
    this.performGeneration(requestData);
  }

  // Separate method for the actual generation to avoid cancellation
  private async performGeneration(requestData: any) {
    try {
      console.log('GenerationService: Making API request...');

      // Use a more robust approach - create a new XMLHttpRequest that persists
      const xhr = new XMLHttpRequest();
      
      return new Promise<void>((resolve, reject) => {
        xhr.open('POST', '/api/generate/stream', true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        
        let buffer = '';
        let result: any = null;

        xhr.onreadystatechange = () => {
          if (xhr.readyState === 4) {
            if (xhr.status === 200) {
              console.log('GenerationService: Generation completed successfully');
              this.data = result;
              this.statusMessage = "Complete!";
              this.isGenerating = false;
              this.goalName = result?.title || '';
              this.notify();
              resolve();
            } else {
              console.error('GenerationService: Generation failed with status:', xhr.status);
              this.error = `HTTP ${xhr.status}: ${xhr.statusText}`;
              this.isGenerating = false;
              this.notify();
              reject(new Error(`HTTP ${xhr.status}: ${xhr.statusText}`));
            }
          }
        };

        xhr.onprogress = (event) => {
          if (xhr.responseText) {
            const newData = xhr.responseText.slice(buffer.length);
            buffer += newData;
            
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            
            for (const line of lines) {
              if (line.trim() === '') continue;
              try {
                const parsed = JSON.parse(line);
                if (parsed.type === 'progress') {
                  this.progress = parsed.percent || 0;
                  this.statusMessage = parsed.message || 'Processing...';
                  console.log('GenerationService: Progress update:', this.progress + '%');
                  this.notify();
                } else if (parsed.type === 'result') {
                  result = parsed.data;
                  console.log('GenerationService: Result received');
                } else if (parsed.type === 'error') {
                  throw new Error(parsed.message);
                }
              } catch (e) {
                console.warn('Failed to parse line:', line, e);
              }
            }
          }
        };

        xhr.onerror = () => {
          console.error('GenerationService: Network error');
          this.error = 'Network error';
          this.isGenerating = false;
          this.notify();
          reject(new Error('Network error'));
        };

        xhr.send(JSON.stringify(requestData));
        
        // Store the xhr for potential cancellation
        this.controller = {
          abort: () => {
            xhr.abort();
            this.isGenerating = false;
            this.statusMessage = "Generation cancelled";
            this.notify();
          }
        } as any;
      });
      
    } catch (e: any) {
      console.error('GenerationService: Generation failed:', e);
      this.error = e?.message || "Generation failed";
      this.isGenerating = false;
      this.notify();
    } finally {
      this.controller = null;
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

export const generationService = (() => {
  if (!generationServiceInstance) {
    console.log('Creating new GenerationService instance');
    generationServiceInstance = new GenerationService();
  } else {
    console.log('Using existing GenerationService instance');
  }
  return generationServiceInstance;
})();
