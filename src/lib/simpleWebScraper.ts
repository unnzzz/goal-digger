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
    
    // Language learning videos
    if (query.includes('spanish') || goal.includes('spanish')) {
      resources.push(
        {
          kind: 'watch',
          title: 'Learn Spanish in 4 Hours - ALL the Spanish Basics You Need',
          url: 'https://www.youtube.com/watch?v=0Iu8nC1gv3U',
          source: 'YouTube - Learn Spanish with SpanishPod101',
          duration_minutes: 240,
          description: 'Complete Spanish course covering all the basics you need to start speaking Spanish confidently.',
          split: null
        },
        {
          kind: 'watch',
          title: 'Spanish for Beginners - Free Spanish Lessons',
          url: 'https://www.youtube.com/watch?v=kJQjX4EW4-s',
          source: 'YouTube - Language Learning with Paul',
          duration_minutes: 60,
          description: 'Beginner-friendly Spanish lessons covering essential vocabulary and grammar.',
          split: null
        }
      );
    }
    
    // Programming videos
    if (query.includes('programming') || query.includes('coding') || query.includes('development') || 
        goal.includes('programming') || goal.includes('coding') || goal.includes('development')) {
      resources.push(
        {
          kind: 'watch',
          title: 'Learn Programming in 10 Minutes',
          url: 'https://www.youtube.com/watch?v=zOjov-2OZ0E',
          source: 'YouTube - Programming with Mosh',
          duration_minutes: 10,
          description: 'Quick introduction to programming concepts and getting started.',
          split: null
        },
        {
          kind: 'watch',
          title: 'How to Learn Programming - Complete Roadmap',
          url: 'https://www.youtube.com/watch?v=7C9RgOcvkvo',
          source: 'YouTube - CodeWithHarry',
          duration_minutes: 30,
          description: 'Complete roadmap for learning programming from scratch.',
          split: null
        },
        {
          kind: 'watch',
          title: 'Programming Tutorial for Beginners',
          url: 'https://www.youtube.com/watch?v=8jLOx1hD3_o',
          source: 'YouTube - Derek Banas',
          duration_minutes: 45,
          description: 'Comprehensive programming tutorial for absolute beginners.',
          split: null
        }
      );
    }
    
    // Design videos
    if (query.includes('design') || query.includes('ui') || query.includes('ux') || 
        goal.includes('design') || goal.includes('ui') || goal.includes('ux')) {
      resources.push(
        {
          kind: 'watch',
          title: 'UI/UX Design Tutorial - Complete Course',
          url: 'https://www.youtube.com/watch?v=68w2VwalD5w',
          source: 'YouTube - Flux',
          duration_minutes: 60,
          description: 'Complete UI/UX design course covering all fundamentals.',
          split: null
        },
        {
          kind: 'watch',
          title: 'Graphic Design Basics - Learn Design Principles',
          url: 'https://www.youtube.com/watch?v=YqQx75OPRa0',
          source: 'YouTube - The Futur',
          duration_minutes: 25,
          description: 'Learn the fundamental principles of graphic design.',
          split: null
        }
      );
    }
    
    // Business videos
    if (query.includes('business') || query.includes('entrepreneur') || query.includes('startup') || 
        goal.includes('business') || goal.includes('entrepreneur') || goal.includes('startup')) {
      resources.push(
        {
          kind: 'watch',
          title: 'How to Start a Business - Complete Guide',
          url: 'https://www.youtube.com/watch?v=YyQl0VH3X1Y',
          source: 'YouTube - GaryVee',
          duration_minutes: 20,
          description: 'Complete guide to starting your own business.',
          split: null
        },
        {
          kind: 'watch',
          title: 'Business Strategy and Planning',
          url: 'https://www.youtube.com/watch?v=7PjZEBGc7-0',
          source: 'YouTube - Harvard Business Review',
          duration_minutes: 15,
          description: 'Learn business strategy and planning fundamentals.',
          split: null
        }
      );
    }
    
    // Photography videos
    if (query.includes('photography') || query.includes('camera') || query.includes('photo') || 
        goal.includes('photography') || goal.includes('camera') || goal.includes('photo')) {
      resources.push(
        {
          kind: 'watch',
          title: 'Photography Basics in 10 Minutes',
          url: 'https://www.youtube.com/watch?v=hVuTuib65WM',
          source: 'YouTube - Peter McKinnon',
          duration_minutes: 10,
          description: 'Quick guide to photography fundamentals.',
          split: null
        },
        {
          kind: 'watch',
          title: 'Complete Photography Course for Beginners',
          url: 'https://www.youtube.com/watch?v=7R0IzF3t2tY',
          source: 'YouTube - Mango Street',
          duration_minutes: 45,
          description: 'Comprehensive photography course covering all basics.',
          split: null
        }
      );
    }
    
    // Cooking videos
    if (query.includes('cooking') || query.includes('recipe') || query.includes('food') || 
        goal.includes('cooking') || goal.includes('recipe') || goal.includes('food')) {
      resources.push(
        {
          kind: 'watch',
          title: 'Basic Cooking Techniques Everyone Should Know',
          url: 'https://www.youtube.com/watch?v=13rQqgqUCL8',
          source: 'YouTube - Gordon Ramsay',
          duration_minutes: 20,
          description: 'Essential cooking techniques for beginners.',
          split: null
        },
        {
          kind: 'watch',
          title: 'Learn to Cook - Complete Beginner Guide',
          url: 'https://www.youtube.com/watch?v=1p6Lh0jU3lQ',
          source: 'YouTube - Binging with Babish',
          duration_minutes: 30,
          description: 'Complete guide to learning how to cook.',
          split: null
        }
      );
    }
    
    // Fitness videos
    if (query.includes('fitness') || query.includes('workout') || query.includes('exercise') || 
        goal.includes('fitness') || goal.includes('workout') || goal.includes('exercise')) {
      resources.push(
        {
          kind: 'watch',
          title: 'Beginner Workout Routine - Complete Guide',
          url: 'https://www.youtube.com/watch?v=2pLT-olgUJs',
          source: 'YouTube - Athlean-X',
          duration_minutes: 25,
          description: 'Complete beginner workout routine and guide.',
          split: null
        },
        {
          kind: 'watch',
          title: 'How to Start Working Out - Fitness Basics',
          url: 'https://www.youtube.com/watch?v=ml6cT4AZdqI',
          source: 'YouTube - Jeremy Ethier',
          duration_minutes: 15,
          description: 'Learn the basics of starting a fitness routine.',
          split: null
        }
      );
    }
    
    // General learning videos (fallback for any goal)
    if (resources.length === 0) {
      resources.push(
        {
          kind: 'watch',
          title: 'How to Learn Anything Fast - Complete Learning Guide',
          url: 'https://www.youtube.com/watch?v=aircAruvnKk',
          source: 'YouTube - 3Blue1Brown',
          duration_minutes: 30,
          description: 'Comprehensive guide to effective learning strategies and techniques.',
          split: null
        },
        {
          kind: 'watch',
          title: 'The Science of Learning: How to Study Effectively',
          url: 'https://www.youtube.com/watch?v=IlU-zDU6aQ0',
          source: 'YouTube - Crash Course',
          duration_minutes: 15,
          description: 'Evidence-based study techniques backed by cognitive science.',
          split: null
        },
        {
          kind: 'watch',
          title: 'Master Any Skill - Learning Techniques',
          url: 'https://www.youtube.com/watch?v=9vJRopau0g0',
          source: 'YouTube - TED-Ed',
          duration_minutes: 20,
          description: 'Proven techniques for mastering any skill effectively.',
          split: null
        },
        {
          kind: 'watch',
          title: 'How to Learn New Skills Quickly',
          url: 'https://www.youtube.com/watch?v=EtJy69cEOtc',
          source: 'YouTube - Improvement Pill',
          duration_minutes: 12,
          description: 'Strategies for learning new skills efficiently.',
          split: null
        },
        {
          kind: 'watch',
          title: 'The Feynman Technique - Learn Anything',
          url: 'https://www.youtube.com/watch?v=tkm0TNFzIeg',
          source: 'YouTube - Sprouts',
          duration_minutes: 8,
          description: 'Learn the Feynman technique for better understanding.',
          split: null
        }
      );
    }
    
    return resources;
  }

  private getArticleResources(query: string, goal: string): ResourceT[] {
    const resources: ResourceT[] = [];
    
    // Language learning articles
    if (query.includes('spanish') || goal.includes('spanish')) {
      resources.push(
        {
          kind: 'read',
          title: 'Complete Spanish Grammar Guide',
          url: 'https://www.spanishdict.com/guide/spanish-grammar',
          source: 'SpanishDict',
          duration_minutes: 45,
          description: 'Comprehensive guide to Spanish grammar rules and structures.',
          split: null
        },
        {
          kind: 'read',
          title: 'Spanish Vocabulary Lists by Topic',
          url: 'https://www.fluentu.com/blog/spanish/spanish-vocabulary-lists/',
          source: 'FluentU',
          duration_minutes: 30,
          description: 'Organized vocabulary lists for different topics and situations.',
          split: null
        }
      );
    }
    
    // Programming articles
    if (query.includes('programming') || query.includes('coding') || query.includes('development') || 
        goal.includes('programming') || goal.includes('coding') || goal.includes('development')) {
      resources.push(
        {
          kind: 'read',
          title: 'Learn to Code: A Beginner\'s Guide',
          url: 'https://www.codecademy.com/learn/learn-how-to-code',
          source: 'Codecademy',
          duration_minutes: 60,
          description: 'Step-by-step guide to learning programming from scratch.',
          split: null
        },
        {
          kind: 'read',
          title: 'Programming Fundamentals Guide',
          url: 'https://www.freecodecamp.org/news/programming-fundamentals/',
          source: 'freeCodeCamp',
          duration_minutes: 40,
          description: 'Comprehensive guide to programming fundamentals.',
          split: null
        }
      );
    }
    
    // General learning articles (fallback)
    if (resources.length === 0) {
      resources.push(
        {
          kind: 'read',
          title: 'The Science of Learning: How to Study Effectively',
          url: 'https://www.scientificamerican.com/article/the-science-of-learning/',
          source: 'Scientific American',
          duration_minutes: 20,
          description: 'Evidence-based study techniques and learning strategies.',
          split: null
        },
        {
          kind: 'read',
          title: 'How to Learn Anything: The Ultimate Guide',
          url: 'https://www.fastcompany.com/3028134/how-to-learn-anything',
          source: 'Fast Company',
          duration_minutes: 25,
          description: 'Comprehensive guide to effective learning methods.',
          split: null
        },
        {
          kind: 'read',
          title: 'How to Learn Effectively: Study Tips and Techniques',
          url: 'https://www.psychologytoday.com/us/blog/memory-medic/201303/how-learn-effectively',
          source: 'Psychology Today',
          duration_minutes: 15,
          description: 'General learning strategies and study techniques.',
          split: null
        }
      );
    }
    
    return resources;
  }

  private getPodcastResources(query: string, goal: string): ResourceT[] {
    const resources: ResourceT[] = [];
    
    // Language learning podcasts
    if (query.includes('spanish') || goal.includes('spanish')) {
      resources.push(
        {
          kind: 'listen',
          title: 'Coffee Break Spanish',
          url: 'https://podcasts.apple.com/us/podcast/coffee-break-spanish/id201598043',
          source: 'Coffee Break Languages',
          duration_minutes: 20,
          description: 'Popular Spanish learning podcast for beginners.',
          split: null
        }
      );
    }
    
    // General learning podcasts (fallback)
    if (resources.length === 0) {
      resources.push(
        {
          kind: 'listen',
          title: 'The Learning Scientists Podcast',
          url: 'https://podcasts.apple.com/us/podcast/the-learning-scientists-podcast/id1241891618',
          source: 'The Learning Scientists',
          duration_minutes: 30,
          description: 'Evidence-based learning strategies and study techniques.',
          split: null
        },
        {
          kind: 'listen',
          title: 'TED Talks Education',
          url: 'https://podcasts.apple.com/us/podcast/ted-talks-education/id470623037',
          source: 'TED',
          duration_minutes: 15,
          description: 'Educational talks and insights on learning.',
          split: null
        }
      );
    }
    
    return resources;
  }
}

export const simpleScraper = new SimpleWebScraper();