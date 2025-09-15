import { GoogleGenerativeAI } from '@google/generative-ai';
import { RoadmapT, ResourceT } from './schema';
import { generatePracticeQuests } from './practiceQuestGenerator';
import { advancedScraper } from './advancedWebScraper';

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

// Generate generic day topics for fallback
function generateGenericTopics(totalDays: number): string[] {
  const genericTopics = [
    'Introduction and Basics',
    'Fundamental Concepts',
    'Core Techniques',
    'Practical Applications',
    'Advanced Methods',
    'Problem Solving',
    'Best Practices and Industry Standards',
    'Tools and Resources',
    'Project-Based Learning',
    'Review and Mastery'
  ];
  
  return genericTopics.slice(0, totalDays);
}

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
async function generateGeminiContent(dayTitle: string, dayNumber: number, goal: string, contentType: 'article' | 'podcast'): Promise<ResourceT | null> {
  try {
    const prompt = `Create a comprehensive ${contentType} about "${dayTitle}" for someone learning "${goal}".

Requirements:
- Make it educational and practical
- Include specific examples and actionable advice
- Write in an engaging, conversational tone
- Length: ${contentType === 'article' ? '800-1200' : '15-20'} words
- Focus on the specific topic: ${dayTitle}

Return ONLY a JSON object with this exact structure:
{
  "title": "Specific, engaging title",
  "content": "Full ${contentType} content here...",
  "source": "AI Generated ${contentType === 'article' ? 'Article' : 'Podcast'}"
}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Extract JSON from response
    let jsonText = text;
    if (text.includes('```json')) {
      jsonText = text.split('```json')[1].split('```')[0].trim();
    } else if (text.includes('```')) {
      jsonText = text.split('```')[1].split('```')[0].trim();
    }
    
    const content = JSON.parse(jsonText);
    
    // Create a slug for the content
    const slug = `${goal.toLowerCase().replace(/\s+/g, '-')}-day-${dayNumber}-${contentType}`;
    
    // Return clean structure without problematic keys
    const cleanResource = {
      kind: contentType === 'podcast' ? 'listen' as const : 'read' as const,
      title: content.title,
      url: `/ai-content/${slug}`,
      source: content.source,
      duration_minutes: contentType === 'podcast' ? 20 : 15,
      description: content.content.substring(0, 200) + '...',
      split: null
    };
    
    return cleanResource;
    
  } catch (error) {
    console.error(`AI ${contentType} generation failed:`, error);
    
    // If quota exceeded, return a fallback content
    if (error instanceof Error && error.message && error.message.includes('429')) {
      return {
        kind: contentType === 'podcast' ? 'listen' : 'read',
        title: `${dayTitle} - ${contentType === 'podcast' ? 'Podcast' : 'Article'}`,
        url: `#ai-content-unavailable`,
        source: 'AI Generated (Fallback)',
        duration_minutes: contentType === 'podcast' ? 20 : 15,
        description: `Learn about ${dayTitle} for ${goal}. This content is temporarily unavailable due to high demand.`,
        split: null
      };
    }
    
    return null;
  }
}

// Main function to generate roadmap
export async function generateDirectRoadmap(params: { goal: string; days: number }): Promise<RoadmapT> {
  clearProblematicContent();
  
  const { goal, days } = params;
  const totalDays = Math.min(days, 30); // Cap at 30 days
  
  // Generate day topics
  const topics = generateGenericTopics(totalDays);
  
  const roadmap: RoadmapT = {
    goal,
    total_days: totalDays,
    daily_minutes: 60,
    days: []
  };
  
  for (let i = 0; i < totalDays; i++) {
    const dayNumber = i + 1;
    const dayTitle = `Day ${dayNumber}: ${topics[i]}`;
    
    console.log(`Processing day ${dayNumber}: ${topics[i]}`);
    
    // Generate practice exercises
    const practiceExercises = await generateCreativePracticeExercises(dayTitle, dayNumber, goal);
    
    // Generate AI content
    const article = await generateGeminiContent(dayTitle, dayNumber, goal, 'article');
    const podcast = await generateGeminiContent(dayTitle, dayNumber, goal, 'podcast');
    
    // Scrape real web resources
    console.log(`Scraping resources for: ${topics[i]}`);
    const watchResources = await advancedScraper.searchResources(topics[i], 'watch', goal);
    const readResources = await advancedScraper.searchResources(topics[i], 'read', goal);
    const listenResources = await advancedScraper.searchResources(topics[i], 'listen', goal);
    
    console.log(`Found ${watchResources.length} watch, ${readResources.length} read, ${listenResources.length} listen resources`);
    
    // Create learn resources - combine AI content with scraped resources
    const learnResources: ResourceT[] = [];
    if (article) learnResources.push(article);
    if (podcast) learnResources.push(podcast);
    
    // Add scraped resources (limit to avoid too many)
    learnResources.push(...watchResources.slice(0, 2));
    learnResources.push(...readResources.slice(0, 1));
    learnResources.push(...listenResources.slice(0, 1));
    
    // Add practice exercises
    const practiceResources: ResourceT[] = practiceExercises;
    
    // Create reflect prompt
    const reflectPrompt = `Reflect on what you learned about "${topics[i]}" today. What was the most important concept? How will you apply it? What questions do you still have?`;
    
    // Create quiz questions
    const quizQuestions = [
      {
        question: `What is the main focus of ${topics[i]}?`,
        options: ['A', 'B', 'C', 'D'],
        correct: 'A',
        explanation: `The main focus of ${topics[i]} is...`
      },
      {
        question: `Which technique is most important for ${topics[i]}?`,
        options: ['A', 'B', 'C', 'D'],
        correct: 'B',
        explanation: `The most important technique for ${topics[i]} is...`
      }
    ];
    
    const day = {
      day: dayNumber,
      title: dayTitle,
      minutes: 60,
      learn: learnResources,
      practice: practiceResources,
      reflect: reflectPrompt,
      quiz: quizQuestions
    };
    
    roadmap.days.push(day);
  }
  
  return roadmap;
}

// Export the function with the expected name
export const generateRoadmapWithDirectScraping = generateDirectRoadmap;
