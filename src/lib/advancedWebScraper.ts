import axios from 'axios';
import * as cheerio from 'cheerio';
import { ResourceT } from './schema';
import { realWebScraper } from './realWebScraper';

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
    
    // Use source-specific selectors for better results - focus on ANY readable content
    const sourceSelectors: { [key: string]: string[] } = {
      'Google Search': [
        'a[href*="http"]:not([href*="google.com"]):not([href*="youtube.com"]):not([href*="facebook.com"]):not([href*="twitter.com"])',
        '.g a[href*="http"]',
        '.yuRUbf a',
        '.LC20lb',
        'h3 a',
        '.DKV0Md a'
      ],
      'Medium': [
        'article a[href*="/@"]',
        'a[href*="/@"]',
        '.postArticle-content a',
        '[data-testid="post-preview"] a',
        'h3 a',
        'h2 a',
        '.post-title a',
        '.article-title a'
      ],
      'Substack': [
        'article a',
        '.post a',
        '.article a',
        'h2 a',
        'h3 a',
        '.title a',
        '.post-title a',
        'a[href*="/p/"]'
      ],
      'Dev.to': [
        'article a[href*="/articles/"]',
        'a[href*="/articles/"]',
        '.crayons-story a[href*="/articles/"]',
        '.crayons-story__title a[href*="/articles/"]',
        'h2 a[href*="/articles/"]',
        'h3 a[href*="/articles/"]',
        '.crayons-story__title a',
        '.crayons-story__meta a'
      ],
      'Hashnode': [
        'article a[href*="/@"]',
        'a[href*="/@"]',
        '.blog-post a',
        '.post-title a',
        'h2 a',
        'h3 a'
      ],
      'Wikipedia': [
        'a[href*="/wiki/"]',
        '.mw-content-ltr a',
        'h1 a',
        'h2 a',
        'h3 a'
      ],
      'Reddit': [
        'a[href*="/r/"]',
        '.post a',
        'h3 a',
        '.title a',
        'a[data-click-id="body"]'
      ],
      'FreeCodeCamp': [
        'article a[href*="/news/"]',
        'a[href*="/news/"]',
        '.post-card a',
        'h2 a',
        'h3 a'
      ]
    };

    const selectors = sourceSelectors[sourceName] || [
      'article a',
      'h1 a, h2 a, h3 a',
      'a[href*="/article"]',
      'a[href*="/post"]',
      'a[href*="/blog"]'
    ];
    
    console.log(`Using selectors for ${sourceName}:`, selectors);

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
        
        // Extremely lenient filtering - accept almost ANY content
        if (href && title && title.length > 3 && title.length < 300 && 
            !title.includes('Sign in') && !title.includes('Subscribe') && 
            !title.includes('Login') && !title.includes('Register') &&
            !title.includes('Menu') && !title.includes('Search') &&
            !title.includes('{') && !title.includes('css-') &&
            !href.includes('#') && !href.includes('javascript:') && // Filter out anchors and JS
            !href.includes('youtube.com') && !href.includes('youtu.be') && // Filter out YouTube videos
            !href.includes('facebook.com') && !href.includes('twitter.com') && // Filter out social media
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
      'Google Search': 'https://www.google.com',
      'Medium': 'https://medium.com',
      'Substack': 'https://substack.com',
      'Dev.to': 'https://dev.to',
      'Hashnode': 'https://hashnode.com',
      'FreeCodeCamp': 'https://www.freecodecamp.org',
      'Wikipedia': 'https://en.wikipedia.org',
      'Towards Data Science': 'https://towardsdatascience.com',
      'UX Planet': 'https://uxplanet.org',
      'Smashing Magazine': 'https://www.smashingmagazine.com',
      'CSS-Tricks': 'https://css-tricks.com',
      'A List Apart': 'https://alistapart.com',
      'Reddit': 'https://www.reddit.com',
      'Stack Overflow': 'https://stackoverflow.com'
    };
    return baseUrls[sourceName] || 'https://example.com';
  }

  // Check if article title is relevant to the query/goal
  private isTitleRelevant(title: string, query: string): boolean {
    const titleLower = title.toLowerCase();
    const queryLower = query.toLowerCase();
    
    // Extract key terms from query
    const queryTerms = queryLower.split(/\s+/).filter(term => 
      term.length > 2 && 
      !['the', 'and', 'or', 'but', 'for', 'with', 'about', 'learn', 'how', 'to'].includes(term)
    );
    
    // Check if title contains any of the key terms
    const hasRelevantTerm = queryTerms.some(term => titleLower.includes(term));
    
    // Also check for common variations
    const commonVariations: { [key: string]: string[] } = {
      'product': ['product', 'pm', 'management', 'manager'],
      'design': ['design', 'ux', 'ui', 'user experience'],
      'development': ['development', 'coding', 'programming', 'software'],
      'marketing': ['marketing', 'growth', 'acquisition', 'conversion'],
      'data': ['data', 'analytics', 'metrics', 'insights'],
      'ai': ['ai', 'artificial intelligence', 'machine learning', 'ml'],
      'chatbot': ['chatbot', 'chat', 'conversation', 'ai assistant']
    };
    
    let hasVariation = false;
    for (const [key, variations] of Object.entries(commonVariations)) {
      if (queryLower.includes(key)) {
        hasVariation = variations.some(variation => titleLower.includes(variation));
        if (hasVariation) break;
      }
    }
    
    const isRelevant = hasRelevantTerm || hasVariation;
    console.log(`Title relevance check: "${title.substring(0, 50)}" vs "${query}" = ${isRelevant}`);
    
    return isRelevant;
  }

  // Validate if URL is a real article (not navigation or generic page)
  private isRealArticleUrl(url: string, sourceName: string): boolean {
    console.log(`Validating URL: ${url} for source: ${sourceName}`);
    
    // Skip obvious navigation and generic pages
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
        console.log(`Rejected URL due to pattern: ${pattern}`);
        return false;
      }
    }

    // Platform-specific validation - very lenient for ANY readable content
    switch (sourceName) {
      case 'Google Search':
        // Accept any external website from Google search results
        const isValidGoogle = !url.includes('google.com') && !url.includes('youtube.com') && 
                             !url.includes('facebook.com') && !url.includes('twitter.com') &&
                             url.includes('http');
        console.log(`Google Search validation: ${isValidGoogle}`);
        return isValidGoogle;
      case 'Medium':
        const isValidMedium = url.includes('/@') || url.includes('medium.com');
        console.log(`Medium validation: ${isValidMedium}`);
        return isValidMedium;
      case 'Substack':
        const isValidSubstack = (url.includes('/p/') && url.includes('substack.com')) || 
                               (url.includes('substack.com') && !url.includes('/search') && !url.includes('/discover'));
        console.log(`Substack validation: ${isValidSubstack} for URL: ${url}`);
        return isValidSubstack;
      case 'Dev.to':
        const isValidDev = url.includes('/articles/') || url.includes('/@') || url.includes('dev.to');
        console.log(`Dev.to validation: ${isValidDev}`);
        return isValidDev;
      case 'Hashnode':
        const isValidHashnode = url.includes('/@') || url.includes('hashnode.com');
        console.log(`Hashnode validation: ${isValidHashnode}`);
        return isValidHashnode;
      case 'FreeCodeCamp':
        const isValidFCC = url.includes('/news/') || url.includes('/learn/') || url.includes('freecodecamp.org');
        console.log(`FreeCodeCamp validation: ${isValidFCC}`);
        return isValidFCC;
      case 'Wikipedia':
        const isValidWiki = url.includes('/wiki/') || url.includes('wikipedia.org');
        console.log(`Wikipedia validation: ${isValidWiki}`);
        return isValidWiki;
      default:
        console.log(`Default validation: true`);
        return true; // Allow other sources
    }
  }

  // Create specific search queries for article platforms
  createSpecificQuery(query: string, goal?: string): string[] {
    const queries = [];
    
    // Clean up the query
    const cleanQuery = query.replace(/day \d+/gi, '').trim();
    
    if (goal) {
      const goalWords = goal.toLowerCase().split(' ').filter(word => word.length > 3);
      const mainGoal = goalWords[0] || goal.toLowerCase();
      
      queries.push(
        `${mainGoal} ${cleanQuery}`,
        `${cleanQuery} ${mainGoal}`,
        `${mainGoal} ${cleanQuery} tutorial`,
        `${mainGoal} ${cleanQuery} guide`,
        `${cleanQuery} for ${mainGoal}`
      );
    } else {
      queries.push(
        cleanQuery,
        `${cleanQuery} tutorial`,
        `${cleanQuery} guide`,
        `${cleanQuery} how to`,
        `learn ${cleanQuery}`
      );
    }
    
    return queries.filter(q => q.trim().length > 0);
  }

  // Search for articles by directly accessing article platforms
  async searchArticles(query: string, goal?: string): Promise<ResourceT[]> {
    const results: ResourceT[] = [];
    const globalUsedUrls = new Set<string>();
    
    try {
      console.log(`Searching for articles about: "${query}"`);
      
      // Create specific search queries for each platform
      const searchQueries = this.createSpecificQuery(query, goal);
      
      // Article platforms to search directly
      const platforms = [
        {
          name: 'Medium',
          searchUrl: (q: string) => `https://medium.com/search?q=${encodeURIComponent(q)}`,
          selectors: ['article h3 a', 'article h2 a', '.postArticle-content h3 a', 'h3 a'],
          domain: 'medium.com'
        },
        {
          name: 'Dev.to',
          searchUrl: (q: string) => `https://dev.to/search?q=${encodeURIComponent(q)}`,
          selectors: ['article h2 a', 'article h3 a', '.crayons-story__title a'],
          domain: 'dev.to'
        },
        {
          name: 'Substack',
          searchUrl: (q: string) => `https://substack.com/search?q=${encodeURIComponent(q)}`,
          selectors: [
            '.post-preview-title a',
            '.post-title a', 
            'article h2 a',
            'article h3 a',
            '.pencraft a[href*="/p/"]',
            'a[href*=".substack.com/p/"]',
            '.post-preview a'
          ],
          domain: 'substack.com'
        },
        {
          name: 'Hashnode',
          searchUrl: (q: string) => `https://hashnode.com/search?q=${encodeURIComponent(q)}`,
          selectors: ['article h2 a', 'article h3 a', '.blog-title a'],
          domain: 'hashnode.com'
        },
        {
          name: 'FreeCodeCamp',
          searchUrl: (q: string) => `https://www.freecodecamp.org/news/search/?query=${encodeURIComponent(q)}`,
          selectors: ['article h2 a', 'article h3 a', '.post-title a'],
          domain: 'freecodecamp.org'
        }
      ];
      
      // Search each platform - only need 1 article
      for (const platform of platforms) {
        if (results.length >= 1) break; // Only need 1 article
        
        for (const searchQuery of searchQueries.slice(0, 1)) { // Only try first query
          try {
            const searchUrl = platform.searchUrl(searchQuery);
            console.log(`🔍 Searching ${platform.name}: ${searchQuery}`);
            console.log(`🔗 URL: ${searchUrl}`);
            
            const response = await this.makeRequest(searchUrl);
            console.log(`${platform.name} response status: ${response.status}`);
            console.log(`${platform.name} content length: ${response.data.length}`);
            
            if (response.status === 200) {
              const $ = cheerio.load(response.data);
              console.log(`📄 Page title: ${$('title').text()}`);
              
              // Platform-specific selectors
              let selectors: string[];
              switch (platform.name) {
                case 'Medium':
                  selectors = ['article h3 a', 'article h2 a', '.postArticle-content h3 a'];
                  break;
                case 'Dev.to':
                  selectors = ['article h2 a', 'article h3 a', '.crayons-story__title a'];
                  break;
                case 'Substack':
                  selectors = [
                    '.post-preview-title a',
                    '.post-title a',
                    'article h2 a', 
                    'article h3 a',
                    '.pencraft a[href*="/p/"]',
                    'a[href*=".substack.com/p/"]',
                    '.post-preview a'
                  ];
                  break;
                case 'Hashnode':
                  selectors = ['article h2 a', 'article h3 a', '.blog-title a'];
                  break;
                case 'FreeCodeCamp':
                  selectors = ['article h2 a', 'article h3 a', '.post-title a'];
                  break;
                default:
                  selectors = ['article a', 'h2 a', 'h3 a'];
              }
              console.log(`🔍 Trying ${selectors.length} selectors for ${platform.name}`);
              
              for (const selector of selectors) {
                const elements = $(selector);
                console.log(`${platform.name} selector "${selector}" found ${elements.length} elements`);
                
                if (elements.length > 0) {
                  elements.each((index, element) => {
                    if (results.length >= 1) return false; // Only need 1
                    
                    const href = $(element).attr('href');
                    let title = $(element).text().trim();
                    
                    console.log(`Element ${index}: href="${href}", title="${title.substring(0, 50)}"`);
                    
                    if (href && title && title.length > 10 && !globalUsedUrls.has(href)) {
                      try {
                        // Ensure full URL
                        let fullUrl = href;
                        if (!href.startsWith('http')) {
                          fullUrl = href.startsWith('/') ? `https://${platform.domain}${href}` : `https://${platform.domain}/${href}`;
                        }
                        
                        const url = new URL(fullUrl);
                        
                        console.log(`🔗 Checking URL: ${fullUrl}`);
                        console.log(`🔗 URL pathname: ${url.pathname}`);
                        
                        // Very strict validation for real articles
                        const isValidArticle = 
                          !fullUrl.includes('search') && 
                          !fullUrl.includes('results') && 
                          !fullUrl.includes('?q=') &&
                          !fullUrl.includes('sitemap') &&
                          !fullUrl.includes('tag/') &&
                          !fullUrl.includes('category/') &&
                          !fullUrl.includes('/@') && // Skip Medium author pages
                          !fullUrl.includes('gamers-forum') && // Skip dev.to forum
                          !title.toLowerCase().includes('search') &&
                          !title.toLowerCase().includes('results') &&
                          !title.toLowerCase().includes('sitemap') &&
                          !title.toLowerCase().includes('tag') &&
                          !title.toLowerCase().includes('category') &&
                          !title.toLowerCase().includes('gamers forum') &&
                          title.length > 15 &&
                          url.pathname.length > 5 && // Must have meaningful path
                          !url.pathname.endsWith('/') && // Not just a directory
                          url.pathname.split('/').length > 2 && // Must have article path
                          !url.pathname.includes('search') &&
                          !url.pathname.includes('tag') &&
                          !url.pathname.includes('category');
                        
                        if (isValidArticle) {
                          results.push({
                            kind: 'read',
                            title: title.substring(0, 100),
                            url: fullUrl,
                            source: platform.domain,
                            duration_minutes: 8 + Math.floor(Math.random() * 10),
                            description: `Article about ${query}`,
                            split: null
                          });
                          
                          globalUsedUrls.add(fullUrl);
                          console.log(`✅ Added ${platform.name} article: ${title.substring(0, 50)}`);
                          console.log(`✅ URL: ${fullUrl}`);
                          return false; // Stop after finding one
                        } else {
                          console.log(`❌ Skipped invalid article: ${title.substring(0, 30)} - ${fullUrl}`);
                        }
                      } catch (e) {
                        console.log(`❌ Invalid URL: ${href}`);
                      }
                    }
                  });
                  
                  if (results.length > 0) break;
                }
              }
            } else {
              console.log(`❌ ${platform.name} returned status ${response.status}`);
            }
            
            if (results.length > 0) break;
          } catch (error) {
            console.error(`${platform.name} search error:`, error);
            continue;
          }
        }
      }
      
      // If still no results, try a general web search for blog posts
      if (results.length === 0) {
        try {
          const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query + ' blog article')}`;
          console.log(`🔍 Trying general blog search: ${query}`);
          console.log(`🔗 URL: ${searchUrl}`);
          
          const response = await this.makeRequest(searchUrl);
          console.log(`DuckDuckGo response status: ${response.status}`);
          console.log(`DuckDuckGo content length: ${response.data.length}`);
          
          const $ = cheerio.load(response.data);
          console.log(`📄 Page title: ${$('title').text()}`);
          
          // Try multiple selectors for DuckDuckGo
          const selectors = ['.result__title a', '.result__url a', '.result a', 'a[href^="http"]'];
          
          for (const selector of selectors) {
            const elements = $(selector);
            console.log(`DuckDuckGo selector "${selector}" found ${elements.length} elements`);
            
            elements.each((index, element) => {
              if (results.length >= 1) return false; // Only need 1
              
              const href = $(element).attr('href');
              let title = $(element).text().trim();
              
              console.log(`Element ${index}: href="${href}", title="${title.substring(0, 50)}"`);
              
              if (href && title && title.length > 10 && !globalUsedUrls.has(href) && !href.includes('duckduckgo.com')) {
                try {
                  const url = new URL(href);
                  
                  console.log(`🔗 Checking DuckDuckGo result: ${href}`);
                  console.log(`🔗 URL pathname: ${url.pathname}`);
                  
                  // Strict validation for real articles
                  const isValidArticle = 
                    !href.includes('search') && 
                    !href.includes('results') && 
                    !href.includes('?q=') &&
                    !href.includes('sitemap') &&
                    !href.includes('tag/') &&
                    !href.includes('category/') &&
                    !title.toLowerCase().includes('search') &&
                    !title.toLowerCase().includes('results') &&
                    !title.toLowerCase().includes('sitemap') &&
                    !title.toLowerCase().includes('tag') &&
                    !title.toLowerCase().includes('category') &&
                    title.length > 10 &&
                    url.pathname.length > 3 && // Must have meaningful path
                    !url.pathname.endsWith('/') && // Not just a directory
                    url.pathname.split('/').length > 2; // Must have article path
                  
                  if (isValidArticle) {
                    results.push({
                      kind: 'read',
                      title: title.substring(0, 100),
                      url: href,
                      source: url.hostname.replace('www.', ''),
                      duration_minutes: 8 + Math.floor(Math.random() * 10),
                      description: `Article about ${query}`,
                      split: null
                    });
                    
                    globalUsedUrls.add(href);
                    console.log(`✅ Added web article: ${title.substring(0, 50)} from ${url.hostname}`);
                    console.log(`✅ URL: ${href}`);
                  } else {
                    console.log(`❌ Skipped invalid article: ${title.substring(0, 30)} - ${href}`);
                  }
                } catch (e) {
                  console.log(`❌ Invalid URL: ${href}`);
                }
              }
            });
            
            if (results.length > 0) break;
          }
          
        } catch (error) {
          console.error('General blog search error:', error);
        }
      }
      
    } catch (error) {
      console.error('Article search failed:', error instanceof Error ? error.message : String(error));
    }
    
    console.log(`Total articles found: ${results.length}`);
    return results;
  }

  // Search for specific podcasts related to the exact goal and day topic
  async searchPodcasts(query: string, goal?: string): Promise<ResourceT[]> {
    const results: ResourceT[] = [];
    
    try {
      console.log(`🔍 [PodcastSearch] Searching for specific podcasts about: "${query}" with goal: "${goal}"`);
      
      // Create very specific search queries for podcasts
      const specificQueries = [
        `"${query}" podcast episode`,
        `${query} ${goal || ''} podcast interview`,
        `${query} podcast discussion`,
        `${query} podcast tutorial audio`
      ];
      
      for (const specificQuery of specificQueries) {
        if (results.length >= 2) break;
        
        try {
          // Search DuckDuckGo for specific podcast episodes
          const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(specificQuery)}`;
          console.log(`🔍 [PodcastSearch] Searching: "${specificQuery}"`);
          
          const response = await this.makeRequest(searchUrl);
          
          if (response.status === 200) {
            const $ = cheerio.load(response.data);
            
            // Look for podcast-specific results
            $('.result').each((index, element) => {
              if (results.length >= 2) return false;
              
              const $result = $(element);
              const titleElement = $result.find('.result__title a, h2 a, h3 a').first();
              const href = titleElement.attr('href');
              const title = titleElement.text().trim();
              
              console.log(`🔗 [PodcastSearch] Found: "${title}" -> ${href}`);
              
              // Check if this is a podcast-related URL and relevant to our query
              if (href && title && this.isPodcastRelated(href, title, query)) {
                results.push({
                  kind: 'listen',
                  title: title.substring(0, 100),
                  url: href,
                  source: this.getPodcastPlatform(href),
                  duration_minutes: 25 + Math.floor(Math.random() * 35),
                  description: `Podcast episode specifically about ${query}`,
                  split: null
                });
                
                console.log(`✅ [PodcastSearch] Found specific podcast: ${title.substring(0, 50)}`);
                console.log(`✅ [PodcastSearch] URL: ${href}`);
              }
            });
          }
          
          if (results.length > 0) break; // Found specific podcasts, stop searching
          
        } catch (error) {
          console.error(`[PodcastSearch] Query "${specificQuery}" failed:`, error instanceof Error ? error.message : String(error));
          continue;
        }
      }
      
    } catch (error) {
      console.error('[PodcastSearch] Specific podcast search failed:', error instanceof Error ? error.message : String(error));
    }
    
    console.log(`🎧 [PodcastSearch] Found ${results.length} specific podcasts for "${query}"`);
    return results;
  }

  // Check if URL and title are podcast-related and relevant
  private isPodcastRelated(url: string, title: string, query: string): boolean {
    const titleLower = title.toLowerCase();
    const queryLower = query.toLowerCase();
    
    // Must be a podcast platform
    const podcastPlatforms = [
      'spotify.com/show/', 'spotify.com/episode/',
      'podcasts.apple.com', 'podcasts.google.com',
      'overcast.fm', 'pocketcasts.com', 'anchor.fm',
      'soundcloud.com', 'castbox.fm', 'stitcher.com'
    ];
    
    const isPodcastUrl = podcastPlatforms.some(platform => url.includes(platform));
    if (!isPodcastUrl) return false;
    
    // Title must be relevant to the query
    const queryWords = queryLower.split(' ').filter(word => word.length > 3);
    const hasRelevantWord = queryWords.some(word => titleLower.includes(word));
    
    // Also check for podcast-specific terms
    const podcastTerms = ['podcast', 'episode', 'interview', 'discussion', 'talk', 'show'];
    const hasPodcastTerm = podcastTerms.some(term => titleLower.includes(term));
    
    return hasRelevantWord && hasPodcastTerm;
  }

  // Get podcast platform name from URL
  private getPodcastPlatform(url: string): string {
    if (url.includes('spotify.com')) return 'Spotify';
    if (url.includes('podcasts.apple.com')) return 'Apple Podcasts';
    if (url.includes('podcasts.google.com')) return 'Google Podcasts';
    if (url.includes('overcast.fm')) return 'Overcast';
    if (url.includes('pocketcasts.com')) return 'Pocket Casts';
    if (url.includes('anchor.fm')) return 'Anchor';
    if (url.includes('soundcloud.com')) return 'SoundCloud';
    if (url.includes('stitcher.com')) return 'Stitcher';
    return 'Podcast Platform';
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
        console.log(`🔍 [AdvancedWebScraper] Starting read resource search for: "${query}" with goal: "${goal}"`);
        
        // Get both real web articles AND AI-generated articles
        const realArticles = await realWebScraper.searchRealArticles(query, goal);
        console.log(`✅ [AdvancedWebScraper] Real web scraper returned ${realArticles.length} articles`);
        
        const aiArticles = await this.searchArticles(query, goal);
        console.log(`✅ [AdvancedWebScraper] AI article search returned ${aiArticles.length} articles`);
        
        // Combine both types - real articles first, then AI articles
        results = [...realArticles, ...aiArticles];
        console.log(`📚 [AdvancedWebScraper] Combined read resources: ${realArticles.length} real articles + ${aiArticles.length} AI articles = ${results.length} total`);
      } else if (type === 'listen') {
        // Use the real web scraper for podcasts too
        results = await realWebScraper.searchRealPodcasts(query, goal);
        console.log(`Real podcast search found ${results.length} results`);
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