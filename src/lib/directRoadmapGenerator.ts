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
function generateCreativePracticeExercises(dayTitle: string, dayNumber: number, goal: string): any[] {
  const exercises: any[] = [];
  
  // Generate creative practice exercises based on the day's topic and overall goal
  let exercise1Title = `Hands-on Exercise: ${dayTitle} Practice`;
  let exercise2Title = `Creative Challenge: Apply ${dayTitle} Skills`;
  
  // Make exercises more specific based on the goal
  if (goal.toLowerCase().includes('filmmaking') || goal.toLowerCase().includes('film')) {
    exercise1Title = `Practice: Create a ${dayTitle.toLowerCase()} exercise`;
    exercise2Title = `Project: Apply ${dayTitle} to a short film scene`;
  } else if (goal.toLowerCase().includes('programming') || goal.toLowerCase().includes('coding')) {
    exercise1Title = `Code: Build a ${dayTitle.toLowerCase()} example`;
    exercise2Title = `Project: Create a program using ${dayTitle}`;
  } else if (goal.toLowerCase().includes('language') || goal.toLowerCase().includes('spanish') || goal.toLowerCase().includes('french')) {
    exercise1Title = `Practice: Use ${dayTitle.toLowerCase()} in conversation`;
    exercise2Title = `Challenge: Write a story using ${dayTitle}`;
  }
  
  const exercise1 = {
    kind: 'read',
    title: exercise1Title,
    url: null, // No URL for practice exercises - they are creative activities
    source: 'Practice Hub',
    duration_minutes: 15 + (dayNumber * 2),
    split: null
  };
  
  const exercise2 = {
    kind: 'read', 
    title: exercise2Title,
    url: null, // No URL for practice exercises - they are creative activities
    source: 'Skill Builder',
    duration_minutes: 20 + (dayNumber * 2),
    split: null
  };
  
  exercises.push(exercise1, exercise2);
  return exercises;
}



