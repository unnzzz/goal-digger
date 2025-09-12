import { GoogleGenerativeAI } from '@google/generative-ai';
import { RoadmapT, ResourceT } from './schema';

// Clear any problematic content from localStorage
function clearProblematicContent() {
  if (typeof window !== 'undefined') {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('ai-content-')) {
        try {
          const content = JSON.parse(localStorage.getItem(key) || '{}');
          if (content.podcast_script || content.article) {
            delete content.podcast_script;
            delete content.article;
            localStorage.setItem(key, JSON.stringify(content));
          }
        } catch (e) {
          // Skip invalid JSON
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
  
  // Generate creative and detailed practice exercises based on the day's topic and overall goal
  let exercise1Title = `Hands-on Exercise: ${dayTitle} Practice`;
  let exercise1Description = `Apply the concepts you've learned about ${dayTitle.toLowerCase()} through hands-on practice.`;
  let exercise2Title = `Creative Challenge: Apply ${dayTitle} Skills`;
  let exercise2Description = `Take your ${dayTitle.toLowerCase()} skills to the next level with this creative project.`;
  
  // Make exercises more specific and detailed based on the goal and day content
  if (goal.toLowerCase().includes('filmmaking') || goal.toLowerCase().includes('film')) {
    if (dayTitle.toLowerCase().includes('camera') || dayTitle.toLowerCase().includes('exposure')) {
      exercise1Title = `Camera Mastery Challenge: ${dayTitle} Exploration`;
      exercise1Description = `Spend 2-3 hours experimenting with different camera settings and exposure techniques. Set up various lighting conditions (indoor, outdoor, low light) and practice adjusting ISO, aperture, and shutter speed. Create a series of 10 test shots showing different exposure scenarios, then analyze what worked best and why. Document your findings and create a personal reference guide.`;
      exercise2Title = `Cinematic Storytelling Project: ${dayTitle} in Action`;
      exercise2Description = `Create a 2-3 minute short film that showcases your ${dayTitle.toLowerCase()} skills. Plan a simple story that requires different exposure settings throughout. Use your camera to tell the story visually - perhaps showing a character moving from bright daylight to dim indoor lighting, or capturing the mood of different times of day. Edit your footage and add a voiceover explaining your creative choices.`;
    } else if (dayTitle.toLowerCase().includes('lighting')) {
      exercise1Title = `Lighting Workshop: Three-Point Setup Mastery`;
      exercise1Description = `Set up a complete three-point lighting system in your space. Experiment with different light positions, intensities, and modifiers. Practice lighting different types of subjects (portraits, objects, scenes) and document the results. Try creating different moods - dramatic, soft, high-key, low-key - and understand how each affects the emotional impact of your images.`;
      exercise2Title = `Mood Lighting Project: Visual Storytelling`;
      exercise2Description = `Create a series of 5-7 images that tell a story using only lighting. Choose a theme (like "a day in the life" or "emotions") and use different lighting setups to convey different moments or feelings. Experiment with color temperature, shadows, and light direction to create distinct moods. Present your work as a visual narrative with captions explaining your lighting choices.`;
    } else if (dayTitle.toLowerCase().includes('editing')) {
      exercise1Title = `Editing Bootcamp: ${dayTitle} Techniques`;
      exercise1Description = `Practice the specific editing techniques covered in today's lesson. Find or create raw footage and spend 3-4 hours applying different editing methods. Focus on timing, rhythm, and flow. Create multiple versions of the same sequence using different approaches, then compare the results. Pay attention to how editing choices affect the emotional impact and pacing of your story.`;
      exercise2Title = `Short Film Project: Complete Workflow`;
      exercise2Description = `Plan, shoot, and edit a complete 3-5 minute short film that demonstrates your ${dayTitle.toLowerCase()} skills. Start with a simple concept and storyboard, then execute the project from pre-production to final export. Focus on applying all the editing techniques you've learned while maintaining a cohesive narrative. Share your finished film and reflect on what you learned throughout the process.`;
    } else {
      exercise1Title = `Technical Practice: ${dayTitle} Fundamentals`;
      exercise1Description = `Dive deep into the technical aspects of ${dayTitle.toLowerCase()}. Spend 2-3 hours practicing the core techniques, experimenting with different approaches, and troubleshooting common challenges. Document your process, take notes on what works and what doesn't, and create a personal reference guide for future projects.`;
      exercise2Title = `Creative Application: ${dayTitle} in Practice`;
      exercise2Description = `Apply your ${dayTitle.toLowerCase()} knowledge to a real creative project. Choose something that excites you - perhaps a personal story, a documentary about someone you know, or an experimental piece. Use this project as an opportunity to push your skills further and discover your unique creative voice while applying the techniques you've learned.`;
    }
  } else if (goal.toLowerCase().includes('programming') || goal.toLowerCase().includes('coding')) {
    if (dayTitle.toLowerCase().includes('javascript') || dayTitle.toLowerCase().includes('js')) {
      exercise1Title = `Code Workshop: ${dayTitle} Deep Dive`;
      exercise1Description = `Build a comprehensive JavaScript project that demonstrates your understanding of ${dayTitle.toLowerCase()}. Start with a simple concept and gradually add complexity. Focus on writing clean, well-commented code and implementing best practices. Test your code thoroughly and refactor as needed. Document your learning process and challenges you overcame.`;
      exercise2Title = `Full-Stack Project: ${dayTitle} Application`;
      exercise2Description = `Create a complete web application using ${dayTitle.toLowerCase()} as a core feature. Plan the project architecture, design the user interface, implement the functionality, and deploy it online. Focus on creating something useful and user-friendly while showcasing your technical skills. Consider adding features like user authentication, data persistence, and responsive design.`;
    } else if (dayTitle.toLowerCase().includes('react')) {
      exercise1Title = `Component Library: ${dayTitle} Mastery`;
      exercise1Description = `Build a collection of reusable React components that demonstrate your understanding of ${dayTitle.toLowerCase()}. Focus on creating components that are modular, well-documented, and easy to use. Implement proper prop validation, error handling, and accessibility features. Create a storybook or documentation site to showcase your components.`;
      exercise2Title = `React Application: Real-World Project`;
      exercise2Description = `Develop a complete React application that solves a real problem or provides value to users. Plan the project structure, implement state management, handle routing, and integrate with external APIs if needed. Focus on creating a polished, production-ready application with proper error handling, loading states, and user feedback. Deploy your application and gather user feedback.`;
    } else {
      exercise1Title = `Code Practice: ${dayTitle} Implementation`;
      exercise1Description = `Spend 3-4 hours coding and experimenting with ${dayTitle.toLowerCase()}. Start with simple examples and gradually increase complexity. Focus on understanding the underlying concepts, not just memorizing syntax. Debug issues as they arise and document your learning process. Create a portfolio of your work to showcase your progress.`;
      exercise2Title = `Project Showcase: ${dayTitle} Application`;
      exercise2Description = `Build a complete project that demonstrates your mastery of ${dayTitle.toLowerCase()}. Choose something that interests you and provides real value. Focus on creating clean, maintainable code and a polished user experience. Consider open-sourcing your project and contributing to the developer community. Document your development process and lessons learned.`;
    }
  } else if (goal.toLowerCase().includes('language') || goal.toLowerCase().includes('spanish') || goal.toLowerCase().includes('french')) {
    exercise1Title = `Conversation Practice: ${dayTitle} in Action`;
    exercise1Description = `Find a language exchange partner or use language learning apps to practice ${dayTitle.toLowerCase()} in real conversations. Focus on using the specific vocabulary and grammar structures you've learned. Record yourself speaking and listen back to identify areas for improvement. Practice for at least 30 minutes and keep a journal of new words and phrases you discover.`;
    exercise2Title = `Creative Writing Challenge: ${dayTitle} Story`;
    exercise2Description = `Write a short story, poem, or essay using ${dayTitle.toLowerCase()} as a central theme. Aim for 200-300 words and focus on using the language structures you've learned. Share your writing with native speakers for feedback, or post it in language learning communities. Use this as an opportunity to express yourself creatively while practicing your language skills.`;
  } else {
    exercise1Title = `Hands-on Practice: ${dayTitle} Application`;
    exercise1Description = `Spend 2-3 hours actively practicing the concepts you've learned about ${dayTitle.toLowerCase()}. Create something tangible that demonstrates your understanding. Focus on applying the knowledge in a practical way and documenting your process. Experiment with different approaches and see what works best for you.`;
    exercise2Title = `Creative Project: ${dayTitle} Showcase`;
    exercise2Description = `Create a comprehensive project that showcases your ${dayTitle.toLowerCase()} skills. Choose something that excites you and allows you to express your creativity while applying what you've learned. Focus on creating something of value that you can be proud of and share with others. Document your creative process and reflect on what you learned.`;
  }
  
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
    duration_minutes: 45,
    description: exercise2Description,
    split: null
  };
  
  exercises.push(exercise1, exercise2);
  return exercises;
}

// Generate content using Gemini when web scraping fails
async function generateGeminiContent(dayTitle: string, dayNumber: number, goal: string, contentType: 'article' | 'podcast'): Promise<any> {
  try {
    const contentPrompt = `Create a comprehensive ${contentType} about "${dayTitle}" for someone learning "${goal}".

For ${contentType}:
- Make it VERY detailed and educational (1500-2000 words for article)
- Include specific examples, step-by-step instructions, and actionable advice
- Use proper markdown formatting with headers, lists, and emphasis
- Keep it engaging and beginner-friendly but comprehensive
- Focus on the core concepts of "${dayTitle}" with practical applications
- For podcast: Include a detailed script with speaking notes, timing, and natural conversation flow
- For article: Write with clear sections, subheadings, and detailed explanations

IMPORTANT: The title must be SHORT (max 50 characters) and descriptive, NOT the full content.

Return a JSON object with:
{
  "title": "Short title (max 50 chars) like '${dayTitle} Guide' or '${dayTitle} Basics'",
  "content": "Full ${contentType} content (1500-2000 words for article, detailed podcast script for podcast) with proper markdown formatting",
  "duration_minutes": ${contentType === 'podcast' ? '25' : '20'},
  "source": "AI Generated",
  "type": "${contentType}",
  "description": "Comprehensive ${contentType} covering ${dayTitle.toLowerCase()} with detailed explanations and practical examples."
}`;

    const result = await model.generateContent(contentPrompt);
    const response = await result.response;
    const text = response.text();
    
    // Extract JSON from response with better parsing
    let jsonText = text;
    if (text.includes('```json')) {
      jsonText = text.split('```json')[1].split('```')[0].trim();
    } else if (text.includes('```')) {
      jsonText = text.split('```')[1].split('```')[0].trim();
    }
    
    // Clean up the JSON text
    jsonText = jsonText.replace(/[\r\n\t]/g, ' ').replace(/\s+/g, ' ').trim();
    
    let content;
    try {
      content = JSON.parse(jsonText);
    } catch (parseError) {
      console.error('JSON parsing failed for AI content, using fallback structure');
      content = {
        title: `${dayTitle} - ${contentType === 'podcast' ? 'Podcast' : 'Article'}`,
        content: `This ${contentType} about "${dayTitle}" is being generated. Please try again later.`,
        duration_minutes: contentType === 'podcast' ? 20 : 15,
        source: 'AI Generated (Fallback)',
        type: contentType
      };
    }
    
    // Clean the content object to remove problematic keys BEFORE creating normalizedContent
    let title = content.title || `${dayTitle} - ${contentType === 'podcast' ? 'Podcast' : 'Article'}`;
    
    // Ensure title is not too long (max 50 characters) and is descriptive
    if (title.length > 50) {
      // Try to create a better short title
      const shortTitle = `${dayTitle} ${contentType === 'podcast' ? 'Podcast' : 'Guide'}`;
      title = shortTitle.length > 50 ? shortTitle.substring(0, 47) + '...' : shortTitle;
    }
    
    // If title is still the full content, create a proper short title
    if (title.includes('##') || title.includes('###') || title.length > 100) {
      title = `${dayTitle} ${contentType === 'podcast' ? 'Podcast' : 'Guide'}`;
    }
    
    const cleanedContent = {
      title: title,
      content: content.content || content.podcast_script || content.article || 'Content not available',
      duration_minutes: content.duration_minutes || (contentType === 'podcast' ? 25 : 20),
      source: content.source || 'AI Generated',
      type: contentType,
      description: content.description || `Comprehensive ${contentType} covering ${dayTitle.toLowerCase()} with detailed explanations and practical examples.`
    };
    
    // Remove any problematic keys from the cleaned content
    delete (cleanedContent as any).podcast_script;
    delete (cleanedContent as any).article;
    
    // Also clean the original content object to prevent any references
    delete (content as any).podcast_script;
    delete (content as any).article;
    
    const slug = `${dayTitle.toLowerCase().replace(/\s+/g, '-')}-${contentType}-day-${dayNumber}`;
    
    // Use the cleaned content for normalizedContent
    const normalizedContent = { ...cleanedContent };
    
    // Store content in localStorage for the AI content page
    if (typeof window !== 'undefined') {
      // Store clean content structure for the AI content page
      const contentToStore = {
        title: normalizedContent.title,
        content: normalizedContent.content,
        duration_minutes: normalizedContent.duration_minutes,
        source: normalizedContent.source,
        type: contentType,
        description: normalizedContent.description
      };
      localStorage.setItem(`ai-content-${slug}`, JSON.stringify(contentToStore));
    }
    
    // Return clean structure without problematic keys
    const cleanResource = {
      kind: contentType === 'podcast' ? 'listen' as const : 'read' as const,
      title: normalizedContent.title,
      url: `/ai-content/${slug}`,
      source: normalizedContent.source,
      duration_minutes: normalizedContent.duration_minutes,
      description: normalizedContent.description,
      split: null,
      isAIGenerated: true,
      contentType: contentType,
      content: normalizedContent.content
    };
    
    // Remove any undefined or problematic properties
    Object.keys(cleanResource).forEach(key => {
      if (cleanResource[key as keyof typeof cleanResource] === undefined) {
        delete cleanResource[key as keyof typeof cleanResource];
      }
    });
    
    // Ensure no problematic keys exist in the final resource
    const finalResource = JSON.parse(JSON.stringify(cleanResource));
    
    // Double-check: remove any problematic keys that might have slipped through
    delete (finalResource as any).podcast_script;
    delete (finalResource as any).article;
    delete (finalResource as any).content?.podcast_script;
    delete (finalResource as any).content?.article;
    
    return finalResource;
  } catch (error) {
    console.error('Gemini content generation failed:', error);
    // If quota exceeded, return a fallback content
    if (error instanceof Error && error.message && error.message.includes('429')) {
      return {
        kind: contentType === 'podcast' ? 'listen' : 'read',
        title: `${dayTitle} - ${contentType === 'podcast' ? 'Podcast' : 'Article'}`,
        url: `#ai-content-unavailable`,
        source: 'AI Generated (Fallback)',
        duration_minutes: contentType === 'podcast' ? 20 : 15,
        split: null,
        isAIGenerated: true,
        contentType: contentType,
        content: `This ${contentType} about "${dayTitle}" is temporarily unavailable due to API limits. Please try again later.`
      };
    }
    return null;
  }
}

// Generate daily quiz questions using Gemini
async function generateDailyQuiz(dayTitle: string, dayNumber: number, goal: string): Promise<any[]> {
  try {
    const quizPrompt = `Create a 5-10 question multiple choice quiz about "${dayTitle}" for someone learning "${goal}".

Requirements:
- 5-10 questions total
- Each question should have 4 multiple choice options (A, B, C, D)
- Only one correct answer per question
- Questions should test understanding of the day's topic
- Include practical application questions
- Make questions progressively challenging

Return a JSON array of questions:
[
  {
    "question": "What is the main concept of ${dayTitle}?",
    "options": {
      "A": "Option 1",
      "B": "Option 2", 
      "C": "Option 3",
      "D": "Option 4"
    },
    "correct": "A",
    "explanation": "Brief explanation of why this is correct"
  }
]`;

    const result = await model.generateContent(quizPrompt);
    const response = await result.response;
    const text = response.text();
    
    // Extract JSON from response with better parsing
    let jsonText = text;
    if (text.includes('```json')) {
      jsonText = text.split('```json')[1].split('```')[0].trim();
    } else if (text.includes('```')) {
      jsonText = text.split('```')[1].split('```')[0].trim();
    }
    
    // Clean up the JSON text
    jsonText = jsonText.replace(/[\r\n\t]/g, ' ').replace(/\s+/g, ' ').trim();
    
    let quiz;
    try {
      quiz = JSON.parse(jsonText);
    } catch (parseError) {
      console.error('JSON parsing failed for quiz, using fallback quiz');
      quiz = [
        {
          question: `What did you learn about ${dayTitle} today?`,
          options: {
            "A": "Basic concepts",
            "B": "Advanced techniques", 
            "C": "Both A and B",
            "D": "Nothing"
          },
          correct: "C",
          explanation: "You should have learned both basic concepts and some advanced techniques."
        }
      ];
    }
    return quiz;
  } catch (error) {
    console.error('Quiz generation failed:', error);
    // Return a simple fallback quiz
    return [
      {
        question: `What did you learn about ${dayTitle} today?`,
        options: {
          "A": "Basic concepts",
          "B": "Advanced techniques", 
          "C": "Both A and B",
          "D": "Nothing"
        },
        correct: "C",
        explanation: "You should have learned both basic concepts and some advanced techniques."
      },
      {
        question: `How confident do you feel about ${dayTitle}?`,
        options: {
          "A": "Very confident",
          "B": "Somewhat confident",
          "C": "Not very confident",
          "D": "Not confident at all"
        },
        correct: "B",
        explanation: "It's normal to feel somewhat confident as you're still learning."
      }
    ];
  }
}

// OPTIMIZED: Process multiple days in parallel for much faster generation
async function processDaysInParallel(days: any[], params: RoadmapParams, usedResourceUrls: Set<string>, usedResourceTitles: Set<string>, usedResourceDomains: Set<string>, progressCallback?: (progress: number, message: string) => void, abortSignal?: AbortSignal): Promise<void> {
  const BATCH_SIZE = 3; // Process 3 days at a time for optimal speed
  
  for (let i = 0; i < days.length; i += BATCH_SIZE) {
    // Check if aborted before processing batch
    if (abortSignal?.aborted) {
      console.log('Generation was aborted during batch processing');
      return;
    }
    
    const batch = days.slice(i, i + BATCH_SIZE);
    const batchPromises = batch.map(async (day, batchIndex) => {
      // Check if aborted before processing individual day
      if (abortSignal?.aborted) {
        console.log('Generation was aborted during day processing');
        return;
      }
      
      const dayIndex = i + batchIndex;
      const dayProgress = 30 + (dayIndex / days.length) * 60;
      progressCallback?.(Math.round(dayProgress), `Processing day ${day.day}: ${day.title}`);
      
      // Clear existing arrays
      day.learn = [];
      day.practice = [];
      
      // Create search terms
      // Create more specific and diverse search terms for better resource discovery
      const baseTitle = day.title.replace(/day \d+:/gi, '').replace(/:/g, '').trim();
      const searchTerms = [
        `${baseTitle} tutorial`,
        `${baseTitle} how to`,
        `${baseTitle} beginner guide`,
        `${baseTitle} step by step`,
        `${baseTitle} learn`,
        `${baseTitle} basics`,
        `${baseTitle} video`,
        `${baseTitle} course`
      ];
      
      // AGGRESSIVE: Try multiple search strategies in parallel for maximum resource discovery
      const searchPromises = [];
      
      // Try multiple search terms for watch resources (increased to 8 for better coverage)
      for (let i = 0; i < Math.min(8, searchTerms.length); i++) {
        searchPromises.push(
          fetch(`/api/scrape-resources?q=${encodeURIComponent(searchTerms[i])}&type=watch`, {
            signal: AbortSignal.timeout(30000) // 30 second timeout per search
          }).then(async (response) => {
            if (response.ok) {
              const data = await response.json();
              return { type: 'watch', data: data.resources || [], query: searchTerms[i] };
            }
            return { type: 'watch', data: [], query: searchTerms[i] };
          }).catch(() => ({ type: 'watch', data: [], query: searchTerms[i] }))
        );
      }
      
      // Try multiple search terms for read resources (increased to 6 for better coverage)
      for (let i = 0; i < Math.min(6, searchTerms.length); i++) {
        searchPromises.push(
          fetch(`/api/scrape-resources?q=${encodeURIComponent(searchTerms[i])}&type=read`, {
            signal: AbortSignal.timeout(30000) // 30 second timeout per search
          }).then(async (response) => {
            if (response.ok) {
              const data = await response.json();
              return { type: 'read', data: data.resources || [], query: searchTerms[i] };
            }
            return { type: 'read', data: [], query: searchTerms[i] };
          }).catch(() => ({ type: 'read', data: [], query: searchTerms[i] }))
        );
      }
      
      const searchResults = await Promise.allSettled(searchPromises);
      
      // Process all watch results
      const watchResources: any[] = [];
      const readResources: any[] = [];
      
      searchResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          if (result.value.type === 'watch') {
            watchResources.push(...result.value.data);
          } else if (result.value.type === 'read') {
            readResources.push(...result.value.data);
          }
        }
      });
      
      // Process watch resources (aggregated from multiple searches)
      console.log(`Processing ${watchResources.length} watch resources for day ${day.day}`);
      if (watchResources.length > 0) {
        const newResources = watchResources.filter((resource: any) => {
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
        console.log(`After deduplication: ${newResources.length} unique watch resources`);
        
        const resourcesToAdd = newResources.slice(0, 2);
        resourcesToAdd.forEach((resource: any) => {
          // Skip empty or invalid resources
          if (!resource || typeof resource !== 'object' || Object.keys(resource).length === 0) {
            return;
          }
          
          // Only use real titles, don't generate generic ones
          if (!resource.title || resource.title.trim() === '' || resource.title.includes('http') || resource.title.includes('Video Tutorial') || resource.title.includes('Article')) {
            return; // Skip this resource instead of using generic title
          }
          
          // Add description if not present
          if (!resource.description) {
            resource.description = `Learn ${day.title.toLowerCase()} with this comprehensive video tutorial.`;
          }
          
          usedResourceUrls.add(resource.url);
          usedResourceTitles.add(resource.title.toLowerCase());
          day.learn.push(resource);
        });
        console.log(`Added ${resourcesToAdd.length} watch resources for day ${day.day}`);
      } else {
        console.log(`No watch resources found for day ${day.day}`);
      }
      
      // Process read resources (aggregated from multiple searches)
      if (readResources.length > 0) {
        const newResources = readResources.filter((resource: any) => {
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
        
        const resourcesToAdd = newResources.slice(0, 2);
        resourcesToAdd.forEach((resource: any) => {
          // Skip empty or invalid resources
          if (!resource || typeof resource !== 'object' || Object.keys(resource).length === 0) {
            return;
          }
          
          // Only use real titles, don't generate generic ones
          if (!resource.title || resource.title.trim() === '' || resource.title.includes('http') || resource.title.includes('Video Tutorial') || resource.title.includes('Article')) {
            return; // Skip this resource instead of using generic title
          }
          
          // Add description if not present
          if (!resource.description) {
            resource.description = `Learn ${day.title.toLowerCase()} with this comprehensive article and guide.`;
          }
          
          usedResourceUrls.add(resource.url);
          usedResourceTitles.add(resource.title.toLowerCase());
          day.learn.push(resource);
        });
        console.log(`Found ${resourcesToAdd.length} read resources for day ${day.day}`);
      } else {
        console.log(`No read resources found for day ${day.day}`);
      }
      
      // STRICT GUIDELINE: Every day must have at least 1 real resource + 1 AI resource
      // If no real resources found, generate a fallback real resource
      if (day.learn.length === 0) {
        console.log(`No real resources found for day ${day.day}, creating fallback real resource...`);
        const fallbackResource = {
          kind: 'read' as const,
          title: `${day.title} - Complete Guide`,
          url: `https://www.google.com/search?q=${encodeURIComponent(day.title + ' ' + params.goal + ' tutorial guide')}`,
          source: 'Google Search',
          duration_minutes: 15,
          description: `Comprehensive guide covering ${day.title.toLowerCase()} fundamentals and practical applications.`
        };
        day.learn.push(fallbackResource);
      }
      
      // Always add 1 AI-generated resource per day
      console.log(`Adding AI-generated resource for day ${day.day}...`);
      try {
        const geminiArticle = await generateGeminiContent(day.title, day.day, params.goal, 'article');
        if (geminiArticle) {
          day.learn.push(geminiArticle);
        }
      } catch (error) {
        console.error(`AI content generation failed for day ${day.day}:`, error);
      }
      
      // Add practice exercises
      const practiceExercises = generateCreativePracticeExercises(day.title, day.day, params.goal);
      day.practice.push(...practiceExercises);
      
      // Generate quiz (simplified - only if we have resources)
      if (day.learn.length > 0) {
        try {
          const quiz = await generateDailyQuiz(day.title, day.day, params.goal);
          (day as any).quiz = quiz;
        } catch (error) {
          console.error(`Quiz generation failed for day ${day.day}:`, error);
          (day as any).quiz = [];
        }
      } else {
        (day as any).quiz = [];
      }
      
      console.log(`Day ${day.day} completed with ${day.learn.length} learn, ${day.practice.length} practice resources`);
    });
    
    // Wait for current batch to complete before starting next batch
    await Promise.all(batchPromises);
  }
}

// OPTIMIZED: Fast roadmap generation with parallel processing
export async function generateRoadmapWithDirectScraping(params: RoadmapParams, progressCallback?: (progress: number, message: string) => void, abortSignal?: AbortSignal): Promise<RoadmapT> {
  // Clear any existing problematic content
  clearProblematicContent();
  
  let roadmap: RoadmapT | undefined;
  
  try {
    console.log('Generating FAST roadmap with direct scraping for:', params.goal);
    
    // Check if aborted before starting
    if (abortSignal?.aborted) {
      throw new Error('Generation was aborted');
    }
    
    // Track used resources to prevent duplicates
    const usedResourceUrls = new Set<string>();
    const usedResourceTitles = new Set<string>();
    const usedResourceDomains = new Set<string>();
    
    // Step 1: Generate roadmap structure with Gemini (with retry)
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
    const maxRetries = 2; // Reduced retries for speed
    
    while (retryCount < maxRetries) {
      try {
        structureResult = await model.generateContent(structurePrompt);
        structureText = structureResult.response.text();
        break; // Success, exit retry loop
      } catch (error: any) {
        retryCount++;
        console.error(`Gemini API attempt ${retryCount} failed:`, error.message);
        
        if (retryCount >= maxRetries) {
          console.log('Gemini failed, using fallback roadmap structure');
          const fallbackRoadmap = createFallbackRoadmap(params);
          return fallbackRoadmap;
        } else {
          // Wait shorter time for speed
          const waitTime = 1000 * retryCount;
          console.log(`API error, waiting ${waitTime}ms before retry ${retryCount + 1}`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }
    
    if (!structureText) {
      console.log('Gemini failed, using fallback roadmap structure');
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
      const fallbackRoadmap = createFallbackRoadmap(params);
      return fallbackRoadmap;
    }
    
    // Step 2: Process days in parallel for much faster generation
    console.log('Finding real resources for each day (FAST MODE)...');
    progressCallback?.(30, "Finding real resources...");
    
    await processDaysInParallel(roadmap.days, params, usedResourceUrls, usedResourceTitles, usedResourceDomains, progressCallback, abortSignal);
    
    progressCallback?.(100, "Roadmap generation completed!");
    console.log('FAST roadmap generation completed successfully');
    return roadmap;
    
  } catch (error) {
    // Check if the error is due to abortion
    if (error instanceof Error && (error.name === 'AbortError' || error.message?.includes('aborted'))) {
      console.log('Roadmap generation was aborted by user');
      throw error; // Re-throw so service can handle it properly
    }
    
    // Check if it's a timeout error (not user abortion)
    if (error instanceof Error && error.name === 'TimeoutError') {
      console.log('Roadmap generation timed out, but continuing with available resources');
      // Don't throw, just return what we have if roadmap exists
      if (roadmap) {
        return roadmap;
      }
      // If no roadmap exists, create a fallback
      const fallbackRoadmap = createFallbackRoadmap(params);
      return fallbackRoadmap;
    }
    
    console.error('Fast roadmap generation failed:', error);
    throw error;
  }
}
