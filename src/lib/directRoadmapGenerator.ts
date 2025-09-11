import { GoogleGenerativeAI } from '@google/generative-ai';
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
      
      // Find watch resources (videos) for LEARN section using server-side API with retry
      let watchAttempts = 0;
      const maxWatchAttempts = 3;
      while (day.learn.length < 2 && watchAttempts < maxWatchAttempts) {
        try {
          const watchResponse = await fetch(`/api/scrape-resources?q=${encodeURIComponent(searchTerms[0])}&type=watch`);
          if (watchResponse.ok) {
            const watchData = await watchResponse.json();
            if (watchData.resources && watchData.resources.length > 0) {
              day.learn.push(...watchData.resources.slice(0, 2)); // Add up to 2 videos
              break;
            }
          }
        } catch (error) {
          console.error(`Watch resources attempt ${watchAttempts + 1} failed:`, error);
        }
        watchAttempts++;
        if (watchAttempts < maxWatchAttempts) {
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
        }
      }
      
      // Find read resources (articles) for LEARN section using server-side API with retry
      let readAttempts = 0;
      const maxReadAttempts = 3;
      while (day.learn.length < 3 && readAttempts < maxReadAttempts) {
        try {
          const readResponse = await fetch(`/api/scrape-resources?q=${encodeURIComponent(searchTerms[1])}&type=read`);
          if (readResponse.ok) {
            const readData = await readResponse.json();
            if (readData.resources && readData.resources.length > 0) {
              day.learn.push(...readData.resources.slice(0, 1)); // Add 1 article to learn
              break;
            }
          }
        } catch (error) {
          console.error(`Read resources attempt ${readAttempts + 1} failed:`, error);
        }
        readAttempts++;
        if (readAttempts < maxReadAttempts) {
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
        }
      }
      
      // Find practice resources for PRACTICE section using server-side API with retry
      let practiceAttempts = 0;
      const maxPracticeAttempts = 3;
      while (day.practice.length < 2 && practiceAttempts < maxPracticeAttempts) {
        try {
          const practiceResponse = await fetch(`/api/scrape-resources?q=${encodeURIComponent(searchTerms[2])}&type=read`);
          if (practiceResponse.ok) {
            const practiceData = await practiceResponse.json();
            if (practiceData.resources && practiceData.resources.length > 0) {
              day.practice.push(...practiceData.resources.slice(0, 2)); // Add up to 2 practice resources
              break;
            }
          }
        } catch (error) {
          console.error(`Practice resources attempt ${practiceAttempts + 1} failed:`, error);
        }
        practiceAttempts++;
        if (practiceAttempts < maxPracticeAttempts) {
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
        }
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
