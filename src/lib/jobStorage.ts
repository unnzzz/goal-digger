// Shared job storage for generation jobs
// In production, use Redis or database instead of in-memory storage

export interface GenerationJob {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  message: string;
  result?: any;
  error?: string;
  createdAt: Date;
}

export const generationJobs = new Map<string, GenerationJob>();
