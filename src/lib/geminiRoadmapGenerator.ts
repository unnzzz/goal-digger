import { GoogleGenerativeAI } from '@google/generative-ai';
import * as cheerio from 'cheerio';
import axios from 'axios';
import { RoadmapT, ResourceT, DayT } from './schema';

const genAI = new GoogleGenerativeAI('AIzaSyBQseIm2Zs6bBGeKeDkKvkjw4B4Q0X9Q6o');
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

export interface RoadmapParams {
  goal: string;
  total_days?: number;
  daily_minutes: number;
}

// Web scraping function to find real resources using server-side approach
async function findResourcesForTopic(topic: string, kind: 'watch' | 'read' | 'listen'): Promise<ResourceT[]> {
  const resources: ResourceT[] = [];
  
  try {
    console.log(`Searching for ${kind} resources: ${topic}`);
    
    // Use a server-side proxy to avoid CORS issues
    const searchQuery = encodeURIComponent(`${topic} ${kind === 'watch' ? 'tutorial video' : kind === 'read' ? 'guide tutorial' : 'podcast episode'}`);
    
    // Call our server-side scraping API
    const response = await fetch(`/api/scrape-resources?q=${searchQuery}&type=${kind}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.resources && Array.isArray(data.resources)) {
        resources.push(...data.resources.slice(0, 3)); // Limit to 3 resources
        console.log(`Found ${resources.length} real ${kind} resources for topic: ${topic}`);
      }
    } else {
      console.error(`Failed to fetch ${kind} resources:`, response.statusText);
    }
    
  } catch (error) {
    console.error(`Error finding ${kind} resources for ${topic}:`, error);
  }
  
  return resources;
}

// Generate roadmap using Gemini
export async function generateRoadmapWithGemini(params: RoadmapParams): Promise<RoadmapT> {
  try {
    console.log('Generating roadmap with Gemini for:', params.goal);
    
    // First, generate the roadmap structure with Gemini
    const structurePrompt = `Generate a learning roadmap for: "${params.goal}"
Daily minutes: ${params.daily_minutes}
Total days: ${params.total_days || 10}

Create a JSON roadmap structure with:
- Each day has a specific topic related to the goal
- Focus on practical, actionable learning
- Progress from beginner to intermediate

IMPORTANT: Return ONLY valid JSON, no markdown, no code blocks, no explanations. Just the raw JSON object.

{
  "goal": "${params.goal}",
  "total_days": ${params.total_days || 10},
  "daily_minutes": ${params.daily_minutes},
  "days": [
    {
      "day": 1,
      "title": "Specific topic title",
      "minutes": ${params.daily_minutes},
      "learn": [],
      "practice": [],
      "reflect": "Reflection question about today's learning"
    }
  ]
}`;

    const structureResult = await model.generateContent(structurePrompt);
    const structureText = structureResult.response.text();
    
    console.log('Generated roadmap structure:', structureText.substring(0, 200) + '...');
    
    let roadmap: RoadmapT;
    try {
      // Extract JSON from markdown code blocks if present
      let jsonText = structureText;
      if (structureText.includes('```json')) {
        const jsonMatch = structureText.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          jsonText = jsonMatch[1];
        }
      } else if (structureText.includes('```')) {
        const jsonMatch = structureText.match(/```\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          jsonText = jsonMatch[1];
        }
      }
      
      roadmap = JSON.parse(jsonText);
    } catch (e) {
      console.error('Failed to parse roadmap structure:', e);
      console.error('Raw structure text:', structureText);
      throw new Error('Failed to generate valid roadmap structure');
    }
    
    // Now find real resources for each day
    console.log('Finding real resources for each day...');
    
    for (const day of roadmap.days) {
      console.log(`Processing day ${day.day}: ${day.title}`);
      
      // Clear existing arrays to start fresh
      day.learn = [];
      day.practice = [];
      
      // Find watch resources (videos) for LEARN section
      const watchResources = await findResourcesForTopic(day.title, 'watch');
      if (watchResources.length > 0) {
        day.learn.push(...watchResources.slice(0, 2)); // Add up to 2 videos
      }
      
      // Find read resources (articles) for LEARN section
      const readResources = await findResourcesForTopic(day.title, 'read');
      if (readResources.length > 0) {
        day.learn.push(...readResources.slice(0, 1)); // Add 1 article to learn
      }
      
      // Find practice resources for PRACTICE section
      const practiceResources = await findResourcesForTopic(`${day.title} practice`, 'read');
      if (practiceResources.length > 0) {
        day.practice.push(...practiceResources.slice(0, 2)); // Add up to 2 practice resources
      } else {
        // If no specific practice resources, use some read resources
        if (readResources.length > 1) {
          day.practice.push(...readResources.slice(1, 3)); // Add remaining read resources
        }
      }
      
      // Only use real resources - no fallbacks
      console.log(`Day ${day.day} completed with ${day.learn.length} learn and ${day.practice.length} practice resources`);
    }
    
    console.log('Roadmap generation completed successfully');
    return roadmap;
    
  } catch (error) {
    console.error('Error generating roadmap with Gemini:', error);
    throw new Error('Failed to generate roadmap');
  }
}
