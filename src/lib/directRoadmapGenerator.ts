import { GoogleGenerativeAI } from '@google/generative-ai';
import { RoadmapT, ResourceT } from './schema';
import { generatePracticeQuests } from './practiceQuestGenerator';

// Clear any problematic content from localStorage
function clearProblematicContent() {
  if (typeof window !== 'undefined') {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.includes('roadmap') || key.includes('goal')) {
        try {
          const value = localStorage.getItem(key);
          if (value && value.includes('fallback')) {
            localStorage.removeItem(key);
          }
        } catch (e) {
          // Ignore errors
        }
      }
    });
  }
}

// Initialize Gemini
const genAI = new GoogleGenerativeAI('AIzaSyBQseIm2Zs6bBGeKeDkKvkjw4B4Q0X9Q6o');
const model = genAI.getGenerativeModel({ 
  model: 'gemini-1.5-flash',
  generationConfig: {
    temperature: 0.7,
    topK: 40,
    topP: 0.95,
    maxOutputTokens: 2048,
  }
});


// Generate creative practice exercises for each day
async function generateCreativePracticeExercises(dayTitle: string, dayNumber: number, goal: string): Promise<any[]> {
  const exercises: any[] = [];
  
  // Use AI to generate contextually relevant practice exercises
  const practiceQuests = await generatePracticeQuests(goal, dayTitle, dayNumber);
  
  const exercise1Title = practiceQuests.exercise1Title;
  const exercise1Description = practiceQuests.exercise1Description;
  const exercise2Title = practiceQuests.exercise2Title;
  const exercise2Description = practiceQuests.exercise2Description;
  
  // AI handles all practice quest generation - no hardcoded categories needed
  
  const exercise1 = {
    kind: 'read',
    title: exercise1Title,
    url: null,
    source: 'Practice Exercise',
    duration_minutes: 30,
    description: exercise1Description,
    split: null
  };
  
  const exercise2 = {
    kind: 'read', 
    title: exercise2Title,
    url: null,
    source: 'Practice Exercise',
    duration_minutes: 30,
    description: exercise2Description,
    split: null
  };
  
  exercises.push(exercise1, exercise2);
  return exercises;
}

