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

  // Scrape podcast search results and provide fallback
  private async scrapePodcastSearch(query: string, results: ResourceT[]): Promise<void> {
    try {
      console.log(`🔍 [RealWebScraper] Trying to scrape podcasts for: "${query}"`);
      
      // First try scraping for real podcast links
      const podcastQuery = `${query} podcast episode site:spotify.com OR site:podcasts.apple.com`;
      const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(podcastQuery)}`;
      
      const response = await this.makeRequest(searchUrl);
      
      if (response.status === 200) {
        const $ = cheerio.load(response.data);
        
        // Look for Spotify podcast links
        $('.result').each((index, element) => {
          if (results.length >= 1) return false;
          
          const $result = $(element);
          const titleElement = $result.find('.result__title a, h2 a, h3 a').first();
          const href = titleElement.attr('href');
          const title = titleElement.text().trim();
          
          console.log(`🔗 [RealWebScraper] Found podcast link: "${title}" -> ${href}`);
          
          if (href && title && (href.includes('spotify.com/show/') || href.includes('podcasts.apple.com'))) {
            results.push({
              kind: 'listen',
              title: title.substring(0, 100),
              url: href,
              source: href.includes('spotify') ? 'Spotify' : 'Apple Podcasts',
              duration_minutes: 30 + Math.floor(Math.random() * 30),
              description: `Podcast about ${query.replace(/podcast/gi, '').trim()}`,
              split: null
            });
            
            console.log(`✅ [RealWebScraper] Found real podcast: ${title.substring(0, 50)}`);
          }
        });
      }
      
      // If scraping failed, provide topic-relevant fallback podcasts
      if (results.length === 0) {
        console.log(`🔄 [RealWebScraper] No podcasts found via scraping, using topic-relevant fallback`);
        this.addTopicRelevantPodcast(query, results);
      }
      
    } catch (error) {
      console.error('[RealWebScraper] Podcast scraping failed:', error instanceof Error ? error.message : String(error));
      
      // If scraping completely fails, provide topic-relevant fallback
      console.log(`🔄 [RealWebScraper] Scraping failed, using topic-relevant fallback`);
      this.addTopicRelevantPodcast(query, results);
    }
  }

  // Add a topic-relevant podcast when scraping fails
  private addTopicRelevantPodcast(query: string, results: ResourceT[]): void {
    const lowerQuery = query.toLowerCase();
    
    // Determine topic and provide relevant podcast
    if (lowerQuery.includes('cooking') || lowerQuery.includes('food') || lowerQuery.includes('recipe')) {
      results.push({
        kind: 'listen',
        title: 'The Splendid Table',
        url: 'https://podcasts.apple.com/us/podcast/the-splendid-table/id275757274',
        source: 'Apple Podcasts',
        duration_minutes: 50,
        description: 'Food and cooking podcast with techniques and recipes',
        split: null
      });
    } else if (lowerQuery.includes('business') || lowerQuery.includes('entrepreneur') || lowerQuery.includes('startup')) {
      results.push({
        kind: 'listen',
        title: 'How I Built This with Guy Raz',
        url: 'https://podcasts.apple.com/us/podcast/how-i-built-this-with-guy-raz/id1150510297',
        source: 'Apple Podcasts',
        duration_minutes: 50,
        description: 'Stories of entrepreneurs and how they built their companies',
        split: null
      });
    } else if (lowerQuery.includes('programming') || lowerQuery.includes('coding') || lowerQuery.includes('javascript') || lowerQuery.includes('python')) {
      results.push({
        kind: 'listen',
        title: 'Syntax - Tasty Web Development Treats',
        url: 'https://podcasts.apple.com/us/podcast/syntax-tasty-web-development-treats/id1253186678',
        source: 'Apple Podcasts',
        duration_minutes: 45,
        description: 'Web development podcast covering modern JavaScript and frameworks',
        split: null
      });
    } else if (lowerQuery.includes('fitness') || lowerQuery.includes('health') || lowerQuery.includes('exercise')) {
      results.push({
        kind: 'listen',
        title: 'The Model Health Show',
        url: 'https://podcasts.apple.com/us/podcast/the-model-health-show/id640246378',
        source: 'Apple Podcasts',
        duration_minutes: 60,
        description: 'Health, fitness, and nutrition insights from experts',
        split: null
      });
    } else if (lowerQuery.includes('design') || lowerQuery.includes('creative') || lowerQuery.includes('art')) {
      results.push({
        kind: 'listen',
        title: 'Design Better',
        url: 'https://podcasts.apple.com/us/podcast/design-better/id1348582688',
        source: 'Apple Podcasts',
        duration_minutes: 35,
        description: 'Design insights and conversations with industry leaders',
        split: null
      });
    } else {
      // Always provide a podcast - TED Talks Daily covers any educational topic
      results.push({
        kind: 'listen',
        title: 'TED Talks Daily',
        url: 'https://podcasts.apple.com/us/podcast/ted-talks-daily/id160904630',
        source: 'Apple Podcasts',
        duration_minutes: 20,
        description: 'Daily TED talks covering a wide range of educational topics',
        split: null
      });
    }
    
    console.log(`✅ [RealWebScraper] Added topic-relevant podcast fallback`);
  }



}

export const realWebScraper = new RealWebScraper();
