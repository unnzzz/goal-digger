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

// Web scraping function to find real resources
async function findResourcesForTopic(topic: string, kind: 'watch' | 'read' | 'listen'): Promise<ResourceT[]> {
  const resources: ResourceT[] = [];
  
  try {
    // Create search queries based on kind
    let searchQuery: string;
    let searchUrl: string;
    
    if (kind === 'watch') {
      searchQuery = `${topic} tutorial video`;
      searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`;
    } else if (kind === 'read') {
      searchQuery = `${topic} guide tutorial`;
      searchUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`;
    } else {
      searchQuery = `${topic} podcast episode`;
      searchUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`;
    }

    console.log(`Searching for ${kind} resources: ${searchQuery}`);
    
    // Scrape search results
    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    const $ = cheerio.load(response.data);
    
    if (kind === 'watch') {
      // Extract YouTube video links
      $('a[href*="/watch?v="]').each((index, element) => {
        if (index >= 3) return false; // Limit to 3 videos
        
        const href = $(element).attr('href');
        const title = $(element).find('h3').text().trim() || $(element).text().trim();
        
        if (href && title && href.includes('/watch?v=')) {
          const videoId = href.split('v=')[1]?.split('&')[0];
          if (videoId) {
            resources.push({
              kind: 'watch',
              title: title.substring(0, 100),
              url: `https://www.youtube.com/watch?v=${videoId}`,
              source: 'YouTube',
              duration_minutes: 15, // Default duration
              split: null
            });
          }
        }
      });
    } else {
      // Extract article links from Google search
      $('a[href^="http"]').each((index, element) => {
        if (index >= 3) return false; // Limit to 3 articles
        
        const href = $(element).attr('href');
        const title = $(element).find('h3').text().trim() || $(element).text().trim();
        
        if (href && title && !href.includes('google.com') && !href.includes('youtube.com')) {
          resources.push({
            kind: kind,
            title: title.substring(0, 100),
            url: href,
            source: new URL(href).hostname,
            duration_minutes: kind === 'read' ? 10 : 20,
            split: null
          });
        }
      });
    }
    
    console.log(`Found ${resources.length} ${kind} resources for topic: ${topic}`);
    
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

Return ONLY valid JSON in this format:
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
      roadmap = JSON.parse(structureText);
    } catch (e) {
      console.error('Failed to parse roadmap structure:', e);
      throw new Error('Failed to generate valid roadmap structure');
    }
    
    // Now find real resources for each day
    console.log('Finding real resources for each day...');
    
    for (const day of roadmap.days) {
      console.log(`Processing day ${day.day}: ${day.title}`);
      
      // Find watch resources (videos)
      const watchResources = await findResourcesForTopic(day.title, 'watch');
      if (watchResources.length > 0) {
        day.learn.push(...watchResources.slice(0, 2)); // Add up to 2 videos
      }
      
      // Find read resources (articles)
      const readResources = await findResourcesForTopic(day.title, 'read');
      if (readResources.length > 0) {
        day.learn.push(...readResources.slice(0, 1)); // Add up to 1 article
        day.practice.push(...readResources.slice(1, 2)); // Add 1 more for practice
      }
      
      // Ensure we have at least some resources
      if (day.learn.length === 0 && day.practice.length === 0) {
        // Add placeholder resources if none found
        day.learn.push({
          kind: 'read',
          title: `${day.title} - Learning Guide`,
          url: `https://example.com/${day.title.toLowerCase().replace(/\s+/g, '-')}`,
          source: 'Example Site',
          duration_minutes: 15,
          split: null
        });
      }
      
      console.log(`Day ${day.day} completed with ${day.learn.length} learn and ${day.practice.length} practice resources`);
    }
    
    console.log('Roadmap generation completed successfully');
    return roadmap;
    
  } catch (error) {
    console.error('Error generating roadmap with Gemini:', error);
    throw new Error('Failed to generate roadmap');
  }
}
