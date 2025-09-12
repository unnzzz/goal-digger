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
  
  // Extract the core topic from the day title
  const coreTopic = dayTitle.replace(/day \d+:/gi, '').replace(/:/g, '').trim();
  
  // Generate contextual practice exercises based on the specific day title and goal
  let exercise1Title = '';
  let exercise1Description = '';
  let exercise2Title = '';
  let exercise2Description = '';
  
  // Create specific exercises based on the exact day title and goal context
  if (goal.toLowerCase().includes('filmmaking') || goal.toLowerCase().includes('film')) {
    if (coreTopic.toLowerCase().includes('camera') || coreTopic.toLowerCase().includes('exposure')) {
      exercise1Title = `Exposure Triangle Mastery: ${coreTopic} Challenge`;
      exercise1Description = `Set up your camera in manual mode and spend 2 hours creating a visual diary of different exposure scenarios. Find 5 different lighting situations (bright sunlight, indoor tungsten, fluorescent, golden hour, blue hour) and for each, take 3 photos: one correctly exposed, one 2 stops overexposed, and one 2 stops underexposed. Document your ISO, aperture, and shutter speed settings for each shot. Create a reference guide showing how different settings affect the mood and quality of your images.`;
      exercise2Title = `Cinematic Exposure Story: ${coreTopic} Narrative`;
      exercise2Description = `Create a 1-minute visual story using only exposure techniques to convey emotion. Choose a simple narrative (like "a day in the life" or "mood changes") and use different exposure settings to tell the story. Start with a bright, overexposed shot (happiness), move to balanced exposure (neutral), then underexposed (melancholy). Edit the sequence and add a voiceover explaining how each exposure choice supports your story. Share your work and explain your creative decisions.`;
    } else if (coreTopic.toLowerCase().includes('lighting')) {
      exercise1Title = `Three-Point Lighting Lab: ${coreTopic} Experiment`;
      exercise1Description = `Set up a complete three-point lighting system in your space using whatever lights you have available (desk lamps, phone flashlights, natural light). Practice lighting a subject (person or object) with different key light positions: 45 degrees, 90 degrees, and 30 degrees. For each position, adjust your fill light and back light to create different moods. Take photos of each setup and create a mood board showing how lighting position affects the emotional impact. Document your setup process and lighting ratios.`;
      exercise2Title = `Mood Lighting Project: ${coreTopic} Storytelling`;
      exercise2Description = `Create a series of 6 portraits of the same person using only lighting to convey different emotions: joy, sadness, mystery, confidence, vulnerability, and anger. Use the same background and subject position - only change your lighting setup. Experiment with hard vs soft light, high vs low key, warm vs cool color temperatures. Present your work as a visual story with captions explaining how each lighting choice creates the desired emotional response.`;
    } else if (coreTopic.toLowerCase().includes('editing')) {
      exercise1Title = `Rhythm and Pacing Workshop: ${coreTopic} Techniques`;
      exercise1Description = `Find or shoot 2-3 minutes of raw footage and create 3 different edits with completely different pacing: fast-paced (quick cuts, high energy), slow-paced (long takes, contemplative), and mixed pacing (varied rhythm). Use the same footage but different editing techniques: jump cuts, match cuts, cross-cutting, montage. Export all three versions and analyze how editing choices affect the viewer's emotional experience. Document your editing decisions and their impact.`;
      exercise2Title = `Complete Short Film: ${coreTopic} Mastery`;
      exercise2Description = `Plan, shoot, and edit a 2-3 minute short film that demonstrates your editing skills. Choose a simple story that requires different editing techniques: dialogue scenes, action sequences, montages, and transitions. Focus on creating smooth, professional-looking cuts and using editing to enhance your story. Add music and sound effects. Create a director's commentary track explaining your editing choices and how they serve the story.`;
    } else if (coreTopic.toLowerCase().includes('composition')) {
      exercise1Title = `Rule of Thirds Challenge: ${coreTopic} Practice`;
      exercise1Description = `Spend 2 hours shooting 20 different subjects using only the rule of thirds for composition. Find subjects in your environment: people, objects, landscapes, architecture. For each subject, take 3 shots: one with the subject on the left third, one on the right third, and one on the bottom third. Compare how different placements affect the visual impact. Create a portfolio showing your best compositions and explain why each works.`;
      exercise2Title = `Composition Story: ${coreTopic} Narrative`;
      exercise2Description = `Create a visual story using only composition to guide the viewer's eye through a sequence. Choose a simple narrative (like "following a path" or "discovering something") and use leading lines, framing, and the rule of thirds to create a compelling visual journey. Shoot 8-10 images that tell your story through composition alone. Present your work as a photo essay with captions explaining how each composition choice advances your narrative.`;
    } else {
      exercise1Title = `Technical Deep Dive: ${coreTopic} Mastery`;
      exercise1Description = `Spend 3 hours thoroughly exploring the technical aspects of ${coreTopic.toLowerCase()}. Set up controlled experiments to test different techniques, document your findings, and create a personal reference guide. Focus on understanding not just how to do something, but why it works and when to use it. Troubleshoot common problems and document solutions. Create a video tutorial explaining what you learned.`;
      exercise2Title = `Creative Application: ${coreTopic} Project`;
      exercise2Description = `Apply your ${coreTopic.toLowerCase()} knowledge to a creative project that excites you. Choose something personal - perhaps documenting a family event, creating an artistic piece, or telling a story that matters to you. Use this project to push your skills further and discover your unique creative voice. Document your process, challenges, and breakthroughs. Share your work and reflect on what you learned.`;
    }
  } else if (goal.toLowerCase().includes('programming') || goal.toLowerCase().includes('coding')) {
    if (coreTopic.toLowerCase().includes('javascript') || coreTopic.toLowerCase().includes('js')) {
      exercise1Title = `JavaScript Fundamentals Lab: ${coreTopic} Practice`;
      exercise1Description = `Build a series of small JavaScript projects that demonstrate your understanding of ${coreTopic.toLowerCase()}. Start with simple examples and gradually increase complexity. Focus on writing clean, well-commented code and implementing best practices. Create a portfolio of your work with live demos and source code. Document your learning process and challenges you overcame.`;
      exercise2Title = `Full-Stack Application: ${coreTopic} Showcase`;
      exercise2Description = `Create a complete web application using ${coreTopic.toLowerCase()} as a core feature. Plan the project architecture, design the user interface, implement the functionality, and deploy it online. Focus on creating something useful and user-friendly while showcasing your technical skills. Consider adding features like user authentication, data persistence, and responsive design.`;
    } else if (coreTopic.toLowerCase().includes('react')) {
      exercise1Title = `React Component Workshop: ${coreTopic} Building`;
      exercise1Description = `Build a collection of reusable React components that demonstrate your understanding of ${coreTopic.toLowerCase()}. Focus on creating components that are modular, well-documented, and easy to use. Implement proper prop validation, error handling, and accessibility features. Create a storybook or documentation site to showcase your components.`;
      exercise2Title = `React Application: ${coreTopic} in Action`;
      exercise2Description = `Develop a complete React application that solves a real problem or provides value to users. Plan the project structure, implement state management, handle routing, and integrate with external APIs if needed. Focus on creating a polished, production-ready application with proper error handling, loading states, and user feedback.`;
    } else if (coreTopic.toLowerCase().includes('python')) {
      exercise1Title = `Python Project Lab: ${coreTopic} Implementation`;
      exercise1Description = `Create a Python project that demonstrates your understanding of ${coreTopic.toLowerCase()}. Choose something practical - perhaps a data analysis script, a web scraper, or a small automation tool. Focus on writing clean, well-documented code and following Python best practices. Test your code thoroughly and handle edge cases. Document your development process and lessons learned.`;
      exercise2Title = `Python Application: ${coreTopic} Showcase`;
      exercise2Description = `Build a complete Python application that showcases your ${coreTopic.toLowerCase()} skills. Consider creating a web app with Flask/Django, a data visualization tool, or a machine learning project. Focus on creating something useful and well-architected. Deploy your application and create documentation for other developers.`;
    } else {
      exercise1Title = `Code Practice Session: ${coreTopic} Deep Dive`;
      exercise1Description = `Spend 3-4 hours coding and experimenting with ${coreTopic.toLowerCase()}. Start with simple examples and gradually increase complexity. Focus on understanding the underlying concepts, not just memorizing syntax. Debug issues as they arise and document your learning process. Create a portfolio of your work to showcase your progress.`;
      exercise2Title = `Technical Project: ${coreTopic} Application`;
      exercise2Description = `Build a complete project that demonstrates your mastery of ${coreTopic.toLowerCase()}. Choose something that interests you and provides real value. Focus on creating clean, maintainable code and a polished user experience. Consider open-sourcing your project and contributing to the developer community.`;
    }
  } else if (goal.toLowerCase().includes('language') || goal.toLowerCase().includes('spanish') || goal.toLowerCase().includes('french')) {
    exercise1Title = `Conversation Practice: ${coreTopic} in Action`;
    exercise1Description = `Find a language exchange partner or use language learning apps to practice ${coreTopic.toLowerCase()} in real conversations. Focus on using the specific vocabulary and grammar structures you've learned. Record yourself speaking and listen back to identify areas for improvement. Practice for at least 30 minutes and keep a journal of new words and phrases you discover.`;
    exercise2Title = `Creative Writing Challenge: ${coreTopic} Story`;
    exercise2Description = `Write a short story, poem, or essay using ${coreTopic.toLowerCase()} as a central theme. Aim for 200-300 words and focus on using the language structures you've learned. Share your writing with native speakers for feedback, or post it in language learning communities. Use this as an opportunity to express yourself creatively while practicing your language skills.`;
  } else if (goal.toLowerCase().includes('cooking') || goal.toLowerCase().includes('chef')) {
    if (coreTopic.toLowerCase().includes('knife') || coreTopic.toLowerCase().includes('cut')) {
      exercise1Title = `Knife Skills Mastery: ${coreTopic} Practice`;
      exercise1Description = `Spend 2 hours practicing different knife cuts with various vegetables. Start with basic cuts (dice, julienne, chiffonade) and progress to advanced techniques. Practice with carrots, onions, celery, and herbs. Focus on proper technique, safety, and consistency. Time yourself and try to improve your speed while maintaining quality. Document your progress with photos and notes.`;
      exercise2Title = `Knife Skills Showcase: ${coreTopic} Challenge`;
      exercise2Description = `Create a beautiful vegetable platter using only knife skills to showcase different cuts. Choose 5-6 different vegetables and create a visually stunning arrangement. Practice precision cuts, decorative techniques, and presentation. Take photos of your work and explain the techniques you used. Share your creation and get feedback from others.`;
    } else if (coreTopic.toLowerCase().includes('sauce') || coreTopic.toLowerCase().includes('sauté')) {
      exercise1Title = `Sauce Making Lab: ${coreTopic} Experiment`;
      exercise1Description = `Practice making different types of sauces and cooking techniques. Start with basic sauces (béchamel, velouté, hollandaise) and progress to more complex ones. Experiment with different heat levels, timing, and ingredient ratios. Document your process, note what works and what doesn't, and create a personal recipe collection.`;
      exercise2Title = `Complete Dish: ${coreTopic} Mastery`;
      exercise2Description = `Create a complete dish that showcases your sauce-making and cooking skills. Plan a menu item that incorporates multiple techniques you've learned. Focus on presentation, flavor balance, and technical execution. Plate your dish beautifully and document the process. Share your creation and explain the techniques you used.`;
    } else {
      exercise1Title = `Cooking Practice: ${coreTopic} Fundamentals`;
      exercise1Description = `Spend 2-3 hours practicing the specific cooking techniques covered in today's lesson. Focus on proper technique, timing, and temperature control. Experiment with different ingredients and methods. Document your process and create a reference guide for future use.`;
      exercise2Title = `Creative Cooking: ${coreTopic} Project`;
      exercise2Description = `Create a unique dish that demonstrates your understanding of ${coreTopic.toLowerCase()}. Use your creativity to combine techniques and ingredients in new ways. Focus on presentation, flavor, and technical execution. Document your creative process and share your creation.`;
    }
  } else if (goal.toLowerCase().includes('design') || goal.toLowerCase().includes('ui') || goal.toLowerCase().includes('ux')) {
    if (coreTopic.toLowerCase().includes('color') || coreTopic.toLowerCase().includes('typography')) {
      exercise1Title = `Design System Lab: ${coreTopic} Exploration`;
      exercise1Description = `Create a comprehensive design system focusing on ${coreTopic.toLowerCase()}. Develop a color palette with primary, secondary, and accent colors, or a typography scale with different font weights and sizes. Create examples showing how these elements work together. Document your design decisions and create guidelines for consistent use.`;
      exercise2Title = `Design Project: ${coreTopic} Application`;
      exercise2Description = `Apply your ${coreTopic.toLowerCase()} knowledge to a complete design project. Create a mobile app interface, website, or branding project that showcases your design skills. Focus on user experience, visual hierarchy, and aesthetic appeal. Present your work professionally and explain your design choices.`;
    } else {
      exercise1Title = `Design Practice: ${coreTopic} Skills`;
      exercise1Description = `Spend 2-3 hours practicing the specific design techniques covered in today's lesson. Create multiple iterations and experiment with different approaches. Focus on understanding design principles and how they apply to real projects. Document your process and create a portfolio of your work.`;
      exercise2Title = `Creative Design: ${coreTopic} Project`;
      exercise2Description = `Create a unique design project that demonstrates your understanding of ${coreTopic.toLowerCase()}. Use your creativity to explore new possibilities and push your skills further. Focus on innovation, user experience, and visual impact. Document your creative process and share your work.`;
    }
  } else {
    // Generic but contextual exercises for any other goal
    exercise1Title = `Practical Application: ${coreTopic} Practice`;
    exercise1Description = `Spend 2-3 hours actively practicing the specific concepts you've learned about ${coreTopic.toLowerCase()}. Create something tangible that demonstrates your understanding. Focus on applying the knowledge in a practical way and documenting your process. Experiment with different approaches and see what works best for you.`;
    exercise2Title = `Creative Project: ${coreTopic} Showcase`;
    exercise2Description = `Create a comprehensive project that showcases your ${coreTopic.toLowerCase()} skills. Choose something that excites you and allows you to express your creativity while applying what you've learned. Focus on creating something of value that you can be proud of and share with others. Document your creative process and reflect on what you learned.`;
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
      console.log('Storing AI content with slug:', slug);
      console.log('Content to store:', contentToStore);
      localStorage.setItem(`ai-content-${slug}`, JSON.stringify(contentToStore));
      console.log('AI content stored successfully');
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
        `${baseTitle} how to guide`,
        `${baseTitle} beginner tutorial`,
        `${baseTitle} step by step guide`,
        `${baseTitle} learn ${baseTitle}`,
        `${baseTitle} basics tutorial`,
        `${baseTitle} video tutorial`,
        `${baseTitle} complete guide`,
        `${baseTitle} masterclass`,
        `${baseTitle} workshop`
      ];
      
      // AGGRESSIVE: Try multiple search strategies in parallel for maximum resource discovery
      const searchPromises = [];
      
      // Try multiple search terms for watch resources (increased to 10 for better coverage)
      for (let i = 0; i < Math.min(10, searchTerms.length); i++) {
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
      
      // Try multiple search terms for read resources (increased to 8 for better coverage)
      for (let i = 0; i < Math.min(8, searchTerms.length); i++) {
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
      // If no real resources found, try more aggressive search strategies
      if (day.learn.length === 0) {
        console.log(`No real resources found for day ${day.day}, trying aggressive search strategies...`);
        
        // Try more specific search terms for this day
        const specificSearchTerms = [
          `${day.title} tutorial site:youtube.com`,
          `${day.title} guide site:medium.com`,
          `${day.title} course site:udemy.com`,
          `${day.title} lesson site:skillshare.com`,
          `${day.title} basics site:freecodecamp.org`,
          `${day.title} fundamentals site:mdn.mozilla.org`,
          `${day.title} examples site:github.com`,
          `${day.title} documentation site:docs.microsoft.com`
        ];
        
        // Try one more aggressive search attempt
        try {
          const aggressiveSearch = await fetch(`/api/scrape-resources?q=${encodeURIComponent(specificSearchTerms[0])}&type=read`, {
            signal: AbortSignal.timeout(45000) // 45 second timeout for aggressive search
          });
          
          if (aggressiveSearch.ok) {
            const aggressiveData = await aggressiveSearch.json();
            const aggressiveResources = aggressiveData.resources || [];
            
            if (aggressiveResources.length > 0) {
              const bestResource = aggressiveResources[0];
              if (bestResource.title && bestResource.url && !bestResource.title.includes('Google')) {
                bestResource.description = `Comprehensive guide covering ${day.title.toLowerCase()} fundamentals and practical applications.`;
                day.learn.push(bestResource);
                console.log(`Found aggressive search resource for day ${day.day}`);
              }
            }
          }
        } catch (error) {
          console.error(`Aggressive search failed for day ${day.day}:`, error);
        }
        
        // If still no resources, we'll rely on AI content only
        if (day.learn.length === 0) {
          console.log(`No real resources found after aggressive search for day ${day.day}, will use AI content only`);
        }
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
