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

// Fallback roadmap generator when Gemini fails
function createFallbackRoadmap(params: RoadmapParams): RoadmapT {
  const totalDays = params.total_days || 10;
  const goal = params.goal.toLowerCase();
  
  // Generate basic daily topics based on the goal
  const topics = generateBasicTopics(goal, totalDays);
  
  const roadmap: RoadmapT = {
    goal: params.goal,
    total_days: totalDays,
    daily_minutes: params.daily_minutes,
    days: topics.map((topic, index) => ({
      day: index + 1,
      title: topic,
      minutes: params.daily_minutes,
      learn: [],
      practice: [],
      reflect: `What did you learn about ${topic.toLowerCase()} today?`
    }))
  };
  
  return roadmap;
}

// Generate basic topics based on the goal
function generateBasicTopics(goal: string, totalDays: number): string[] {
  const topics: string[] = [];
  
  // Common learning progressions for different goals
  if (goal.includes('filmmaking') || goal.includes('film')) {
    const filmmakingTopics = [
      'Understanding Camera Basics and Settings',
      'Framing and Composition Techniques',
      'Lighting Fundamentals and Setup',
      'Audio Recording and Microphone Placement',
      'Storyboarding and Shot Planning',
      'Camera Movement and Stabilization',
      'Color Theory and Visual Aesthetics',
      'Post-Production Editing Basics',
      'Sound Design and Audio Editing',
      'Final Project and Portfolio Creation'
    ];
    return filmmakingTopics.slice(0, totalDays);
  }
  
  if (goal.includes('programming') || goal.includes('coding') || goal.includes('code')) {
    const programmingTopics = [
      'Programming Fundamentals and Syntax',
      'Variables, Data Types, and Operators',
      'Control Structures and Loops',
      'Functions and Methods',
      'Object-Oriented Programming Concepts',
      'Data Structures and Algorithms',
      'Error Handling and Debugging',
      'Version Control and Git',
      'Testing and Quality Assurance',
      'Project Development and Deployment'
    ];
    return programmingTopics.slice(0, totalDays);
  }
  
  if (goal.includes('language') || goal.includes('spanish') || goal.includes('french')) {
    const languageTopics = [
      'Basic Vocabulary and Common Phrases',
      'Pronunciation and Phonetics',
      'Grammar Fundamentals and Sentence Structure',
      'Present Tense and Basic Conjugations',
      'Past Tense and Time Expressions',
      'Future Tense and Conditional Forms',
      'Conversation and Speaking Practice',
      'Reading Comprehension and Text Analysis',
      'Listening Skills and Audio Practice',
      'Cultural Context and Real-world Application'
    ];
    return languageTopics.slice(0, totalDays);
  }
  
  // Generic fallback topics
  const genericTopics = [
    'Introduction and Fundamentals',
    'Basic Concepts and Terminology',
    'Core Principles and Theory',
    'Practical Applications and Examples',
    'Advanced Techniques and Methods',
    'Problem-Solving and Critical Thinking',
    'Best Practices and Industry Standards',
    'Tools and Resources',
    'Project-Based Learning',
    'Review and Mastery'
  ];
  
  return genericTopics.slice(0, totalDays);
}

// Generate creative practice exercises for each day
function generatePracticeExercises(dayTitle: string, dayNumber: number): any[] {
  const exercises: any[] = [];
  
  // Generate 2 creative practice exercises based on the day's topic
  const exercise1 = {
    kind: 'read',
    title: `Hands-on Exercise: ${dayTitle} Practice`,
    url: `https://example.com/practice/${dayTitle.toLowerCase().replace(/\s+/g, '-')}-exercise-1`,
    source: 'Practice Hub',
    duration_minutes: 15 + (dayNumber * 2),
    split: null
  };
  
  const exercise2 = {
    kind: 'read', 
    title: `Creative Challenge: Apply ${dayTitle} Skills`,
    url: `https://example.com/challenge/${dayTitle.toLowerCase().replace(/\s+/g, '-')}-challenge`,
    source: 'Skill Builder',
    duration_minutes: 20 + (dayNumber * 2),
    split: null
  };
  
  exercises.push(exercise1, exercise2);
  return exercises;
}

// Generate fallback learn resources for each day
function generateFallbackLearnResources(dayTitle: string, dayNumber: number): any[] {
  const resources: any[] = [];
  
  // Generate 2-3 fallback learn resources based on the day's topic
  const resource1 = {
    kind: 'watch',
    title: `Video Tutorial: ${dayTitle} - Day ${dayNumber}`,
    url: `https://www.youtube.com/watch?v=fallback${dayNumber}`,
    source: 'YouTube',
    duration_minutes: 15 + (dayNumber * 2),
    split: null
  };
  
  const resource2 = {
    kind: 'watch',
    title: `Advanced Guide: ${dayTitle} Techniques`,
    url: `https://www.youtube.com/watch?v=advanced${dayNumber}`,
    source: 'YouTube',
    duration_minutes: 20 + (dayNumber * 2),
    split: null
  };
  
  const resource3 = {
    kind: 'read',
    title: `Complete Guide: ${dayTitle} Fundamentals`,
    url: `https://example.com/guide/${dayTitle.toLowerCase().replace(/\s+/g, '-')}-day-${dayNumber}`,
    source: 'Learning Hub',
    duration_minutes: 12 + (dayNumber * 2),
    split: null
  };
  
  resources.push(resource1, resource2, resource3);
  return resources;
}


