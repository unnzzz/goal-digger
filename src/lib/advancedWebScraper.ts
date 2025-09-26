import axios from 'axios';
import * as cheerio from 'cheerio';
import { ResourceT } from './schema';

// Real website scraper that gets actual URLs from real websites
export class AdvancedWebScraper {
  private requestCount = 0;
  private userAgentIndex = 0;
  private proxyIndex = 0;

  // Real user agents for better success
  private userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15'
  ];

  // Real websites with actual content for any topic
  private realWebsites = {
    watch: [
      'https://www.youtube.com',
      'https://www.vimeo.com',
      'https://www.ted.com',
      'https://www.khanacademy.org',
      'https://www.coursera.org',
      'https://www.udemy.com',
      'https://www.skillshare.com',
      'https://www.masterclass.com'
    ],
    read: [
      'https://www.wikipedia.org',
      'https://www.medium.com',
      'https://www.dev.to',
      'https://www.freecodecamp.org',
      'https://www.stackoverflow.com',
      'https://www.github.com',
      'https://www.reddit.com',
      'https://www.quora.com',
      'https://www.wikihow.com',
      'https://www.instructables.com'
    ],
    listen: [
      'https://www.spotify.com',
      'https://www.audible.com',
      'https://www.podcast.com',
      'https://www.stitcher.com',
      'https://www.pocketcasts.com'
    ]
  };

  private getRandomUserAgent(): string {
    this.userAgentIndex = (this.userAgentIndex + 1) % this.userAgents.length;
    return this.userAgents[this.userAgentIndex];
  }

  private async makeRequest(url: string): Promise<any> {
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': this.getRandomUserAgent(),
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Upgrade-Insecure-Requests': '1'
        },
        timeout: 10000,
        maxRedirects: 5,
        validateStatus: (status) => status < 400
      });
      
      this.requestCount++;
      return response;
    } catch (error) {
      console.error(`Request failed for ${url}:`, error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  // Search YouTube directly for real videos
  async searchYouTube(query: string, goal?: string): Promise<ResourceT[]> {
    const results: ResourceT[] = [];
    
    try {
      console.log(`Searching YouTube directly for: "${query}"`);
      
      // Create simple, effective search terms
      const searchTerms = [
        `${query} tutorial`,
        `${query} how to`,
        `${query} beginner`,
        `${query} guide`,
        `${query} course`
      ];

      for (const searchTerm of searchTerms.slice(0, 3)) {
        try {
          const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(searchTerm)}`;
          const response = await this.makeRequest(searchUrl);
          const $ = cheerio.load(response.data);
          
          // Look for video links
          $('a[href*="/watch?v="]').each((index, element) => {
            if (results.length >= 5) return false;
            
            const href = $(element).attr('href');
            const title = $(element).find('h3').text().trim() || $(element).attr('title') || $(element).text().trim();
            
            if (href && title && href.includes('/watch?v=') && title.length > 5 && !title.includes('{') && !title.includes('css-')) {
              const videoId = href.split('v=')[1]?.split('&')[0];
              if (videoId) {
                results.push({
                  kind: 'watch',
                  title: title.substring(0, 100),
                  url: `https://www.youtube.com/watch?v=${videoId}`,
                  source: 'YouTube',
                  duration_minutes: 15,
                  description: `Learn ${query} with this video tutorial`,
                  split: null
                });
              }
            }
          });
          
          if (results.length > 0) break;
        } catch (error) {
          console.log(`YouTube search failed for "${searchTerm}":`, error instanceof Error ? error.message : String(error));
          continue;
        }
      }
    } catch (error) {
      console.error('YouTube search failed:', error);
    }
    
    return results;
  }

  // Search real websites for articles
  async searchArticles(query: string, goal?: string): Promise<ResourceT[]> {
    const results: ResourceT[] = [];
    
    try {
      console.log(`Searching real websites for articles: "${query}"`);
      
      // Search Wikipedia first (most reliable)
      try {
        const wikiUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(query.replace(/\s+/g, '_'))}`;
        const response = await this.makeRequest(wikiUrl);
        
        if (response.status === 200) {
          results.push({
            kind: 'read',
            title: `${query} - Wikipedia`,
            url: wikiUrl,
            source: 'Wikipedia',
            duration_minutes: 20,
            description: `Comprehensive information about ${query}`,
            split: null
          });
        }
      } catch (error) {
        console.log('Wikipedia search failed:', error instanceof Error ? error.message : String(error));
      }

      // Search Medium for articles
      try {
        const mediumUrl = `https://medium.com/search?q=${encodeURIComponent(query)}`;
        const response = await this.makeRequest(mediumUrl);
        const $ = cheerio.load(response.data);
        
        $('a[href*="/@"]').each((index, element) => {
          if (results.length >= 3) return false;
          
          const href = $(element).attr('href');
          const title = $(element).text().trim();
          
          if (href && title && href.includes('/@') && title.length > 10 && !title.includes('{')) {
            results.push({
              kind: 'read',
              title: title.substring(0, 100),
              url: href.startsWith('http') ? href : `https://medium.com${href}`,
              source: 'Medium',
              duration_minutes: 15,
              description: `Read about ${query} on Medium`,
              split: null
            });
          }
        });
      } catch (error) {
        console.log('Medium search failed:', error instanceof Error ? error.message : String(error));
      }

      // Search Dev.to for programming articles
      if (query.toLowerCase().includes('programming') || query.toLowerCase().includes('coding') || query.toLowerCase().includes('development')) {
        try {
          const devUrl = `https://dev.to/search?q=${encodeURIComponent(query)}`;
          const response = await this.makeRequest(devUrl);
          const $ = cheerio.load(response.data);
          
          $('a[href*="/articles/"]').each((index, element) => {
            if (results.length >= 3) return false;
            
            const href = $(element).attr('href');
            const title = $(element).text().trim();
            
            if (href && title && href.includes('/articles/') && title.length > 10) {
              results.push({
                kind: 'read',
                title: title.substring(0, 100),
                url: href.startsWith('http') ? href : `https://dev.to${href}`,
                source: 'Dev.to',
                duration_minutes: 12,
                description: `Programming article about ${query}`,
                split: null
              });
            }
          });
        } catch (error) {
          console.log('Dev.to search failed:', error instanceof Error ? error.message : String(error));
        }
      }

      // Search Reddit for discussions
      try {
        const redditUrl = `https://www.reddit.com/search/?q=${encodeURIComponent(query)}`;
        const response = await this.makeRequest(redditUrl);
        const $ = cheerio.load(response.data);
        
        $('a[href*="/r/"]').each((index, element) => {
          if (results.length >= 3) return false;
          
          const href = $(element).attr('href');
          const title = $(element).text().trim();
          
          if (href && title && href.includes('/r/') && title.length > 10) {
            results.push({
              kind: 'read',
              title: title.substring(0, 100),
              url: href.startsWith('http') ? href : `https://www.reddit.com${href}`,
              source: 'Reddit',
              duration_minutes: 10,
              description: `Community discussion about ${query}`,
              split: null
            });
          }
        });
      } catch (error) {
        console.log('Reddit search failed:', error instanceof Error ? error.message : String(error));
      }

    } catch (error) {
      console.error('Article search failed:', error);
    }
    
    return results;
  }

  // Search for real podcasts
  async searchPodcasts(query: string, goal?: string): Promise<ResourceT[]> {
    const results: ResourceT[] = [];
    
    try {
      console.log(`Searching for podcasts: "${query}"`);
      
      // Create podcast search URLs
      const podcastUrls = [
        `https://www.spotify.com/search/${encodeURIComponent(query)}`,
        `https://www.audible.com/search?keywords=${encodeURIComponent(query)}`,
        `https://www.podcast.com/search?q=${encodeURIComponent(query)}`
      ];

      for (const url of podcastUrls) {
        try {
          const response = await this.makeRequest(url);
          if (response.status === 200) {
            results.push({
              kind: 'listen',
              title: `${query} Podcast`,
              url: url,
              source: url.includes('spotify') ? 'Spotify' : url.includes('audible') ? 'Audible' : 'Podcast.com',
              duration_minutes: 30,
              description: `Listen to podcasts about ${query}`,
              split: null
            });
            break; // Only need one podcast source
          }
        } catch (error) {
          console.log(`Podcast search failed for ${url}:`, error instanceof Error ? error.message : String(error));
          continue;
        }
      }
    } catch (error) {
      console.error('Podcast search failed:', error);
    }
    
    return results;
  }

  // Main search function
  async searchResources(query: string, type: 'watch' | 'read' | 'listen', goal?: string): Promise<ResourceT[]> {
    console.log(`Advanced scraping: ${type} resources for "${query}" with goal context: "${goal || 'none'}"`);
    
    let results: ResourceT[] = [];
    
    try {
      if (type === 'watch') {
        results = await this.searchYouTube(query, goal);
        console.log(`YouTube search found ${results.length} results`);
      } else if (type === 'read') {
        results = await this.searchArticles(query, goal);
        console.log(`Article search found ${results.length} results`);
      } else if (type === 'listen') {
        results = await this.searchPodcasts(query, goal);
        console.log(`Podcast search found ${results.length} results`);
      }
    } catch (error) {
      console.error('Search failed:', error);
    }
    
    return results;
  }

  // Get scraping statistics
  getStats() {
    return {
      requests_made: this.requestCount,
      user_agents_rotated: this.userAgentIndex,
      timestamp: new Date().toISOString()
    };
  }
}

export const advancedScraper = new AdvancedWebScraper();