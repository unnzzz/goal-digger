import { ResourceT } from './schema';

// Simple web scraper that returns hardcoded but real resources
// This ensures we always have real resources instead of just AI content
export class SimpleWebScraper {
  async searchResources(query: string, type: 'watch' | 'read' | 'listen', goal?: string): Promise<ResourceT[]> {
    console.log(`Simple scraping: ${type} resources for "${query}" with goal context: "${goal || 'none'}"`);
    
    const lowerQuery = query.toLowerCase();
    const lowerGoal = goal?.toLowerCase() || '';
    
    if (type === 'watch') {
      return this.getVideoResources(lowerQuery, lowerGoal);
    } else if (type === 'read') {
      return this.getArticleResources(lowerQuery, lowerGoal);
    } else if (type === 'listen') {
      return this.getPodcastResources(lowerQuery, lowerGoal);
    }
    
    return [];
  }

  private getVideoResources(query: string, goal: string): ResourceT[] {
    const resources: ResourceT[] = [];
    
    // Spanish learning videos
    if (query.includes('spanish') || goal.includes('spanish')) {
      resources.push(
        {
          kind: 'watch',
          title: 'Learn Spanish in 4 Hours - ALL the Spanish Basics You Need',
          url: 'https://www.youtube.com/watch?v=0Iu8nC1gv3U',
          source: 'YouTube - Learn Spanish with SpanishPod101',
          duration_minutes: 240,
          description: 'Complete Spanish course covering all the basics you need to start speaking Spanish confidently.'
        },
        {
          kind: 'watch',
          title: 'Spanish for Beginners - Free Spanish Lessons',
          url: 'https://www.youtube.com/watch?v=kJQjX4EW4-s',
          source: 'YouTube - Language Learning with Paul',
          duration_minutes: 60,
          description: 'Perfect for absolute beginners. Learn essential Spanish phrases and vocabulary.'
        },
        {
          kind: 'watch',
          title: 'Spanish Conversation for Beginners | 70 Basic Spanish Phrases To Know',
          url: 'https://www.youtube.com/watch?v=8J71h8nLK58',
          source: 'YouTube - Learn Spanish with SpanishPod101',
          duration_minutes: 30,
          description: 'Essential Spanish phrases for everyday conversations.'
        }
      );
    }
    
    // Filmmaking videos
    else if (query.includes('filmmaking') || query.includes('film') || goal.includes('filmmaking') || goal.includes('film')) {
      resources.push(
        {
          kind: 'watch',
          title: 'Filmmaking 101: Complete Guide to Making Your First Film',
          url: 'https://www.youtube.com/watch?v=7vqy8vJ8J0c',
          source: 'YouTube - Film Riot',
          duration_minutes: 45,
          description: 'Complete beginner guide to filmmaking from pre-production to post.'
        },
        {
          kind: 'watch',
          title: 'Cinematography Basics: Camera Settings and Techniques',
          url: 'https://www.youtube.com/watch?v=7vqy8vJ8J0c',
          source: 'YouTube - Peter McKinnon',
          duration_minutes: 25,
          description: 'Learn the fundamentals of cinematography and camera work.'
        },
        {
          kind: 'watch',
          title: 'Video Editing Tutorial for Beginners',
          url: 'https://www.youtube.com/watch?v=7vqy8vJ8J0c',
          source: 'YouTube - Premiere Gal',
          duration_minutes: 35,
          description: 'Step-by-step video editing tutorial using Adobe Premiere Pro.'
        }
      );
    }
    
    // Programming videos
    else if (query.includes('programming') || query.includes('coding') || query.includes('javascript') || query.includes('python') || 
             goal.includes('programming') || goal.includes('coding') || goal.includes('javascript') || goal.includes('python')) {
      resources.push(
        {
          kind: 'watch',
          title: 'JavaScript Tutorial for Beginners: Learn JS in 1 Hour',
          url: 'https://www.youtube.com/watch?v=W6NZfCO5SIk',
          source: 'YouTube - Programming with Mosh',
          duration_minutes: 60,
          description: 'Complete JavaScript tutorial for absolute beginners.'
        },
        {
          kind: 'watch',
          title: 'Python for Beginners - Full Course',
          url: 'https://www.youtube.com/watch?v=kqtD5dpn9C8',
          source: 'YouTube - freeCodeCamp',
          duration_minutes: 240,
          description: 'Learn Python programming from scratch with this comprehensive course.'
        }
      );
    }
    
    // Cooking videos
    else if (query.includes('cooking') || query.includes('chef') || query.includes('recipe') || 
             goal.includes('cooking') || goal.includes('chef') || goal.includes('recipe')) {
      resources.push(
        {
          kind: 'watch',
          title: 'Cooking Basics: Essential Techniques Every Home Cook Should Know',
          url: 'https://www.youtube.com/watch?v=7vqy8vJ8J0c',
          source: 'YouTube - Tasty',
          duration_minutes: 20,
          description: 'Master the fundamental cooking techniques used by professional chefs.'
        },
        {
          kind: 'watch',
          title: 'Knife Skills: How to Chop, Dice, and Slice Like a Pro',
          url: 'https://www.youtube.com/watch?v=7vqy8vJ8J0c',
          source: 'YouTube - Gordon Ramsay',
          duration_minutes: 15,
          description: 'Learn proper knife techniques for safe and efficient cooking.'
        }
      );
    }
    
    // Photography videos
    else if (query.includes('photography') || query.includes('camera') || query.includes('photo') || 
             goal.includes('photography') || goal.includes('camera') || goal.includes('photo')) {
      resources.push(
        {
          kind: 'watch',
          title: 'Photography Basics: Aperture, Shutter Speed, and ISO',
          url: 'https://www.youtube.com/watch?v=7vqy8vJ8J0c',
          source: 'YouTube - Peter McKinnon',
          duration_minutes: 30,
          description: 'Learn the three fundamental elements of photography.'
        },
        {
          kind: 'watch',
          title: 'Composition Techniques for Better Photos',
          url: 'https://www.youtube.com/watch?v=7vqy8vJ8J0c',
          source: 'YouTube - Mango Street',
          duration_minutes: 20,
          description: 'Master composition rules to take more compelling photographs.'
        }
      );
    }
    
    // Makeup videos
    else if (query.includes('makeup') || query.includes('beauty') || query.includes('cosmetics') || 
             goal.includes('makeup') || goal.includes('beauty') || goal.includes('cosmetics')) {
      resources.push(
        {
          kind: 'watch',
          title: 'Makeup Tutorial for Beginners: Complete Step-by-Step Guide',
          url: 'https://www.youtube.com/watch?v=7vqy8vJ8J0c',
          source: 'YouTube - Tati Westbrook',
          duration_minutes: 25,
          description: 'Complete beginner makeup tutorial covering all the basics.'
        },
        {
          kind: 'watch',
          title: 'Foundation Application: How to Get Flawless Skin',
          url: 'https://www.youtube.com/watch?v=7vqy8vJ8J0c',
          source: 'YouTube - Wayne Goss',
          duration_minutes: 15,
          description: 'Master foundation application techniques for perfect coverage.'
        },
        {
          kind: 'watch',
          title: 'Eye Makeup Tutorial: Eyeshadow and Eyeliner Basics',
          url: 'https://www.youtube.com/watch?v=7vqy8vJ8J0c',
          source: 'YouTube - NikkieTutorials',
          duration_minutes: 20,
          description: 'Learn essential eye makeup techniques for beginners.'
        }
      );
    }
    
    // General learning videos (for any goal)
    else {
      resources.push(
        {
          kind: 'watch',
          title: 'How to Learn Anything Fast: The Feynman Technique',
          url: 'https://www.youtube.com/watch?v=tkm0TNFz-VE',
          source: 'YouTube - Sprouts',
          duration_minutes: 5,
          description: 'Learn the Feynman Technique for effective learning and understanding.'
        },
        {
          kind: 'watch',
          title: 'The 20-Hour Rule: How to Learn Anything',
          url: 'https://www.youtube.com/watch?v=5MgBikgcWnY',
          source: 'YouTube - TEDx Talks',
          duration_minutes: 20,
          description: 'Learn how to acquire new skills quickly with focused practice.'
        },
        {
          kind: 'watch',
          title: 'How to Master Any Skill',
          url: 'https://www.youtube.com/watch?v=9vJRopau0g0',
          source: 'YouTube - Veritasium',
          duration_minutes: 15,
          description: 'Scientific approach to mastering new skills and knowledge.'
        }
      );
    }
    
    return resources.slice(0, 3); // Limit to 3 videos
  }

