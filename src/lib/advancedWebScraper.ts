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
          
          // Extract video data from YouTube's JSON data
          const scripts = $('script').toArray();
          for (const script of scripts) {
            const scriptContent = $(script).html();
            if (scriptContent && scriptContent.includes('videoRenderer')) {
              try {
                const jsonMatch = scriptContent.match(/var ytInitialData = ({.+?});/);
                if (jsonMatch) {
                  const data = JSON.parse(jsonMatch[1]);
                  const videos = this.extractVideosFromData(data);
                  // Limit to only 2 high-rated videos per day
                  for (const video of videos.slice(0, 2)) {
                    results.push({
                      kind: 'watch',
                      title: video.title,
                      url: `https://www.youtube.com/watch?v=${video.id}`,
                      source: 'YouTube',
                      duration_minutes: 15,
                      description: `Learn ${query} with this video tutorial`,
                      split: null
                    });
                  }
                  break;
                }
              } catch (e) {
                console.log('Failed to parse YouTube JSON data');
              }
            }
          }
          
          // Fallback to DOM scraping if JSON parsing fails
          if (results.length === 0) {
            $('a[href*="/watch?v="]').each((index, element) => {
              if (results.length >= 2) return false;
              
              const href = $(element).attr('href');
              const title = $(element).find('h3').text().trim() || 
                           $(element).attr('title') || 
                           $(element).text().trim();
              
              if (href && title && href.includes('/watch?v=') && 
                  title.length > 5 && !title.includes('{') && !title.includes('css-') && 
                  !title.includes('YouTube') && !title.includes('Sign in')) {
                
                const videoId = href.split('v=')[1]?.split('&')[0];
                if (videoId && videoId.length === 11) {
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
          }
          
          if (results.length > 0) break;
        } catch (error) {
          console.log(`YouTube search failed for "${searchTerm}":`, error instanceof Error ? error.message : String(error));
          continue;
        }
      }
    } catch (error) {
      console.error('YouTube search failed:', error);
    }
    
    
    console.log(`Found ${results.length} YouTube videos`);
    return results;
  }

  // Extract videos from YouTube's JSON data
  private extractVideosFromData(data: any): Array<{id: string, title: string}> {
    const videos: Array<{id: string, title: string}> = [];
    
    try {
      const contents = data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents;
      if (contents) {
        for (const item of contents) {
          if (item.videoRenderer) {
            const videoId = item.videoRenderer.videoId;
            const title = item.videoRenderer.title?.runs?.[0]?.text || item.videoRenderer.title?.simpleText;
            if (videoId && title) {
              videos.push({ id: videoId, title });
            }
          }
        }
      }
    } catch (e) {
      console.log('Error extracting videos from YouTube data');
    }
    
    return videos;
  }

  // Extract articles from any website page
  private extractArticlesFromPage($: cheerio.CheerioAPI, sourceName: string, query: string, results: ResourceT[], globalUsedUrls: Set<string>): void {
    console.log(`Extracting articles from ${sourceName} page`);
    
    // Use source-specific selectors for better results - more specific to avoid navigation
    const sourceSelectors: { [key: string]: string[] } = {
      'Medium': [
        'article a[href*="/@"]:not([href*="#"]):not([href*="javascript"])',
        '.postArticle-content a:not([href*="#"]):not([href*="javascript"])',
        '[data-testid="post-preview"] a:not([href*="#"]):not([href*="javascript"])',
        'h3 a:not([href*="#"]):not([href*="javascript"])'
      ],
      'Dev.to': [
        'article a[href*="/articles/"]:not([href*="#"]):not([href*="javascript"])',
        '.crayons-story a:not([href*="#"]):not([href*="javascript"])',
        '.crayons-story__title a:not([href*="#"]):not([href*="javascript"])',
        'h2 a:not([href*="#"]):not([href*="javascript"])'
      ],
      'Hashnode': [
        'article a[href*="/@"]:not([href*="#"]):not([href*="javascript"])',
        '.blog-post a:not([href*="#"]):not([href*="javascript"])',
        '.post-title a:not([href*="#"]):not([href*="javascript"])'
      ],
      'FreeCodeCamp': [
        'article a[href*="/news/"]:not([href*="#"]):not([href*="javascript"])',
        '.post-card a:not([href*="#"]):not([href*="javascript"])',
        'h2 a:not([href*="#"]):not([href*="javascript"])'
      ],
      'Reddit': [
        'a[href*="/r/"]:not([href*="#"]):not([href*="javascript"])',
        '.post a:not([href*="#"]):not([href*="javascript"])',
        'h3 a:not([href*="#"]):not([href*="javascript"])'
      ],
      'Stack Overflow': [
        'a[href*="/questions/"]:not([href*="#"]):not([href*="javascript"])',
        '.question-summary a:not([href*="#"]):not([href*="javascript"])',
        'h3 a:not([href*="#"]):not([href*="javascript"])'
      ],
      'Smashing Magazine': [
        'article a:not([href*="#"]):not([href*="javascript"])',
        '.article-card a:not([href*="#"]):not([href*="javascript"])',
        'h2 a:not([href*="#"]):not([href*="javascript"])',
        '.post-title a:not([href*="#"]):not([href*="javascript"])'
      ]
    };

    const selectors = sourceSelectors[sourceName] || [
      'article a',
      'h1 a, h2 a, h3 a',
      'a[href*="/article"]',
      'a[href*="/post"]',
      'a[href*="/blog"]'
    ];

    const usedUrls = new Set<string>();
    let foundCount = 0;

    for (const selector of selectors) {
      console.log(`Trying selector: ${selector}`);
      $(selector).each((index, element) => {
        if (results.length >= 2) return false;
        
        const href = $(element).attr('href');
        const title = $(element).find('h1, h2, h3').text().trim() || 
                     $(element).text().trim() ||
                     $(element).attr('title') || '';
        
        console.log(`Found link: ${href}, title: ${title.substring(0, 50)}`);
        
        if (href && title && title.length > 10 && title.length < 150 && 
            !title.includes('Sign in') && !title.includes('Subscribe') && 
            !title.includes('Login') && !title.includes('Register') &&
            !title.includes('Menu') && !title.includes('Search') &&
            !title.includes('{') && !title.includes('css-') &&
            !title.includes('Home') && !title.includes('About') &&
            !title.includes('Contact') && !title.includes('Privacy') &&
            !title.includes('Market Research and Competitive Analysis') && // Filter out generic titles
            !title.includes('Jump to list') && !title.includes('Jump to') && // Filter out navigation
            !title.includes('All articles') && !title.includes('Browse') &&
            !title.includes('Categories') && !title.includes('Tags') &&
            !title.includes('Archive') && !title.includes('More') &&
            !title.includes('View all') && !title.includes('See all') &&
            !title.includes('Read more') && !title.includes('Continue reading') &&
            !href.includes('#') && !href.includes('javascript:') && // Filter out anchors and JS
            !usedUrls.has(href)) {
          
          // Build full URL
          let fullUrl = href;
          if (!href.startsWith('http')) {
            const baseUrl = this.getBaseUrl(sourceName);
            fullUrl = href.startsWith('/') ? `${baseUrl}${href}` : `${baseUrl}/${href}`;
          }
          
          // Skip if URL is already used globally
          if (globalUsedUrls.has(fullUrl)) return;
          
          // Additional validation: ensure it's a real article URL
          const isRealArticle = this.isRealArticleUrl(fullUrl, sourceName);
          if (!isRealArticle) {
            console.log(`Skipping non-article URL: ${fullUrl}`);
            return;
          }
          
          results.push({
            kind: 'read',
            title: title.substring(0, 100),
            url: fullUrl,
            source: sourceName,
            duration_minutes: 15,
            description: `Read about ${query} on ${sourceName}`,
            split: null
          });
          globalUsedUrls.add(fullUrl);
          foundCount++;
          console.log(`Added article: ${title.substring(0, 50)} from ${sourceName}`);
        }
      });
      
      if (results.length >= 2) break; // Stop if we have enough results
    }
    
    console.log(`Found ${foundCount} articles from ${sourceName}`);
  }

  // Get base URL for different sources
  private getBaseUrl(sourceName: string): string {
    const baseUrls: { [key: string]: string } = {
      'Medium': 'https://medium.com',
      'Dev.to': 'https://dev.to',
      'Hashnode': 'https://hashnode.com',
      'FreeCodeCamp': 'https://www.freecodecamp.org',
      'Smashing Magazine': 'https://www.smashingmagazine.com',
      'CSS-Tricks': 'https://css-tricks.com',
      'A List Apart': 'https://alistapart.com',
      'Reddit': 'https://www.reddit.com',
      'Stack Overflow': 'https://stackoverflow.com'
    };
    return baseUrls[sourceName] || 'https://example.com';
  }

  // Validate if URL is a real article (not navigation or generic page)
  private isRealArticleUrl(url: string, sourceName: string): boolean {
    // Skip navigation and generic pages
    const skipPatterns = [
      '/search', '/category', '/tag', '/archive', '/browse', '/list',
      '/all', '/more', '/popular', '/trending', '/latest', '/recent',
      '/about', '/contact', '/privacy', '/terms', '/help', '/support',
      '/login', '/register', '/signup', '/signin', '/auth',
      '/dashboard', '/profile', '/settings', '/account',
      '/home', '/index', '/main', '/default'
    ];

    for (const pattern of skipPatterns) {
      if (url.toLowerCase().includes(pattern)) {
        return false;
      }
    }

    // Platform-specific validation
    switch (sourceName) {
      case 'Medium':
        return url.includes('/@') && !url.includes('/search');
      case 'Dev.to':
        return url.includes('/articles/') || url.includes('/@');
      case 'Reddit':
        return url.includes('/r/') && url.includes('/comments/');
      case 'Stack Overflow':
        return url.includes('/questions/');
      case 'Smashing Magazine':
        return url.includes('/articles/') || url.includes('/guides/');
      case 'FreeCodeCamp':
        return url.includes('/news/') || url.includes('/learn/');
      default:
        return true; // Allow other sources
    }
  }

  // Search real websites for articles
  async searchArticles(query: string, goal?: string): Promise<ResourceT[]> {
    const results: ResourceT[] = [];
    const globalUsedUrls = new Set<string>(); // Prevent duplicates across all searches
    
    try {
      console.log(`Searching ANY website for articles about: "${query}"`);
      
      // Search multiple article platforms and blogs
      const articleSources = [
        { name: 'Wikipedia', url: `https://en.wikipedia.org/wiki/${encodeURIComponent(query.replace(/\s+/g, '_'))}`, type: 'direct' },
        { name: 'Medium', url: `https://medium.com/search?q=${encodeURIComponent(query)}`, type: 'search' },
        { name: 'Dev.to', url: `https://dev.to/search?q=${encodeURIComponent(query)}`, type: 'search' },
        { name: 'Hashnode', url: `https://hashnode.com/search?q=${encodeURIComponent(query)}`, type: 'search' },
        { name: 'FreeCodeCamp', url: `https://www.freecodecamp.org/news/search/?query=${encodeURIComponent(query)}`, type: 'search' },
        { name: 'Smashing Magazine', url: `https://www.smashingmagazine.com/search/?q=${encodeURIComponent(query)}`, type: 'search' },
        { name: 'CSS-Tricks', url: `https://css-tricks.com/?s=${encodeURIComponent(query)}`, type: 'search' },
        { name: 'A List Apart', url: `https://alistapart.com/?s=${encodeURIComponent(query)}`, type: 'search' },
        { name: 'Reddit', url: `https://www.reddit.com/search/?q=${encodeURIComponent(query)}`, type: 'search' },
        { name: 'Stack Overflow', url: `https://stackoverflow.com/search?q=${encodeURIComponent(query)}`, type: 'search' }
      ];

      for (const source of articleSources.slice(0, 6)) {
        try {
          console.log(`Searching ${source.name} for articles about: ${query}`);
          const response = await this.makeRequest(source.url);
          const $ = cheerio.load(response.data);
          
          if (source.type === 'direct') {
            // Direct article (like Wikipedia)
            if (response.status === 200) {
              results.push({
                kind: 'read',
                title: `${query} - ${source.name}`,
                url: source.url,
                source: source.name,
                duration_minutes: 20,
                description: `Comprehensive information about ${query}`,
                split: null
              });
              console.log(`Added direct article from ${source.name}`);
            }
          } else {
            // Search results page
            const beforeCount = results.length;
            this.extractArticlesFromPage($, source.name, query, results, globalUsedUrls);
            const afterCount = results.length;
            console.log(`${source.name}: Found ${afterCount - beforeCount} new articles`);
          }
          
          if (results.length >= 3) break;
        } catch (error) {
          console.log(`${source.name} search failed:`, error instanceof Error ? error.message : String(error));
        }
      }


    } catch (error) {
      console.error('Article search failed:', error);
    }
    
    
    console.log(`Found ${results.length} articles`);
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