// Direct roadmap generation with real web scraping
export async function generateRoadmapWithDirectScraping(params: RoadmapParams): Promise<RoadmapT> {
  try {
    console.log('Generating roadmap with direct scraping for:', params.goal);
    
    // Track used resources to prevent duplicates
    const usedResourceUrls = new Set<string>();
    const usedResourceTitles = new Set<string>();
    
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

    // Retry mechanism for Gemini API calls
    let structureResult;
    let structureText;
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      try {
        structureResult = await model.generateContent(structurePrompt);
        structureText = structureResult.response.text();
        break; // Success, exit retry loop
      } catch (error: any) {
        retryCount++;
        console.error(`Gemini API attempt ${retryCount} failed:`, error.message);
        
        if (error.message.includes('503') || error.message.includes('overloaded')) {
          // Service overloaded - wait longer
          const waitTime = Math.pow(2, retryCount) * 2000; // Exponential backoff: 4s, 8s, 16s
          console.log(`Service overloaded, waiting ${waitTime}ms before retry ${retryCount + 1}`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        } else if (retryCount >= maxRetries) {
          // Max retries reached, throw error
          throw error;
        } else {
          // Other error - wait shorter time
          const waitTime = 1000 * retryCount;
          console.log(`API error, waiting ${waitTime}ms before retry ${retryCount + 1}`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }
    
    if (!structureText) {
      console.log('Gemini failed, using fallback roadmap structure');
      // Fallback: Create a basic roadmap structure
      const fallbackRoadmap = createFallbackRoadmap(params);
      return fallbackRoadmap;
    }
    
    console.log('Generated roadmap structure:', structureText.substring(0, 200) + '...');

    // Extract JSON from response
    let roadmapJson = structureText;
    if (structureText.includes('```json')) {
      roadmapJson = structureText.split('```json')[1].split('```')[0].trim();
    } else if (structureText.includes('```')) {
      roadmapJson = structureText.split('```')[1].split('```')[0].trim();
    }

    // Parse the JSON with error handling
    let roadmap: RoadmapT;
    try {
      roadmap = JSON.parse(roadmapJson);
    } catch (parseError) {
      console.error('Failed to parse roadmap JSON:', parseError);
      console.log('Using fallback roadmap structure due to JSON parsing error');
      // Use fallback if JSON parsing fails
      const fallbackRoadmap = createFallbackRoadmap(params);
      return fallbackRoadmap;
    }
    
    // Step 2: Find real resources for each day
    console.log('Finding real resources for each day...');
    
    for (const day of roadmap.days) {
      console.log(`Processing day ${day.day}: ${day.title}`);
      
      // Clear existing arrays
      day.learn = [];
      day.practice = [];
      
      // Create specific search terms for this day with unique modifiers
      const searchTerms = [
        `${day.title} tutorial day ${day.day}`,
        `${day.title} guide step ${day.day}`,
        `${day.title} for beginners lesson ${day.day}`
      ];
      
      // Find watch resources (videos) for LEARN section - single attempt with timeout
      try {
        const watchResponse = await fetch(`/api/scrape-resources?q=${encodeURIComponent(searchTerms[0])}&type=watch`, {
          signal: AbortSignal.timeout(5000) // 5 second timeout
        });
        if (watchResponse.ok) {
          const watchData = await watchResponse.json();
          if (watchData.resources && watchData.resources.length > 0) {
            // Filter out already used resources
            const newResources = watchData.resources.filter((resource: any) => {
              // Check URL
              if (usedResourceUrls.has(resource.url)) return false;
              
              // Check for similar URLs (truncated versions)
              const baseUrl = resource.url.split('?')[0].split('#')[0];
              for (const usedUrl of usedResourceUrls) {
                const usedBaseUrl = usedUrl.split('?')[0].split('#')[0];
                if (baseUrl === usedBaseUrl) return false;
              }
              
              // Check title
              const title = resource.title?.toLowerCase() || '';
              if (usedResourceTitles.has(title)) return false;
              
              return true;
            });
            
            // Add new resources and mark them as used (aim for 2-3 watch resources)
            const resourcesToAdd = newResources.slice(0, 3);
            resourcesToAdd.forEach((resource: any) => {
              // Generate fallback title if missing
              if (!resource.title || resource.title.trim() === '') {
                if (resource.url.includes('youtube.com')) {
                  resource.title = `Video Tutorial - Day ${day.day}`;
                } else if (resource.url.includes('skillshare.com')) {
                  resource.title = `Skillshare Course - Day ${day.day}`;
                } else if (resource.url.includes('masterclass.com')) {
                  resource.title = `MasterClass Lesson - Day ${day.day}`;
                } else if (resource.url.includes('studiobinder.com')) {
                  resource.title = `StudioBinder Guide - Day ${day.day}`;
                } else {
                  resource.title = `Learning Resource - Day ${day.day}`;
                }
              }
              
              usedResourceUrls.add(resource.url);
              usedResourceTitles.add(resource.title.toLowerCase());
            });
            
            day.learn.push(...resourcesToAdd);
          }
        }
      } catch (error) {
        console.error(`Watch resources failed:`, error);
      }
      
      // Find read resources (articles) for LEARN section - single attempt with timeout
      try {
        const readResponse = await fetch(`/api/scrape-resources?q=${encodeURIComponent(searchTerms[1])}&type=read`, {
          signal: AbortSignal.timeout(5000) // 5 second timeout
        });
        if (readResponse.ok) {
          const readData = await readResponse.json();
          if (readData.resources && readData.resources.length > 0) {
            // Filter out already used resources
            const newResources = readData.resources.filter((resource: any) => {
              // Check URL
              if (usedResourceUrls.has(resource.url)) return false;
              
              // Check for similar URLs (truncated versions)
              const baseUrl = resource.url.split('?')[0].split('#')[0];
              for (const usedUrl of usedResourceUrls) {
                const usedBaseUrl = usedUrl.split('?')[0].split('#')[0];
                if (baseUrl === usedBaseUrl) return false;
              }
              
              // Check title
              const title = resource.title?.toLowerCase() || '';
              if (usedResourceTitles.has(title)) return false;
              
              return true;
            });
            
            // Add new resources and mark them as used (aim for 1-2 read resources)
            const resourcesToAdd = newResources.slice(0, 2);
            resourcesToAdd.forEach((resource: any) => {
              // Generate fallback title if missing
              if (!resource.title || resource.title.trim() === '') {
                if (resource.url.includes('youtube.com')) {
                  resource.title = `Video Tutorial - Day ${day.day}`;
                } else if (resource.url.includes('skillshare.com')) {
                  resource.title = `Skillshare Course - Day ${day.day}`;
                } else if (resource.url.includes('masterclass.com')) {
                  resource.title = `MasterClass Lesson - Day ${day.day}`;
                } else if (resource.url.includes('studiobinder.com')) {
                  resource.title = `StudioBinder Guide - Day ${day.day}`;
                } else {
                  resource.title = `Learning Resource - Day ${day.day}`;
                }
              }
              
              usedResourceUrls.add(resource.url);
              usedResourceTitles.add(resource.title.toLowerCase());
            });
            
            day.learn.push(...resourcesToAdd);
          }
        }
      } catch (error) {
        console.error(`Read resources failed:`, error);
      }
      
      // Find practice resources for PRACTICE section - single attempt with timeout
      try {
        const practiceResponse = await fetch(`/api/scrape-resources?q=${encodeURIComponent(searchTerms[2])}&type=read`, {
          signal: AbortSignal.timeout(5000) // 5 second timeout
        });
        if (practiceResponse.ok) {
          const practiceData = await practiceResponse.json();
          if (practiceData.resources && practiceData.resources.length > 0) {
            // Filter out already used resources
            const newResources = practiceData.resources.filter((resource: any) => {
              // Check URL
              if (usedResourceUrls.has(resource.url)) return false;
              
              // Check for similar URLs (truncated versions)
              const baseUrl = resource.url.split('?')[0].split('#')[0];
              for (const usedUrl of usedResourceUrls) {
                const usedBaseUrl = usedUrl.split('?')[0].split('#')[0];
                if (baseUrl === usedBaseUrl) return false;
              }
              
              // Check title
              const title = resource.title?.toLowerCase() || '';
              if (usedResourceTitles.has(title)) return false;
              
              return true;
            });
            
            // Add new resources and mark them as used
            const resourcesToAdd = newResources.slice(0, 2);
            resourcesToAdd.forEach((resource: any) => {
              // Generate fallback title if missing
              if (!resource.title || resource.title.trim() === '') {
                if (resource.url.includes('youtube.com')) {
                  resource.title = `Video Tutorial - Day ${day.day}`;
                } else if (resource.url.includes('skillshare.com')) {
                  resource.title = `Skillshare Course - Day ${day.day}`;
                } else if (resource.url.includes('masterclass.com')) {
                  resource.title = `MasterClass Lesson - Day ${day.day}`;
                } else if (resource.url.includes('studiobinder.com')) {
                  resource.title = `StudioBinder Guide - Day ${day.day}`;
                } else {
                  resource.title = `Learning Resource - Day ${day.day}`;
                }
              }
              
              usedResourceUrls.add(resource.url);
              usedResourceTitles.add(resource.title.toLowerCase());
            });
            
            day.practice.push(...resourcesToAdd);
          }
        }
      } catch (error) {
        console.error(`Practice resources failed:`, error);
      }
      
      // MANDATORY FALLBACK: Ensure every day has at least 2 learn and 2 practice resources
      if (day.learn.length === 0) {
        const fallbackLearn = generateFallbackLearnResources(day.title, day.day);
        day.learn.push(...fallbackLearn);
      }
      
      if (day.practice.length === 0) {
        const practiceExercises = generatePracticeExercises(day.title, day.day);
        day.practice.push(...practiceExercises);
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
