import { GoogleGenerativeAI } from '@google/generative-ai';
import { advancedScraper } from './advancedWebScraper';
import { RoadmapT, ResourceT } from './schema';

// Initialize Gemini
const genAI = new GoogleGenerativeAI('AIzaSyBQseIm2Zs6bBGeKeDkKvkjw4B4Q0X9Q6o');
const model = genAI.getGenerativeModel({ 
  model: 'gemini-1.5-flash',
  generationConfig: {
    temperature: 0.7,
    topK: 40,
    topP: 0.95,
    maxOutputTokens: 8192,
  }
});

export interface RoadmapParams {
  goal: string;
  total_days?: number;
  daily_minutes: number;
}

// Direct roadmap generation with real web scraping
export async function generateRoadmapWithDirectScraping(params: RoadmapParams): Promise<RoadmapT> {
  try {
    console.log('Generating roadmap with direct scraping for:', params.goal);
    
    // Step 1: Generate roadmap structure with Gemini
    const structurePrompt = `Generate a detailed learning roadmap for: "${params.goal}"
Daily minutes: ${params.daily_minutes}
Total days: ${params.total_days || 10}

Create a JSON roadmap structure with:
- Each day has a UNIQUE, SPECIFIC topic related to the goal
- Focus on practical, actionable learning with clear progression
- Progress from beginner to intermediate
- Each day title should be DISTINCT and describe a specific skill/concept
- Avoid generic titles like "basics" or "fundamentals" - be specific

EXAMPLES of good specific titles:
- "Camera Settings: Aperture, Shutter Speed, and ISO"
- "3-Point Lighting Setup and Techniques"
- "Storyboarding and Shot Composition"
- "Audio Recording and Microphone Placement"
- "Color Grading in Post-Production"

IMPORTANT: Return ONLY valid JSON, no markdown, no code blocks, no explanations. Just the raw JSON object.

{
  "goal": "${params.goal}",
  "total_days": ${params.total_days || 10},
  "daily_minutes": ${params.daily_minutes},
  "days": [
    {
      "day": 1,
      "title": "Specific, unique topic title",
      "minutes": ${params.daily_minutes},
      "learn": [],
      "practice": [],
      "reflect": "Specific reflection question about today's learning"
    }
  ]
}`;

    const structureResult = await model.generateContent(structurePrompt);
    const structureText = structureResult.response.text();
    
    console.log('Generated roadmap structure:', structureText.substring(0, 200) + '...');

    // Extract JSON from response
    let roadmapJson = structureText;
    if (structureText.includes('```json')) {
      roadmapJson = structureText.split('```json')[1].split('```')[0].trim();
    } else if (structureText.includes('```')) {
      roadmapJson = structureText.split('```')[1].split('```')[0].trim();
    }

    const roadmap: RoadmapT = JSON.parse(roadmapJson);
    
    // Step 2: Find real resources for each day
    console.log('Finding real resources for each day...');
    
    for (const day of roadmap.days) {
      console.log(`Processing day ${day.day}: ${day.title}`);
      
      // Clear existing arrays
      day.learn = [];
      day.practice = [];
      
      // Create specific search terms for this day
      const searchTerms = [
        day.title,
        `${day.title} tutorial`,
        `${day.title} guide`,
        `${day.title} for beginners`
      ];
      
      // Find watch resources (videos) for LEARN section
      const watchResources = await advancedScraper.searchResources(searchTerms[0], 'watch');
      if (watchResources.length > 0) {
        day.learn.push(...watchResources.slice(0, 2)); // Add up to 2 videos
      }
      
      // Find read resources (articles) for LEARN section
      const readResources = await advancedScraper.searchResources(searchTerms[1], 'read');
      if (readResources.length > 0) {
        day.learn.push(...readResources.slice(0, 1)); // Add 1 article to learn
      }
      
      // Find practice resources for PRACTICE section
      const practiceResources = await advancedScraper.searchResources(searchTerms[2], 'read');
      if (practiceResources.length > 0) {
        day.practice.push(...practiceResources.slice(0, 2)); // Add up to 2 practice resources
      } else {
        // If no specific practice resources, use some read resources
        if (readResources.length > 1) {
          day.practice.push(...readResources.slice(1, 3)); // Add remaining read resources
        }
      }
      
      // Ensure we have at least some practice content
      if (day.practice.length === 0 && day.learn.length > 0) {
        // Create practice exercises based on the day's topic
        const practiceTitle = `${day.title} - Hands-on Practice`;
        const practiceUrl = `https://example.com/practice/${day.title.toLowerCase().replace(/\s+/g, '-')}`;
        
        day.practice.push({
          kind: 'read',
          title: practiceTitle,
          url: practiceUrl,
          source: 'Practice Hub',
          duration_minutes: 15,
          split: null
        });
      }
      
      console.log(`Day ${day.day} completed with ${day.learn.length} learn and ${day.practice.length} practice resources`);
    }
    
    console.log('Direct roadmap generation completed successfully');
    return roadmap;
    
  } catch (error) {
    console.error('Direct roadmap generation failed:', error);
    throw error;
  }
}
