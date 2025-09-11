import { RoadmapT } from './schema';
import { geminiFunctionCalling } from './geminiFunctionCalling';

export interface RoadmapParams {
  goal: string;
  total_days?: number;
  daily_minutes: number;
}

// Advanced roadmap generation using Gemini function calling and robust web scraping
export async function generateRoadmapWithGemini(params: RoadmapParams): Promise<RoadmapT> {
  try {
    console.log('Generating roadmap with advanced Gemini function calling for:', params.goal);
    
    // Use the new function calling system
    const roadmap = await geminiFunctionCalling.generateRoadmapWithFunctionCalling(
      params.goal,
      params.total_days || 10,
      params.daily_minutes
    );
    
    console.log('Advanced roadmap generation completed successfully');
    return roadmap;
    
  } catch (error) {
    console.error('Advanced roadmap generation failed:', error);
    throw error;
  }
}