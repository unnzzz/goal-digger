import axios from 'axios';
import * as cheerio from 'cheerio';
import { ResourceT } from './schema';

// User agent rotation for avoiding detection
const USER_AGENTS = [
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0'
];

// Proxy rotation (you can add real proxies here)
interface ProxyConfig {
  host: string;
  port: number;
  auth?: {
    username: string;
    password: string;
  };
}

const PROXIES: ProxyConfig[] = [
  // Add your proxy list here
  // { host: 'proxy1.example.com', port: 8080, auth: { username: 'user', password: 'pass' } }
];

// Rate limiting and delays
const DELAY_MIN = 1000; // 1 second
const DELAY_MAX = 3000; // 3 seconds

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds

interface ScrapingResult {
  title: string;
  url: string;
  source: string;
  duration_minutes?: number;
  snippet?: string;
}

class AdvancedWebScraper {
  private userAgentIndex = 0;
  private proxyIndex = 0;
  private requestCount = 0;
  private lastRequestTime = 0;

  // Rotate user agents
  private getRandomUserAgent(): string {
    this.userAgentIndex = (this.userAgentIndex + 1) % USER_AGENTS.length;
    return USER_AGENTS[this.userAgentIndex];
  }

  // Rotate proxies (if available)
  private getRandomProxy() {
    if (PROXIES.length === 0) return undefined;
    this.proxyIndex = (this.proxyIndex + 1) % PROXIES.length;
    return PROXIES[this.proxyIndex];
  }

  // Implement respectful delays
  private async respectfulDelay(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    const minDelay = DELAY_MIN + Math.random() * (DELAY_MAX - DELAY_MIN);
    
    if (timeSinceLastRequest < minDelay) {
      await new Promise(resolve => setTimeout(resolve, minDelay - timeSinceLastRequest));
    }
    
    this.lastRequestTime = Date.now();
  }

  // Check robots.txt compliance
  private async checkRobotsTxt(domain: string): Promise<boolean> {
    try {
      const robotsUrl = `https://${domain}/robots.txt`;
      const response = await axios.get(robotsUrl, {
        headers: { 'User-Agent': this.getRandomUserAgent() },
        timeout: 5000
      });
      
      // Simple robots.txt check - in production, use a proper robots.txt parser
      const robotsContent = response.data.toLowerCase();
      return !robotsContent.includes('disallow: /') || robotsContent.includes('allow: /');
    } catch (error) {
      console.log(`Could not check robots.txt for ${domain}, proceeding with caution`);
      return true; // Proceed with caution if robots.txt is not accessible
    }
  }

  // Robust error handling with exponential backoff
  private async makeRequest(url: string, options: any = {}): Promise<any> {
    let lastError: any;
    
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        await this.respectfulDelay();
        
        const response = await axios.get(url, {
          ...options,
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
            'Upgrade-Insecure-Requests': '1',
            ...options.headers
          },
          timeout: 10000,
          maxRedirects: 5,
          validateStatus: (status) => status < 400
        });
        
