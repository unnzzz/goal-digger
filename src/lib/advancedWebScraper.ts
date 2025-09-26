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
        const isValidSubstack = url.includes('/p/') || url.includes('substack.com');
        console.log(`Substack validation: ${isValidSubstack}`);
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

  // Create more specific search query based on goal and day
  private createSpecificQuery(query: string, goal?: string): string {
    // Extract key terms from the query
    const queryTerms = query.toLowerCase().split(/\s+/).filter(term => 
      term.length > 2 && 
      !['the', 'and', 'or', 'but', 'for', 'with', 'about', 'learn', 'how', 'to', 'day'].includes(term)
    );
    
    // If we have a goal, combine it with the query terms
    if (goal) {
      const goalTerms = goal.toLowerCase().split(/\s+/).filter(term => 
        term.length > 2 && 
        !['the', 'and', 'or', 'but', 'for', 'with', 'about', 'learn', 'how', 'to'].includes(term)
      );
      
      // Combine goal and query terms, prioritizing the most specific ones
      const allTerms = [...goalTerms, ...queryTerms];
      const uniqueTerms = [...new Set(allTerms)]; // Remove duplicates
      
      return uniqueTerms.slice(0, 3).join(' '); // Use top 3 most relevant terms
    }
    
    return queryTerms.slice(0, 3).join(' '); // Use top 3 terms from query
  }

  // Search for articles using multiple methods with educational domain filtering
  async searchArticles(query: string, goal?: string): Promise<ResourceT[]> {
    const results: ResourceT[] = [];
    const globalUsedUrls = new Set<string>();
    
    try {
      console.log(`Searching for articles about: "${query}"`);
      
      // Clean up the query but preserve goal context
      const cleanQuery = query.replace(/day \d+/gi, '').replace(/tutorial|guide|basics|fundamentals/gi, '').trim();
      
      // If the query already contains the goal, use it as-is
      const hasGoalContext = goal && query.toLowerCase().includes(goal.toLowerCase());
      const finalQuery = hasGoalContext ? query : cleanQuery;
      
      // Create more specific search variations based on the goal context
      let searchVariations = [];
      
      if (goal) {
        const goalWords = goal.toLowerCase().split(' ').filter(word => word.length > 3);
        const mainGoal = goalWords[0] || goal.toLowerCase();
        
        searchVariations = [
          `${mainGoal} ${finalQuery} tutorial`,
          `${mainGoal} ${finalQuery} guide`,
          `${mainGoal} ${finalQuery} how to`,
          `${finalQuery} for ${mainGoal}`,
          `${mainGoal} ${finalQuery} beginner`
        ];
      } else {
        searchVariations = [
          `${cleanQuery} tutorial`,
          `${cleanQuery} complete guide`,
          `${cleanQuery} how to guide`,
          `${cleanQuery} beginner tutorial`,
          `${cleanQuery} learn ${cleanQuery}`
        ];
      }
      
      // Educational domains to prioritize
      const educationalDomains = [
        'medium.com', 'dev.to', 'freecodecamp.org', 'tutorialspoint.com',
        'w3schools.com', 'mdn.mozilla.org', 'stackoverflow.com',
        'github.com', 'docs.python.org', 'nodejs.org', 'reactjs.org',
        'studiobinder.com', 'premiumbeat.com', 'masterclass.com',
        'bhphotovideo.com', 'digitalcameraworld.com', 'photographymad.com',
        'skillshare.com', 'udemy.com', 'coursera.org', 'edx.org',
        'khanacademy.org', 'codecademy.com', 'pluralsight.com',
        'wikipedia.org', 'wikihow.com', 'instructables.com',
        'allrecipes.com', 'foodnetwork.com', 'seriouseats.com',
        'healthline.com', 'webmd.com', 'mayoclinic.org',
        'investopedia.com', 'linkedin.com'
      ];
      
      // Method 1: Try multiple search variations with DuckDuckGo
      for (const searchTerm of searchVariations.slice(0, 3)) {
        try {
          const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(searchTerm)}`;
          console.log(`Trying DuckDuckGo: ${searchTerm}`);
          
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
              if (results.length >= 3) return false;
              
              const href = $(element).attr('href');
              let title = $(element).text().trim();
              
              // Clean up title - remove CSS classes and ensure it's actual text
              if (title.includes('{') || title.includes('css-') || title.includes('display:') || title.length < 10 || title.includes('http') || title.includes('search') || title.includes('results')) {
                const altTitle = $(element).attr('title') || $(element).attr('aria-label') || $(element).find('h3, h2, h1').text().trim();
                if (altTitle && !altTitle.includes('{') && !altTitle.includes('css-') && !altTitle.includes('http') && !altTitle.includes('search') && !altTitle.includes('results') && altTitle.length > 10) {
                  title = altTitle;
                } else {
                  return; // Skip this result if title is invalid
                }
              }
              
              if (href && title && !href.includes('duckduckgo.com') && title.length > 10 && !title.includes('{') && !title.includes('css-') && !title.includes('search') && !title.includes('results') && !globalUsedUrls.has(href)) {
                try {
                  const url = new URL(href);
                  const isEducational = educationalDomains.some(domain => 
                    url.hostname.includes(domain)
                  );
                  
                  if (isEducational) {
                    results.push({
                      kind: 'read',
                      title: title.substring(0, 100),
                      url: href,
                      source: url.hostname.replace('www.', ''),
                      duration_minutes: 10 + Math.floor(Math.random() * 8),
                      description: `Article about ${query}`,
                      split: null
                    });
                    
                    globalUsedUrls.add(href);
                    console.log(`Added article: ${title.substring(0, 50)} from ${url.hostname}`);
                  }
                } catch (e) {
                  // Skip invalid URLs
                }
              }
            });
            
            if (results.length > 0) break;
          }
          
          if (results.length > 0) break;
        } catch (error) {
          console.error(`DuckDuckGo search error for "${searchTerm}":`, error);
          continue; // Try next search term
        }
      }
      
      // Method 2: If no results, try Startpage
      if (results.length === 0) {
        try {
          const searchUrl = `https://www.startpage.com/sp/search?query=${encodeURIComponent(query)}`;
          console.log(`Trying Startpage: ${query}`);
          
          const response = await this.makeRequest(searchUrl);
          const $ = cheerio.load(response.data);
          
          $('a[href^="http"]').each((index, element) => {
            if (results.length >= 3) return false;
            
            const href = $(element).attr('href');
            let title = $(element).text().trim();
            
            // Clean up title - remove CSS classes and ensure it's actual text
            if (title.includes('{') || title.includes('css-') || title.includes('display:') || title.length < 10) {
              const altTitle = $(element).attr('title') || $(element).attr('aria-label') || $(element).find('h3, h2, h1').text().trim();
              if (altTitle && !altTitle.includes('{') && !altTitle.includes('css-') && altTitle.length > 10) {
                title = altTitle;
              } else {
                return; // Skip this result if title is invalid
              }
            }
            
            if (href && title && title.length > 10 && !title.includes('{') && !title.includes('css-') && !globalUsedUrls.has(href)) {
              try {
                const url = new URL(href);
                const isEducational = educationalDomains.some(domain => 
                  url.hostname.includes(domain)
                );
                
                if (isEducational) {
                  results.push({
                    kind: 'read',
                    title: title.substring(0, 100),
                    url: href,
                    source: url.hostname.replace('www.', ''),
                    duration_minutes: 10 + Math.floor(Math.random() * 8),
                    description: `Article about ${query}`,
                    split: null
                  });
                  
                  globalUsedUrls.add(href);
                  console.log(`Added article: ${title.substring(0, 50)} from ${url.hostname}`);
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
          console.log(`Trying Bing: ${query}`);
          
          const response = await this.makeRequest(searchUrl);
          const $ = cheerio.load(response.data);
          
          $('a[href^="http"]').each((index, element) => {
            if (results.length >= 3) return false;
            
            const href = $(element).attr('href');
            const title = $(element).text().trim();
            
            if (href && title && !href.includes('bing.com') && title.length > 10 && !globalUsedUrls.has(href)) {
              try {
                const url = new URL(href);
                const isEducational = educationalDomains.some(domain => 
                  url.hostname.includes(domain)
                );
                
                if (isEducational) {
                  results.push({
                    kind: 'read',
                    title: title.substring(0, 100),
                    url: href,
                    source: url.hostname.replace('www.', ''),
                    duration_minutes: 10 + Math.floor(Math.random() * 8),
                    description: `Article about ${query}`,
                    split: null
                  });
                  
                  globalUsedUrls.add(href);
                  console.log(`Added article: ${title.substring(0, 50)} from ${url.hostname}`);
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
      
    } catch (error) {
      console.error('Article search failed:', error instanceof Error ? error.message : String(error));
    }
    
    console.log(`Total articles found: ${results.length}`);
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