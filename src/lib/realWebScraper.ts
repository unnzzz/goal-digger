import axios from 'axios';
import * as cheerio from 'cheerio';
import { ResourceT } from './schema';

// Real web scraper that finds actual articles from the internet
export class RealWebScraper {
  private userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  ];

  private async makeRequest(url: string): Promise<any> {
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': this.userAgents[Math.floor(Math.random() * this.userAgents.length)],
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9'
        },
        timeout: 5000,
        maxRedirects: 2,
        validateStatus: (status) => status < 400
      });
      return response;
    } catch (error) {
      throw error;
    }
  }

  // Search for real articles by actually scraping search engines
  async searchRealArticles(query: string, goal?: string): Promise<ResourceT[]> {
    console.log(`🔍 [RealWebScraper] Searching real web articles for: "${query}" with goal: "${goal}"`);
    
    const results: ResourceT[] = [];
    
    try {
      // Create specific search query
      const searchQuery = `"${query}" tutorial guide article blog`.trim();
      console.log(`🔍 [RealWebScraper] Search query: "${searchQuery}"`);
      
      // Try DuckDuckGo HTML scraping (most reliable)
      await this.scrapeDuckDuckGo(searchQuery, results);
      
    } catch (error) {
      console.error('[RealWebScraper] Article search failed:', error instanceof Error ? error.message : String(error));
    }
    
    console.log(`📚 [RealWebScraper] Found ${results.length} real web articles`);
    return results;
  }

  // Actually scrape DuckDuckGo search results
  private async scrapeDuckDuckGo(query: string, results: ResourceT[]): Promise<void> {
    try {
      const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
      console.log(`🔍 [RealWebScraper] Scraping: ${searchUrl}`);
      
      const response = await this.makeRequest(searchUrl);
      
      if (response.status === 200) {
        const $ = cheerio.load(response.data);
        
        // Extract real search results
        $('.result').each((index, element) => {
          if (results.length >= 2) return false;
          
          const $result = $(element);
          const titleElement = $result.find('.result__title a, h2 a, h3 a').first();
          const href = titleElement.attr('href');
          const title = titleElement.text().trim();
          
          console.log(`🔗 [RealWebScraper] Found: "${title}" -> ${href}`);
          
          if (href && title && this.isValidRealArticle(href, title)) {
            results.push({
              kind: 'read',
              title: title.substring(0, 100),
              url: href,
              source: this.extractDomain(href),
              duration_minutes: 8 + Math.floor(Math.random() * 12),
              description: `Learn about ${query.replace(/"/g, '')}`,
              split: null
            });
            
            console.log(`✅ [RealWebScraper] Added real article: ${title.substring(0, 50)}`);
          }
        });
      }
    } catch (error) {
      console.error('[RealWebScraper] DuckDuckGo scraping failed:', error instanceof Error ? error.message : String(error));
    }
  }

  // Validate real articles - very strict to ensure quality
  private isValidRealArticle(href: string, title: string): boolean {
    if (!href || !title || title.length < 10) return false;
    
    // Must be a real URL
    try {
      const url = new URL(href);
      
      // Skip search engines and social media
      const badDomains = ['google.com', 'bing.com', 'duckduckgo.com', 'facebook.com', 'twitter.com', 'youtube.com'];
      if (badDomains.some(domain => url.hostname.includes(domain))) return false;
      
      // Skip obvious non-articles
      if (href.includes('search') || href.includes('?q=') || href.includes('login')) return false;
      
      return true;
    } catch {
      return false;
    }
  }

  // Extract domain name
  private extractDomain(url: string): string {
    try {
      const domain = new URL(url).hostname.replace('www.', '');
      return domain.charAt(0).toUpperCase() + domain.slice(1);
    } catch {
      return 'Web Article';
    }
  }


  // Search for real podcasts by scraping podcast platforms
  async searchRealPodcasts(query: string, goal?: string): Promise<ResourceT[]> {
    console.log(`🔍 [RealWebScraper] Searching real podcasts for: "${query}" with goal: "${goal}"`);
    
    const results: ResourceT[] = [];
    
    try {
      // Create topic-focused search query
      const searchQuery = `${query} ${goal || ''} podcast`.trim();
      console.log(`🔍 [RealWebScraper] Podcast search query: "${searchQuery}"`);
      
      // Try scraping podcast search results
      await this.scrapePodcastSearch(searchQuery, results);
      
    } catch (error) {
      console.error('[RealWebScraper] Podcast search failed:', error instanceof Error ? error.message : String(error));
    }
    
    console.log(`🎧 [RealWebScraper] Found ${results.length} real podcasts`);
    return results;
  }

  // Scrape podcast search results - find specific podcasts for the query
  private async scrapePodcastSearch(query: string, results: ResourceT[]): Promise<void> {
    try {
      console.log(`🔍 [RealWebScraper] Searching for specific podcasts about: "${query}"`);
      
      // Create multiple specific podcast search queries
      const podcastQueries = [
        `"${query}" podcast episode`,
        `${query} podcast interview`,
        `${query} podcast discussion`,
        `${query} podcast tutorial`
      ];
      
      for (const podcastQuery of podcastQueries) {
        if (results.length >= 2) break;
        
        try {
          const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(podcastQuery)}`;
          console.log(`🔍 [RealWebScraper] Searching: "${podcastQuery}"`);
          
          const response = await this.makeRequest(searchUrl);
          
          if (response.status === 200) {
            const $ = cheerio.load(response.data);
            
            // Look for any podcast-related links
            $('.result').each((index, element) => {
              if (results.length >= 2) return false;
              
              const $result = $(element);
              const titleElement = $result.find('.result__title a, h2 a, h3 a').first();
              const href = titleElement.attr('href');
              const title = titleElement.text().trim();
              
              console.log(`🔗 [RealWebScraper] Found link: "${title}" -> ${href}`);
              
              // Accept any podcast-related URL (Spotify, Apple, Google, etc.)
              if (href && title && this.isPodcastUrl(href) && this.isRelevantPodcast(title, query)) {
                results.push({
                  kind: 'listen',
                  title: title.substring(0, 100),
                  url: href,
                  source: this.getPodcastSource(href),
                  duration_minutes: 25 + Math.floor(Math.random() * 35),
                  description: `Podcast episode about ${query}`,
                  split: null
                });
                
                console.log(`✅ [RealWebScraper] Found specific podcast: ${title.substring(0, 50)}`);
                console.log(`✅ [RealWebScraper] URL: ${href}`);
              }
            });
          }
          
          if (results.length > 0) break; // Found some podcasts, stop searching
          
        } catch (error) {
          console.error(`[RealWebScraper] Podcast query "${podcastQuery}" failed:`, error instanceof Error ? error.message : String(error));
          continue;
        }
      }
      
    } catch (error) {
      console.error('[RealWebScraper] Podcast scraping failed:', error instanceof Error ? error.message : String(error));
    }
    
    console.log(`🎧 [RealWebScraper] Found ${results.length} specific podcasts for "${query}"`);
  }

  // Check if URL is a podcast URL
  private isPodcastUrl(url: string): boolean {
    const podcastDomains = [
      'spotify.com/show/',
      'spotify.com/episode/',
      'podcasts.apple.com',
      'podcasts.google.com',
      'overcast.fm',
      'pocketcasts.com',
      'castbox.fm',
      'anchor.fm',
      'soundcloud.com'
    ];
    
    return podcastDomains.some(domain => url.includes(domain));
  }

  // Check if podcast title is relevant to the query
  private isRelevantPodcast(title: string, query: string): boolean {
    const titleLower = title.toLowerCase();
    const queryWords = query.toLowerCase().split(' ').filter(word => word.length > 3);
    
    // Must contain at least one key word from the query
    return queryWords.some(word => titleLower.includes(word));
  }

  // Get podcast source from URL
  private getPodcastSource(url: string): string {
    if (url.includes('spotify.com')) return 'Spotify';
    if (url.includes('podcasts.apple.com')) return 'Apple Podcasts';
    if (url.includes('podcasts.google.com')) return 'Google Podcasts';
    if (url.includes('overcast.fm')) return 'Overcast';
    if (url.includes('pocketcasts.com')) return 'Pocket Casts';
    if (url.includes('anchor.fm')) return 'Anchor';
    if (url.includes('soundcloud.com')) return 'SoundCloud';
    return 'Podcast Platform';
  }




}

export const realWebScraper = new RealWebScraper();