// Generate AI content for a specific day
async function generateGeminiContent(dayTitle: string, dayNumber: number, goal: string, contentType: 'article'): Promise<ResourceT | null> {
  try {
    console.log(`Generating ${contentType} for: ${dayTitle}`);
    
    const prompt = `Create a comprehensive article about "${dayTitle}" for someone learning "${goal}".

Requirements:
- Make it educational and practical
- Include specific examples and actionable advice
- Write in an engaging, conversational tone
- Length: 800-1200 words
- Focus on the specific topic: ${dayTitle}
- Write as a detailed, well-structured article

CRITICAL: Return ONLY valid JSON. No markdown, no code blocks, no explanations. Just the raw JSON object.

{
  "title": "Specific, engaging title",
  "content": "Full article content here...",
  "source": "AI Generated Article"
}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    console.log(`${contentType} generation response:`, text.substring(0, 200) + '...');
    
    // Extract JSON from response
    let jsonText = text;
    if (text.includes('```json')) {
      jsonText = text.split('```json')[1].split('```')[0].trim();
    } else if (text.includes('```')) {
      jsonText = text.split('```')[1].split('```')[0].trim();
    }
    
    console.log(`Raw JSON text: ${jsonText.substring(0, 500)}...`);
    
    let content;
    
    // First try to parse as-is
    try {
      content = JSON.parse(jsonText);
      console.log(`Successfully parsed ${contentType} content on first try:`, content);
    } catch (firstError) {
      console.log(`First parse attempt failed, trying to clean JSON...`);
      
      // Try to fix common JSON issues
      let cleanedJson = jsonText
        .replace(/\n/g, ' ')  // Remove newlines
        .replace(/\s+/g, ' ')  // Normalize whitespace
        .replace(/([^\\])\\([^"\\\/bfnrt])/g, '$1\\\\$2')  // Fix unescaped backslashes
        .replace(/([^\\])"([^"]*)"([^,}\]]*)([,\}\]])/g, '$1"$2"$4')  // Fix missing commas
        .trim();
      
      console.log(`Cleaned JSON text: ${cleanedJson.substring(0, 500)}...`);
      
      try {
        content = JSON.parse(cleanedJson);
        console.log(`Successfully parsed ${contentType} content after cleaning:`, content);
      } catch (secondError) {
        console.error(`JSON parsing failed even after cleaning, trying regex extraction:`, secondError);
        
        // Try to extract content using regex
        const titleMatch = jsonText.match(/"title":\s*"([^"]+)"/);
        const contentMatch = jsonText.match(/"content":\s*"([^"]+)"/);
        
        if (titleMatch && contentMatch) {
          content = {
            title: titleMatch[1],
            content: contentMatch[1],
            source: `AI Generated ${contentType === 'article' ? 'Article' : 'Podcast'}`
          };
          console.log(`Successfully extracted ${contentType} content with regex:`, content);
        } else {
          console.error(`All extraction methods failed, using fallback for ${contentType}`);
          console.log(`Available text for extraction:`, jsonText);
          content = {
            title: `${dayTitle} - ${contentType === 'article' ? 'Article' : 'Podcast'}`,
            content: `Learn about ${dayTitle} for ${goal}. This is AI-generated content about ${dayTitle}.`,
            source: `AI Generated ${contentType === 'article' ? 'Article' : 'Podcast'}`
          };
        }
      }
    }
    
    // Create a slug for the content
    const slug = `${goal.toLowerCase().replace(/\s+/g, '-')}-day-${dayNumber}-${contentType}`;
    const url = `/ai-content/${slug}`;
    
    console.log(`Generated ${contentType} URL: ${url}`);
    
    // Store content in localStorage for the AI content page
    if (typeof window !== 'undefined') {
      const contentKey = `ai-content-${slug}`;
      localStorage.setItem(contentKey, JSON.stringify(content));
      console.log(`Stored AI content in localStorage with key: ${contentKey}`);
    }
    
    // Return clean structure without problematic keys
    const cleanResource = {
      kind: 'read' as const,
      title: content.title,
      url: url,
      source: content.source,
      duration_minutes: 15,
      description: content.content.substring(0, 200) + '...',
      split: null
    };
    
    return cleanResource;
    
  } catch (error) {
    console.error(`AI ${contentType} generation failed for "${dayTitle}":`, error);
    
    // If quota exceeded, return a fallback content
    if (error instanceof Error && error.message && error.message.includes('429')) {
      console.log(`Quota exceeded for ${contentType}, using fallback`);
      return {
        kind: 'read',
        title: `${dayTitle} - Article`,
        url: `#ai-content-unavailable`,
        source: 'AI Generated (Fallback)',
        duration_minutes: 15,
        description: `Learn about ${dayTitle} for ${goal}. This content is temporarily unavailable due to high demand.`,
        split: null
      };
    }
    
    console.log(`Returning null for failed ${contentType} generation`);
    return null;
  }
}

