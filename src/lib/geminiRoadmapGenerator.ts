import { RoadmapT } from './schema';
import { generateRoadmapWithDirectScraping } from './directRoadmapGenerator';

export interface RoadmapParams {
  goal: string;
  total_days?: number;
  daily_minutes: number;
}

// Direct roadmap generation with real web scraping
export async function generateRoadmapWithGemini(params: RoadmapParams): Promise<RoadmapT> {
  try {
    console.log('Generating roadmap with direct scraping for:', params.goal);
    
    // Use the direct scraping approach
    const roadmap = await generateRoadmapWithDirectScraping(params);
    
    console.log('Direct roadmap generation completed successfully');
    return roadmap;
    
  } catch (error) {
    console.error('Direct roadmap generation failed:', error);
    throw error;
  }
}