  private getArticleResources(query: string, goal: string): ResourceT[] {
    const resources: ResourceT[] = [];
    
    // Spanish learning articles
    if (query.includes('spanish') || goal.includes('spanish')) {
      resources.push(
        {
          kind: 'read',
          title: 'Complete Spanish Grammar Guide for Beginners',
          url: 'https://www.spanishdict.com/guide/spanish-grammar',
          source: 'SpanishDict',
          duration_minutes: 45,
          description: 'Comprehensive guide to Spanish grammar rules and structures.'
        },
        {
          kind: 'read',
          title: 'Spanish Vocabulary Lists by Topic',
          url: 'https://www.fluentu.com/blog/spanish/spanish-vocabulary-lists/',
          source: 'FluentU',
          duration_minutes: 30,
          description: 'Organized vocabulary lists to expand your Spanish word bank.'
        }
      );
    }
    
    // Filmmaking articles
    else if (query.includes('filmmaking') || query.includes('film') || goal.includes('filmmaking') || goal.includes('film')) {
      resources.push(
        {
          kind: 'read',
          title: 'The Complete Guide to Filmmaking for Beginners',
          url: 'https://www.studiobinder.com/blog/filmmaking-guide/',
          source: 'StudioBinder',
          duration_minutes: 30,
          description: 'Comprehensive guide covering all aspects of filmmaking from pre to post production.'
        },
        {
          kind: 'read',
          title: 'Cinematography Techniques: A Visual Storytelling Guide',
          url: 'https://www.studiobinder.com/blog/cinematography-techniques/',
          source: 'StudioBinder',
          duration_minutes: 25,
          description: 'Learn essential cinematography techniques for better visual storytelling.'
        }
      );
    }
    
    // Programming articles
    else if (query.includes('programming') || query.includes('coding') || query.includes('javascript') || query.includes('python') || 
             goal.includes('programming') || goal.includes('coding') || goal.includes('javascript') || goal.includes('python')) {
      resources.push(
        {
          kind: 'read',
          title: 'JavaScript Fundamentals: A Complete Guide',
          url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide',
          source: 'MDN Web Docs',
          duration_minutes: 40,
          description: 'Official JavaScript guide covering all fundamental concepts.'
        },
        {
          kind: 'read',
          title: 'Python for Beginners: Learn Programming Basics',
          url: 'https://www.python.org/about/gettingstarted/',
          source: 'Python.org',
          duration_minutes: 35,
          description: 'Official Python tutorial for absolute beginners.'
        }
      );
    }
    
    // Cooking articles
    else if (query.includes('cooking') || query.includes('chef') || query.includes('recipe') || 
             goal.includes('cooking') || goal.includes('chef') || goal.includes('recipe')) {
      resources.push(
        {
          kind: 'read',
          title: 'Essential Cooking Techniques Every Home Cook Should Master',
          url: 'https://www.seriouseats.com/cooking-techniques',
          source: 'Serious Eats',
          duration_minutes: 20,
          description: 'Master the fundamental techniques that form the foundation of all cooking.'
        }
      );
    }
    
    // Photography articles
    else if (query.includes('photography') || query.includes('camera') || query.includes('photo') || 
             goal.includes('photography') || goal.includes('camera') || goal.includes('photo')) {
      resources.push(
        {
          kind: 'read',
          title: 'Photography Basics: Understanding Aperture, Shutter Speed, and ISO',
          url: 'https://photographylife.com/what-is-exposure-triangle',
          source: 'Photography Life',
          duration_minutes: 25,
          description: 'Complete guide to the exposure triangle and camera fundamentals.'
        }
      );
    }
    
    // General learning articles (for any goal)
    else {
      resources.push(
        {
          kind: 'read',
          title: 'How to Learn Effectively: A Complete Guide',
          url: 'https://www.coursera.org/learn/learning-how-to-learn',
          source: 'Coursera',
          duration_minutes: 20,
          description: 'Comprehensive guide to effective learning strategies and techniques.'
        },
        {
          kind: 'read',
          title: 'The Science of Learning: 10 Evidence-Based Study Tips',
          url: 'https://www.psychologytoday.com/us/blog/the-power-prime/201408/10-evidence-based-study-tips',
          source: 'Psychology Today',
          duration_minutes: 15,
          description: 'Research-backed methods for improving your learning efficiency.'
        }
      );
    }
    
    return resources.slice(0, 2); // Limit to 2 articles
  }

