import { RoadmapT } from './schema';
import { generateRoadmapWithDirectScraping } from './directRoadmapGenerator';

export interface RoadmapParams {
  goal: string;
  total_days?: number;
  daily_minutes: number;
}

// Direct roadmap generation with real web scraping
export async function generateRoadmapWithGemini(params: RoadmapParams, progressCallback?: (progress: number, message: string) => void, abortSignal?: AbortSignal): Promise<RoadmapT> {
  try {
    console.log('Generating roadmap with direct scraping for:', params.goal);
    
    // Check for abort signal
    if (abortSignal?.aborted) {
      throw new Error('Generation aborted');
    }
    
    // Update progress
    progressCallback?.(15, "Generating roadmap structure...");
    
    // Use the direct scraping approach
    const roadmap = await generateRoadmapWithDirectScraping({
      goal: params.goal,
      days: params.total_days || 30
    }, progressCallback);
    
    // Check for abort signal again
    if (abortSignal?.aborted) {
      throw new Error('Generation aborted');
    }
    
    // Update progress
    progressCallback?.(25, "Roadmap structure generated...");
    
    console.log('Direct roadmap generation completed successfully');
    return roadmap;
    
  } catch (error) {
    console.error('Direct roadmap generation failed:', error);
    throw error;
  }
}