// Direct roadmap generation with real web scraping
export async function generateRoadmapWithDirectScraping(params: RoadmapParams, progressCallback?: (progress: number, message: string) => void): Promise<RoadmapT> {
  try {
    console.log('Generating roadmap with direct scraping for:', params.goal);
    
    // Track used resources to prevent duplicates
    const usedResourceUrls = new Set<string>();
    const usedResourceTitles = new Set<string>();
    
    // Step 1: Generate roadmap structure with Gemini
    progressCallback?.(10, "Generating roadmap structure...");
    
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
    progressCallback?.(30, "Finding real resources...");
    
    for (let i = 0; i < roadmap.days.length; i++) {
      const day = roadmap.days[i];
      const dayProgress = 30 + (i / roadmap.days.length) * 60; // 30% to 90%
      progressCallback?.(Math.round(dayProgress), `Processing day ${day.day}: ${day.title}`);
      console.log(`Processing day ${day.day}: ${day.title}`);
      
      // Clear existing arrays
      day.learn = [];
      day.practice = [];
      
      // Create specific search terms for this day with unique modifiers
      const searchTerms = [
        `${day.title} tutorial`,
        `${day.title} guide`,
        `${day.title} for beginners`,
        `learn ${day.title}`,
        `${day.title} basics`,
        `${day.title} fundamentals`
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
              
              // Check for duplicate titles within the same day
              const existingTitles = day.learn.map((r: any) => r.title?.toLowerCase() || '');
              if (existingTitles.includes(title)) return false;
              
              return true;
            });
            
            // Add new resources and mark them as used (aim for 2-3 watch resources)
            const resourcesToAdd = newResources.slice(0, 3);
            resourcesToAdd.forEach((resource: any) => {
              // Generate fallback title if missing
              if (!resource.title || resource.title.trim() === '' || resource.title.includes('http')) {
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
              
              // Only add if not already in this day's resources
              const existingUrls = day.learn.map((r: any) => r.url);
              if (!existingUrls.includes(resource.url)) {
                usedResourceUrls.add(resource.url);
                usedResourceTitles.add(resource.title.toLowerCase());
                day.learn.push(resource);
              }
            });
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
              if (!resource.title || resource.title.trim() === '' || resource.title.includes('http')) {
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
              
              // Only add if not already in this day's resources
              const existingUrls = day.learn.map((r: any) => r.url);
              if (!existingUrls.includes(resource.url)) {
                usedResourceUrls.add(resource.url);
                usedResourceTitles.add(resource.title.toLowerCase());
                day.learn.push(resource);
              }
            });
          }
        }
      } catch (error) {
        console.error(`Read resources failed:`, error);
      }
      
      // Practice section - only add creative activities, no web scraping for practice
      // Practice quests should be creative activities, not web resources
      
      // MANDATORY: Ensure every day has at least 2 learn resources - try more search terms if needed
      if (day.learn.length < 2) {
        // Try additional search terms for better results
        const additionalSearchTerms = [
          `${day.title} tutorial`,
          `${day.title} guide`,
          `${day.title} basics`,
          `${day.title} fundamentals`,
          `learn ${day.title}`,
          `${day.title} for beginners`
        ];
        
        for (const searchTerm of additionalSearchTerms) {
          if (day.learn.length >= 2) break;
          
          try {
            // Try watch resources first
            const watchResponse = await fetch(`/api/scrape-resources?q=${encodeURIComponent(searchTerm)}&type=watch`, {
              signal: AbortSignal.timeout(5000)
            });
            if (watchResponse.ok) {
              const watchData = await watchResponse.json();
              if (watchData.resources && watchData.resources.length > 0) {
                const newResources = watchData.resources.filter((resource: any) => {
                  if (usedResourceUrls.has(resource.url)) return false;
                  const baseUrl = resource.url.split('?')[0].split('#')[0];
                  for (const usedUrl of usedResourceUrls) {
                    const usedBaseUrl = usedUrl.split('?')[0].split('#')[0];
                    if (baseUrl === usedBaseUrl) return false;
                  }
                  const title = resource.title?.toLowerCase() || '';
                  if (usedResourceTitles.has(title)) return false;
                  const existingUrls = day.learn.map((r: any) => r.url);
                  if (existingUrls.includes(resource.url)) return false;
                  return true;
                });
                
                const resourcesToAdd = newResources.slice(0, 2 - day.learn.length);
                resourcesToAdd.forEach((resource: any) => {
                  if (!resource.title || resource.title.trim() === '' || resource.title.includes('http')) {
                    resource.title = `Video Tutorial: ${day.title}`;
                  }
                  usedResourceUrls.add(resource.url);
                  usedResourceTitles.add(resource.title.toLowerCase());
                  day.learn.push(resource);
                });
              }
            }
            
            // Try read resources if still need more
            if (day.learn.length < 2) {
              const readResponse = await fetch(`/api/scrape-resources?q=${encodeURIComponent(searchTerm)}&type=read`, {
                signal: AbortSignal.timeout(5000)
              });
              if (readResponse.ok) {
                const readData = await readResponse.json();
                if (readData.resources && readData.resources.length > 0) {
                  const newResources = readData.resources.filter((resource: any) => {
                    if (usedResourceUrls.has(resource.url)) return false;
                    const baseUrl = resource.url.split('?')[0].split('#')[0];
                    for (const usedUrl of usedResourceUrls) {
                      const usedBaseUrl = usedUrl.split('?')[0].split('#')[0];
                      if (baseUrl === usedBaseUrl) return false;
                    }
                    const title = resource.title?.toLowerCase() || '';
                    if (usedResourceTitles.has(title)) return false;
                    const existingUrls = day.learn.map((r: any) => r.url);
                    if (existingUrls.includes(resource.url)) return false;
                    return true;
                  });
                  
                  const resourcesToAdd = newResources.slice(0, 2 - day.learn.length);
                  resourcesToAdd.forEach((resource: any) => {
                    if (!resource.title || resource.title.trim() === '' || resource.title.includes('http')) {
                      resource.title = `Guide: ${day.title}`;
                    }
                    usedResourceUrls.add(resource.url);
                    usedResourceTitles.add(resource.title.toLowerCase());
                    day.learn.push(resource);
                  });
                }
              }
            }
          } catch (error) {
            console.error(`Additional search failed for "${searchTerm}":`, error);
          }
        }
      }
      
      // MANDATORY: Ensure every day has at least 2 practice resources
      if (day.practice.length < 2) {
        const practiceExercises = generateCreativePracticeExercises(day.title, day.day, params.goal);
        day.practice.push(...practiceExercises);
      }
      
      console.log(`Day ${day.day} completed with ${day.learn.length} learn and ${day.practice.length} practice resources`);
    }
    
    progressCallback?.(100, "Roadmap generation completed!");
    console.log('Direct roadmap generation completed successfully');
    return roadmap;
    
  } catch (error) {
    console.error('Direct roadmap generation failed:', error);
    throw error;
  }
}