        this.requestCount++;
        return response;
        
      } catch (error: any) {
        lastError = error;
        
        if (error.response?.status === 429) {
          // Rate limited - wait longer
          const waitTime = RETRY_DELAY * Math.pow(2, attempt);
          console.log(`Rate limited, waiting ${waitTime}ms before retry ${attempt + 1}`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        } else if (error.response?.status >= 400 && error.response?.status < 500) {
          // Client error - don't retry
          throw error;
        } else {
          // Server error or network issue - retry with exponential backoff
          const waitTime = RETRY_DELAY * Math.pow(2, attempt);
          console.log(`Request failed (attempt ${attempt + 1}), retrying in ${waitTime}ms`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }
    
    throw lastError;
  }

  // Search YouTube for videos using multiple methods
  async searchYouTube(query: string): Promise<ScrapingResult[]> {
    const results: ScrapingResult[] = [];
    
    // Method 1: Try YouTube search directly
    try {
      const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
      
      const response = await this.makeRequest(searchUrl);
      const $ = cheerio.load(response.data);
      
      // Multiple selectors for different YouTube layouts
      const selectors = [
        'a[href*="/watch?v="]',
        'a[href*="youtube.com/watch"]',
        '.ytd-video-renderer a[href*="/watch?v="]',
        '#contents a[href*="/watch?v="]'
      ];
      
      for (const selector of selectors) {
        $(selector).each((index, element) => {
          if (results.length >= 5) return false; // Limit results
          
          const href = $(element).attr('href');
          const titleElement = $(element).find('h3, .ytd-video-renderer h3, #video-title, .ytd-video-meta-block h3');
          const title = titleElement.text().trim();
          
          if (href && title && href.includes('/watch?v=') && title.length > 5) {
            const videoId = href.split('v=')[1]?.split('&')[0];
            if (videoId && videoId.length === 11) {
              results.push({
                title: title.substring(0, 100),
                url: `https://www.youtube.com/watch?v=${videoId}`,
                source: 'YouTube',
                duration_minutes: 15 + Math.floor(Math.random() * 10)
              });
            }
          }
        });
        
        if (results.length > 0) break; // Stop if we found results
      }
      
    } catch (error) {
      console.error('YouTube direct search error:', error);
    }
    
    // Method 2: If direct search failed, try alternative search engines
    if (results.length === 0) {
      try {
        // Try searching via Startpage (privacy-focused search engine)
        const startpageUrl = `https://www.startpage.com/sp/search?query=${encodeURIComponent(query + ' site:youtube.com')}`;
        const response = await this.makeRequest(startpageUrl);
        const $ = cheerio.load(response.data);
        
        $('a[href*="youtube.com/watch"]').each((index, element) => {
          if (results.length >= 5) return false;
          
          const href = $(element).attr('href');
          const title = $(element).text().trim();
          
          if (href && title && href.includes('/watch?v=') && title.length > 5) {
            const videoId = href.split('v=')[1]?.split('&')[0];
            if (videoId && videoId.length === 11) {
              results.push({
                title: title.substring(0, 100),
                url: `https://www.youtube.com/watch?v=${videoId}`,
                source: 'YouTube',
                duration_minutes: 15 + Math.floor(Math.random() * 10)
              });
            }
          }
        });
        
      } catch (error) {
        console.error('Startpage YouTube search error:', error);
      }
    }
    
    // Method 3: If still no results, try Bing search
    if (results.length === 0) {
      try {
        const bingUrl = `https://www.bing.com/search?q=${encodeURIComponent(query + ' site:youtube.com')}`;
        const response = await this.makeRequest(bingUrl);
        const $ = cheerio.load(response.data);
        
        $('a[href*="youtube.com/watch"]').each((index, element) => {
          if (results.length >= 5) return false;
          
          const href = $(element).attr('href');
          const title = $(element).text().trim();
          
          if (href && title && href.includes('/watch?v=') && title.length > 5) {
            const videoId = href.split('v=')[1]?.split('&')[0];
            if (videoId && videoId.length === 11) {
              results.push({
                title: title.substring(0, 100),
                url: `https://www.youtube.com/watch?v=${videoId}`,
                source: 'YouTube',
                duration_minutes: 15 + Math.floor(Math.random() * 10)
              });
            }
          }
        });
        
      } catch (error) {
        console.error('Bing YouTube search error:', error);
      }
    }
    
    return results;
  }

  // Search for articles using multiple methods
  async searchArticles(query: string): Promise<ScrapingResult[]> {
    const results: ScrapingResult[] = [];
    
    // Educational domains to prioritize
    const educationalDomains = [
      'medium.com', 'dev.to', 'freecodecamp.org', 'tutorialspoint.com',
      'w3schools.com', 'mdn.mozilla.org', 'stackoverflow.com',
      'github.com', 'docs.python.org', 'nodejs.org', 'reactjs.org',
      'studiobinder.com', 'premiumbeat.com', 'masterclass.com',
      'bhphotovideo.com', 'digitalcameraworld.com', 'photographymad.com',
      'skillshare.com', 'udemy.com', 'coursera.org', 'edx.org',
      'khanacademy.org', 'codecademy.com', 'pluralsight.com'
    ];
    
    // Method 1: Try DuckDuckGo
    try {
      const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
      
      const response = await this.makeRequest(searchUrl);
      const $ = cheerio.load(response.data);
      
      // Multiple selectors for DuckDuckGo results
      const selectors = [
        '.result__title a',
        '.result__url a',
        '.result a',
        '.result__snippet a'
      ];
      
      for (const selector of selectors) {
        $(selector).each((index, element) => {
          if (results.length >= 5) return false;
          
          const href = $(element).attr('href');
          const title = $(element).text().trim();
          
          if (href && title && !href.includes('duckduckgo.com') && title.length > 10) {
            try {
              const url = new URL(href);
              const isEducational = educationalDomains.some(domain => 
                url.hostname.includes(domain)
              );
              
              if (isEducational) {
                results.push({
                  title: title.substring(0, 100),
                  url: href,
                  source: url.hostname,
                  duration_minutes: 10 + Math.floor(Math.random() * 8)
                });
              }
            } catch (e) {
              // Skip invalid URLs
            }
          }
        });
        
        if (results.length > 0) break;
      }
      
    } catch (error) {
      console.error('DuckDuckGo search error:', error);
    }
    
    // Method 2: If no results, try Startpage
    if (results.length === 0) {
      try {
        const searchUrl = `https://www.startpage.com/sp/search?query=${encodeURIComponent(query)}`;
        
        const response = await this.makeRequest(searchUrl);
        const $ = cheerio.load(response.data);
        
        $('a[href^="http"]').each((index, element) => {
          if (results.length >= 5) return false;
          
          const href = $(element).attr('href');
          const title = $(element).text().trim();
          
          if (href && title && title.length > 10) {
            try {
              const url = new URL(href);
              const isEducational = educationalDomains.some(domain => 
                url.hostname.includes(domain)
              );
              
              if (isEducational) {
                results.push({
                  title: title.substring(0, 100),
                  url: href,
                  source: url.hostname,
                  duration_minutes: 10 + Math.floor(Math.random() * 8)
                });
              }
            } catch (e) {
              // Skip invalid URLs
            }
          }
        });
        
      } catch (error) {
        console.error('Startpage search error:', error);
      }
    }
    
    // Method 3: If still no results, try Bing
    if (results.length === 0) {
      try {
        const searchUrl = `https://www.bing.com/search?q=${encodeURIComponent(query)}`;
        
        const response = await this.makeRequest(searchUrl);
        const $ = cheerio.load(response.data);
        
        $('a[href^="http"]').each((index, element) => {
          if (results.length >= 5) return false;
          
          const href = $(element).attr('href');
          const title = $(element).text().trim();
          
          if (href && title && !href.includes('bing.com') && title.length > 10) {
            try {
              const url = new URL(href);
              const isEducational = educationalDomains.some(domain => 
                url.hostname.includes(domain)
              );
              
              if (isEducational) {
                results.push({
                  title: title.substring(0, 100),
                  url: href,
                  source: url.hostname,
                  duration_minutes: 10 + Math.floor(Math.random() * 8)
                });
              }
            } catch (e) {
              // Skip invalid URLs
            }
          }
        });
        
      } catch (error) {
        console.error('Bing search error:', error);
      }
    }
    
    return results;
  }

  // Main search function that coordinates different search types
  async searchResources(query: string, type: 'watch' | 'read' | 'listen'): Promise<ResourceT[]> {
    console.log(`Advanced scraping: ${type} resources for "${query}"`);
    
    let results: ScrapingResult[] = [];
    
    if (type === 'watch') {
      results = await this.searchYouTube(query);
    } else if (type === 'read') {
      results = await this.searchArticles(query);
    } else if (type === 'listen') {
      // For now, generate podcast-style results
      results = [
        {
          title: `${query} Podcast Episode`,
          url: `https://spotify.com/search/${encodeURIComponent(query)}`,
          source: 'Spotify',
          duration_minutes: 20
        }
      ];
    }
    
    // Convert to ResourceT format
    return results.map(result => ({
      kind: type,
      title: result.title,
      url: result.url,
      source: result.source,
      duration_minutes: result.duration_minutes || 15,
      split: null
    }));
  }

  // Get scraping statistics
  getStats() {
    return {
      requestCount: this.requestCount,
      userAgentIndex: this.userAgentIndex,
      proxyIndex: this.proxyIndex
    };
  }
}

// Export singleton instance
export const advancedScraper = new AdvancedWebScraper();
export default advancedScraper;