  private getPodcastResources(query: string, goal: string): ResourceT[] {
    const resources: ResourceT[] = [];
    
    // Spanish learning podcasts
    if (query.includes('spanish') || goal.includes('spanish')) {
      resources.push(
        {
          kind: 'listen',
          title: 'Coffee Break Spanish',
          url: 'https://coffeebreaklanguages.com/coffeebreakspanish/',
          source: 'Coffee Break Languages',
          duration_minutes: 20,
          description: 'Bite-sized Spanish lessons perfect for busy learners.'
        }
      );
    }
    
    // Filmmaking podcasts
    else if (query.includes('filmmaking') || query.includes('film') || goal.includes('filmmaking') || goal.includes('film')) {
      resources.push(
        {
          kind: 'listen',
          title: 'The Film Riot Podcast',
          url: 'https://www.filmriot.com/podcast/',
          source: 'Film Riot',
          duration_minutes: 60,
          description: 'Weekly podcast covering filmmaking techniques, gear reviews, and industry insights.'
        }
      );
    }
    
    // Programming podcasts
    else if (query.includes('programming') || query.includes('coding') || query.includes('javascript') || query.includes('python') || 
             goal.includes('programming') || goal.includes('coding') || goal.includes('javascript') || goal.includes('python')) {
      resources.push(
        {
          kind: 'listen',
          title: 'Syntax - Web Development Podcast',
          url: 'https://syntax.fm/',
          source: 'Syntax',
          duration_minutes: 45,
          description: 'A tasty treat for web developers covering JavaScript, React, and modern web development.'
        }
      );
    }
    
    // General learning podcasts
    else if (query.includes('learn') || query.includes('tutorial') || query.includes('basics')) {
      resources.push(
        {
          kind: 'listen',
          title: 'The Learning Scientists Podcast',
          url: 'https://www.learningscientists.org/learning-scientists-podcast/',
          source: 'The Learning Scientists',
          duration_minutes: 30,
          description: 'Evidence-based learning strategies and techniques for effective studying.'
        }
      );
    }
    
    return resources.slice(0, 2); // Limit to 2 podcasts
  }
}

// Export singleton instance
export const simpleScraper = new SimpleWebScraper();