// Main function to generate roadmap
export async function generateDirectRoadmap(params: { goal: string; days: number }): Promise<RoadmapT> {
  clearProblematicContent();
  
  const { goal, days } = params;
  const totalDays = Math.min(days, 30); // Cap at 30 days
  
  // Generate specific day topics using AI
  const structurePrompt = `Generate a detailed learning roadmap for: "${goal}"
Total days: ${totalDays}

Create a JSON roadmap structure with:
- Each day has a UNIQUE, SPECIFIC topic related to the goal
- Focus on practical, actionable learning with clear progression
- Progress from beginner to intermediate
- Each day title should be DISTINCT and describe a specific skill/concept
- Avoid generic titles like "basics" or "fundamentals" - be specific

EXAMPLES of good specific titles for horse riding:
- "Horse Grooming and Basic Care Techniques"
- "Mounting and Dismounting Safely"
- "Basic Walk and Halt Commands"
- "Trotting: Finding Your Rhythm"
- "Cantering: The Three-Beat Gait"
- "Jumping Basics: Approach and Takeoff"
- "Trail Riding Safety and Navigation"

IMPORTANT: Return ONLY valid JSON, no markdown, no code blocks, no explanations. Just the raw JSON object.

{
  "goal": "${goal}",
  "total_days": ${totalDays},
  "daily_minutes": 60,
  "days": [
    {
      "day": 1,
      "title": "Specific, unique topic title",
      "minutes": 60,
      "learn": [],
      "practice": [],
      "reflect": "Specific reflection question about today's learning"
    }
  ]
}`;

  let roadmap: RoadmapT;
  try {
    const result = await model.generateContent(structurePrompt);
    const response = await result.response;
    const text = response.text();
    
    let roadmapJson = text;
    if (text.includes('```json')) {
      roadmapJson = text.split('```json')[1].split('```')[0].trim();
    } else if (text.includes('```')) {
      roadmapJson = text.split('```')[1].split('```')[0].trim();
    }
    
    roadmap = JSON.parse(roadmapJson);
  } catch (error) {
    console.error('Failed to generate roadmap structure:', error);
    // Fallback to basic structure
    roadmap = {
      goal,
      total_days: totalDays,
      daily_minutes: 60,
      days: []
    };
  }
  
  // Process each day to add resources
  for (let i = 0; i < roadmap.days.length; i++) {
    const day = roadmap.days[i];
    const dayNumber = day.day;
    const dayTitle = day.title;
    
    console.log(`Processing day ${dayNumber}: ${dayTitle}`);
    
    // Generate practice exercises
    const practiceExercises = await generateCreativePracticeExercises(dayTitle, dayNumber, goal);
    
    // Generate AI content
    console.log(`Generating AI content for day ${dayNumber}: ${dayTitle}`);
    const article = await generateGeminiContent(dayTitle, dayNumber, goal, 'article');
    
    console.log(`AI content results - Article: ${article ? 'SUCCESS' : 'FAILED'}`);
    
    // Scrape real web resources via server-side API
    console.log(`Scraping resources for: ${dayTitle}`);
    
    const [watchResponse, readResponse, listenResponse] = await Promise.all([
      fetch(`/api/scrape-resources?q=${encodeURIComponent(dayTitle)}&type=watch&goal=${encodeURIComponent(goal)}`),
      fetch(`/api/scrape-resources?q=${encodeURIComponent(dayTitle)}&type=read&goal=${encodeURIComponent(goal)}`),
      fetch(`/api/scrape-resources?q=${encodeURIComponent(dayTitle)}&type=listen&goal=${encodeURIComponent(goal)}`)
    ]);
    
    const watchData = await watchResponse.json();
    const readData = await readResponse.json();
    const listenData = await listenResponse.json();
    
    const watchResources = watchData.resources || [];
    const readResources = readData.resources || [];
    const listenResources = listenData.resources || [];
    
    console.log(`Found ${watchResources.length} watch, ${readResources.length} read, ${listenResources.length} listen resources`);
    
    // Create learn resources - combine AI content with scraped resources
    const learnResources: ResourceT[] = [];
    if (article) learnResources.push(article);
    
    // Add scraped resources (limit to avoid too many)
    learnResources.push(...watchResources.slice(0, 2));
    learnResources.push(...readResources.slice(0, 1));
    learnResources.push(...listenResources.slice(0, 1));
    
    // Add practice exercises
    const practiceResources: ResourceT[] = practiceExercises;
    
    // Create quiz questions
    const quizQuestions = [
      {
        question: `What is the main focus of ${dayTitle}?`,
        options: ['A', 'B', 'C', 'D'],
        correct: 'A',
        explanation: `The main focus of ${dayTitle} is...`
      },
      {
        question: `Which technique is most important for ${dayTitle}?`,
        options: ['A', 'B', 'C', 'D'],
        correct: 'B',
        explanation: `The most important technique for ${dayTitle} is...`
      }
    ];
    
    // Update the day with resources
    day.learn = learnResources;
    day.practice = practiceResources;
    day.quiz = quizQuestions;
  }
  
  return roadmap;
}

// Export the function with the expected name
export const generateRoadmapWithDirectScraping = generateDirectRoadmap;
