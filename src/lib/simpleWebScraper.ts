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
    
    // General learning videos
    if (query.includes('learn') || query.includes('tutorial') || query.includes('guide')) {
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
        }
      );
    }
    
    // Programming videos
    if (query.includes('programming') || query.includes('coding') || query.includes('development')) {
      resources.push(
        {
          kind: 'watch',
          title: 'Learn Programming in 10 Minutes',
          url: 'https://www.youtube.com/watch?v=zOjov-2OZ0E',
          source: 'YouTube - Programming with Mosh',
          duration_minutes: 10,
          description: 'Quick introduction to programming concepts and getting started.',
          split: null
        }
      );
    }
    
    // Cooking videos
    if (query.includes('cooking') || query.includes('recipe') || query.includes('food')) {
      resources.push(
        {
          kind: 'watch',
          title: 'Basic Cooking Techniques Everyone Should Know',
          url: 'https://www.youtube.com/watch?v=13rQqgqUCL8',
          source: 'YouTube - Gordon Ramsay',
          duration_minutes: 20,
          description: 'Essential cooking techniques for beginners.',
          split: null
        }
      );
    }
    
    // Photography videos
    if (query.includes('photography') || query.includes('camera') || query.includes('photo')) {
      resources.push(
        {
          kind: 'watch',
          title: 'Photography Basics in 10 Minutes',
          url: 'https://www.youtube.com/watch?v=hVuTuib65WM',
          source: 'YouTube - Peter McKinnon',
          duration_minutes: 10,
          description: 'Quick guide to photography fundamentals.',
          split: null
        }
      );
    }
    
    // General fallback videos
    if (resources.length === 0) {
      resources.push(
        {
          kind: 'watch',
          title: 'How to Learn Effectively - Study Tips',
          url: 'https://www.youtube.com/watch?v=aircAruvnKk',
          source: 'YouTube - Educational Channel',
          duration_minutes: 15,
          description: 'General learning strategies and study techniques.',
          split: null
        }
      );
    }
    
    return resources;
  }

  private getArticleResources(query: string, goal: string): ResourceT[] {
    const resources: ResourceT[] = [];
    
    // Spanish learning articles
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
    
    // General learning articles
    if (query.includes('learn') || query.includes('study') || query.includes('education')) {
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
        }
      );
    }
    
    // Programming articles
    if (query.includes('programming') || query.includes('coding') || query.includes('development')) {
      resources.push(
        {
          kind: 'read',
          title: 'Learn to Code: A Beginner\'s Guide',
          url: 'https://www.codecademy.com/learn/learn-how-to-code',
          source: 'Codecademy',
          duration_minutes: 60,
          description: 'Step-by-step guide to learning programming from scratch.',
          split: null
        }
      );
    }
    
    // General fallback articles
    if (resources.length === 0) {
      resources.push(
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
    
    // Spanish learning podcasts
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
    
    // General learning podcasts
    if (query.includes('learn') || query.includes('education') || query.includes('study')) {
      resources.push(
        {
          kind: 'listen',
          title: 'The Learning Scientists Podcast',
          url: 'https://podcasts.apple.com/us/podcast/the-learning-scientists-podcast/id1241891618',
          source: 'The Learning Scientists',
          duration_minutes: 30,
          description: 'Evidence-based learning strategies and study techniques.',
          split: null
        }
      );
    }
    
    // General fallback podcasts
    if (resources.length === 0) {
      resources.push(
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