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

  // Subscribe to state changes
  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // Notify all listeners of state changes
  private notify() {
    this.listeners.forEach(listener => listener());
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
    // Cancel any existing generation
    if (this.controller) {
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

    try {
      this.controller = new AbortController();

      const res = await fetch("/api/generate/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestData),
        signal: this.controller.signal,
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`HTTP ${res.status}: ${res.statusText} - ${errorText}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");

      let buffer = "";
      let result: any = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += new TextDecoder().decode(value);
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.trim() === "") continue;
          try {
            const parsed = JSON.parse(line);
            if (parsed.type === "progress") {
              this.progress = parsed.percent || 0;
              this.statusMessage = parsed.message || "Processing...";
              this.notify();
            } else if (parsed.type === "result") {
              result = parsed.data;
            } else if (parsed.type === "error") {
              throw new Error(parsed.message);
            }
          } catch (e) {
            console.warn("Failed to parse line:", line, e);
          }
        }
      }

      this.data = result;
      this.statusMessage = "Complete!";
      this.isGenerating = false;
      this.goalName = result?.title || '';
      this.notify();
      
    } catch (e: any) {
      if (e.name === 'AbortError') {
        console.log('Generation was cancelled');
        this.isGenerating = false;
        this.statusMessage = "Generation cancelled";
      } else {
        this.error = e?.message || "Generation failed";
        this.isGenerating = false;
      }
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
}

// Create singleton instance
export const generationService = new GenerationService();
