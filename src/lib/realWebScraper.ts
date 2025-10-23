import axios from 'axios';
import * as cheerio from 'cheerio';
import { ResourceT } from './schema';

// Real web scraper focused specifically on finding great read resources
export class RealWebScraper {
  private userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0'
  ];

  private getRandomUserAgent(): string {
    return this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
  }

  private async makeRequest(url: string): Promise<any> {
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': this.getRandomUserAgent(),
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Cache-Control': 'no-cache'
        },
        timeout: 8000,
        maxRedirects: 3,
        validateStatus: (status) => status < 400
      });
      
      return response;
    } catch (error) {
      console.error(`Request failed for ${url}:`, error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  // Search for real articles from the web - more robust approach
  async searchRealArticles(query: string, goal?: string): Promise<ResourceT[]> {
    console.log(`🔍 [RealWebScraper] Searching real web articles for: "${query}" with goal: "${goal}"`);
    
    const results: ResourceT[] = [];
    const usedUrls = new Set<string>();
    
    try {
      // Try multiple approaches in parallel for better success rate
      const searchPromises = [
        this.searchWithGoogleProxy(query, goal, usedUrls),
        this.searchWithDuckDuckGo(query, goal, usedUrls),
        this.searchDirectSites(query, goal, usedUrls)
      ];
      
      const searchResults = await Promise.allSettled(searchPromises);
      
      // Collect results from all successful searches
      for (const result of searchResults) {
        if (result.status === 'fulfilled' && result.value.length > 0) {
          for (const article of result.value) {
            if (results.length >= 3) break;
            if (!usedUrls.has(article.url)) {
              results.push(article);
              usedUrls.add(article.url);
            }
          }
        }
      }
      
    } catch (error) {
      console.error('[RealWebScraper] All search methods failed:', error);
    }
    
    console.log(`📚 [RealWebScraper] Found ${results.length} real web articles`);
    return results;
  }

  // Search using DuckDuckGo HTML scraping for real web results
  private async searchWithGoogleProxy(query: string, goal?: string, usedUrls?: Set<string>): Promise<ResourceT[]> {
    const results: ResourceT[] = [];
    
    try {
      const searchQuery = `${query} ${goal || ''} tutorial guide article`.trim();
      console.log(`🔍 [RealWebScraper] Scraping DuckDuckGo HTML for: "${searchQuery}"`);
      
      // Use DuckDuckGo HTML (no JS required, reliable)
      const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(searchQuery)}`;
      
      const response = await this.makeRequest(searchUrl);
      
      if (response.status === 200) {
        const $ = cheerio.load(response.data);
        console.log(`✅ [RealWebScraper] Successfully loaded DuckDuckGo page`);
        
        // More comprehensive selectors for DuckDuckGo results
        const selectors = [
          '.result__title a',
          '.result__url',
          '.result a[href^="http"]',
          'a[href^="http"]:not([href*="duckduckgo"]):not([href*="javascript"])',
          '.web-result a',
          '.results a'
        ];
        
        for (const selector of selectors) {
          const elements = $(selector);
          console.log(`🔍 [RealWebScraper] Selector "${selector}" found ${elements.length} elements`);
          
          elements.each((index, element) => {
            if (results.length >= 2) return false;
            
            let href = $(element).attr('href');
            let title = $(element).text().trim();
            
            // Get title from result container if not found
            if (!title || title.length < 10) {
              const resultContainer = $(element).closest('.result, .web-result');
              title = resultContainer.find('.result__title, h3, h2').first().text().trim();
            }
            
            console.log(`🔗 [RealWebScraper] Found link: href="${href}", title="${title?.substring(0, 50)}"`);
            
            if (href && title && this.isValidWebArticle(href, title, usedUrls || new Set())) {
              const cleanUrl = this.cleanUrl(href);
              const cleanTitle = this.cleanTitle(title);
              
              results.push({
                kind: 'read',
                title: cleanTitle,
                url: cleanUrl,
                source: this.extractDomain(cleanUrl),
                duration_minutes: this.estimateReadingTime(cleanTitle),
                description: `Learn about ${query}`,
                split: null
              });
              
              usedUrls?.add(cleanUrl);
              console.log(`✅ [RealWebScraper] Added real article: ${cleanTitle.substring(0, 50)}`);
              console.log(`✅ [RealWebScraper] URL: ${cleanUrl}`);
            }
          });
          
          if (results.length >= 2) break;
        }
      }
      
    } catch (error) {
      console.error('[RealWebScraper] DuckDuckGo HTML scraping failed:', error instanceof Error ? error.message : String(error));
    }
    
    return results;
  }

  // Search using Bing HTML scraping for real web results
  private async searchWithDuckDuckGo(query: string, goal?: string, usedUrls?: Set<string>): Promise<ResourceT[]> {
    const results: ResourceT[] = [];
    
    try {
      const searchQuery = `${query} ${goal || ''} tutorial guide article blog`.trim();
      console.log(`🔍 [RealWebScraper] Scraping Bing HTML for: "${searchQuery}"`);
      
      // Use Bing search (often less restrictive than Google)
      const searchUrl = `https://www.bing.com/search?q=${encodeURIComponent(searchQuery)}`;
      
      const response = await this.makeRequest(searchUrl);
      
      if (response.status === 200) {
        const $ = cheerio.load(response.data);
        console.log(`✅ [RealWebScraper] Successfully loaded Bing page`);
        
        // Bing result selectors
        const selectors = [
          '.b_algo h2 a',
          '.b_title a', 
          '.b_algo a[href^="http"]',
          'a[href^="http"]:not([href*="bing.com"]):not([href*="microsoft.com"])'
        ];
        
        for (const selector of selectors) {
          const elements = $(selector);
          console.log(`🔍 [RealWebScraper] Bing selector "${selector}" found ${elements.length} elements`);
          
          elements.each((index, element) => {
            if (results.length >= 2) return false;
            
            let href = $(element).attr('href');
            let title = $(element).text().trim();
            
            // Get title from result container if not found
            if (!title || title.length < 10) {
              const resultContainer = $(element).closest('.b_algo');
              title = resultContainer.find('h2, h3').first().text().trim();
            }
            
            console.log(`🔗 [RealWebScraper] Found Bing link: href="${href}", title="${title?.substring(0, 50)}"`);
            
            if (href && title && this.isValidWebArticle(href, title, usedUrls || new Set())) {
              const cleanUrl = this.cleanUrl(href);
              const cleanTitle = this.cleanTitle(title);
              
              results.push({
                kind: 'read',
                title: cleanTitle,
                url: cleanUrl,
                source: this.extractDomain(cleanUrl),
                duration_minutes: this.estimateReadingTime(cleanTitle),
                description: `Learn about ${query}`,
                split: null
              });
              
              usedUrls?.add(cleanUrl);
              console.log(`✅ [RealWebScraper] Added Bing article: ${cleanTitle.substring(0, 50)}`);
              console.log(`✅ [RealWebScraper] URL: ${cleanUrl}`);
            }
          });
          
          if (results.length >= 2) break;
        }
      }
      
    } catch (error) {
      console.error('[RealWebScraper] Bing HTML scraping failed:', error instanceof Error ? error.message : String(error));
    }
    
    return results;
  }

  // Search direct educational sites with REAL web scraping
  private async searchDirectSites(query: string, goal?: string, usedUrls?: Set<string>): Promise<ResourceT[]> {
    const results: ResourceT[] = [];
    
    try {
      console.log(`🔍 [RealWebScraper] Searching direct sites for: "${query}"`);
      
      // Use a simple web search API that actually works
      const searchQuery = `${query} ${goal || ''} tutorial guide how to`.trim();
      
      // Try Reddit for real discussions and guides
      await this.searchReddit(searchQuery, results, usedUrls || new Set());
      
    } catch (error) {
      console.error('[RealWebScraper] Direct sites search failed:', error);
    }
    
    return results;
  }


  // Search Reddit for real discussions and guides  
  private async searchReddit(query: string, results: ResourceT[], usedUrls: Set<string>): Promise<void> {
    try {
      const searchUrl = `https://www.reddit.com/search.json?q=${encodeURIComponent(query + ' guide tutorial')}&limit=5&sort=relevance`;
      console.log(`🔍 [RealWebScraper] Searching Reddit: ${query}`);
      
      const response = await this.makeRequest(searchUrl);
      
      if (response.status === 200 && response.data.data && response.data.data.children) {
        for (const post of response.data.data.children.slice(0, 1)) {
          if (results.length >= 2) break;
          
          const postData = post.data;
          if (postData.url && postData.title && !postData.is_self) {
            const url = postData.url;
            
            // Only include external links, not reddit self-posts
            if (!url.includes('reddit.com') && !usedUrls.has(url) && this.isValidWebArticle(url, postData.title, usedUrls)) {
              results.push({
                kind: 'read',
                title: this.cleanTitle(postData.title),
                url: this.cleanUrl(url),
                source: this.extractDomain(url),
                duration_minutes: 10 + Math.floor(Math.random() * 10),
                description: `Learn about ${query} - shared on Reddit`,
                split: null
              });
              
              usedUrls.add(url);
              console.log(`✅ [RealWebScraper] Found Reddit-shared article: ${postData.title.substring(0, 50)}`);
              console.log(`✅ [RealWebScraper] URL: ${url}`);
            }
          }
        }
      }
    } catch (error) {
      console.error('[RealWebScraper] Reddit search failed:', error);
    }
  }



  // Validate if this is a good web article - very lenient to capture real articles
  private isValidWebArticle(href: string | undefined, title: string, usedUrls: Set<string>): boolean {
    if (!href || !title) return false;
    if (title.length < 5 || title.length > 300) return false;
    if (usedUrls.has(href)) return false;
    
    // Skip only obvious bad URLs - be very lenient
    const badPatterns = [
      'search?', '?q=', 'duckduckgo.com', 'google.com', 'bing.com',
      'facebook.com', 'twitter.com', 'instagram.com', 'tiktok.com',
      'login', 'register', 'signup', 'auth'
    ];
    
    for (const pattern of badPatterns) {
      if (href.toLowerCase().includes(pattern)) return false;
    }
    
    // Skip bad titles - be very lenient
    const badTitlePatterns = [
      'search results', 'login', 'register', 'signup', 'subscribe now'
    ];
    
    for (const pattern of badTitlePatterns) {
      if (title.toLowerCase().includes(pattern)) return false;
    }
    
    // Must be a real URL
    try {
      new URL(href);
      return true;
    } catch {
      return false;
    }
  }

  // Validate if this is a good article - more lenient to capture real articles  
  private isValidArticle(href: string | undefined, title: string, usedUrls: Set<string>): boolean {
    if (!href || !title) return false;
    if (title.length < 5 || title.length > 300) return false; // More lenient length
    if (usedUrls.has(href)) return false;
    
    // Skip only obvious bad URLs
    const badPatterns = [
      'search?', 'results?', '?q=', 'sitemap', 
      'login', 'register', 'signup', 'auth',
      'youtube.com', 'facebook.com', 'twitter.com', 'instagram.com',
      'duckduckgo.com', 'google.com', 'bing.com', 'pinterest.com'
    ];
    
    for (const pattern of badPatterns) {
      if (href.toLowerCase().includes(pattern)) return false;
    }
    
    // Skip only obvious bad titles - be more lenient
    const badTitlePatterns = [
      'search results', 'sitemap', 'login', 'register', 'signup',
      'subscribe now', 'newsletter', 'privacy policy', 'terms of service'
    ];
    
    for (const pattern of badTitlePatterns) {
      if (title.toLowerCase().includes(pattern)) return false;
    }
    
    return true;
  }

  // Check if URL points to a real article - more lenient
  private isRealArticleUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      
      // Must have some path (more lenient)
      if (urlObj.pathname.length < 2) return false;
      
      // Skip only obvious non-article paths
      const badPaths = ['search?', 'tag?', 'category?', 'archive?', 'sitemap', 'feed.xml'];
      for (const badPath of badPaths) {
        if (urlObj.pathname.includes(badPath) || urlObj.search.includes(badPath)) return false;
      }
      
      return true;
    } catch {
      return false;
    }
  }

  // Clean up URL
  private cleanUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      // Remove tracking parameters
      const cleanParams = new URLSearchParams();
      for (const [key, value] of urlObj.searchParams) {
        if (!key.startsWith('utm_') && !key.startsWith('fb_') && key !== 'ref') {
          cleanParams.set(key, value);
        }
      }
      urlObj.search = cleanParams.toString();
      return urlObj.toString();
    } catch {
      return url;
    }
  }

  // Clean up title
  private cleanTitle(title: string): string {
    return title
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s\-\(\)\[\]]/g, '')
      .trim()
      .substring(0, 100);
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

  // Estimate reading time based on title and content type
  private estimateReadingTime(title: string): number {
    const baseTime = 8;
    const variation = Math.floor(Math.random() * 7); // 0-6 minutes variation
    
    // Longer articles for complex topics
    if (title.toLowerCase().includes('complete') || title.toLowerCase().includes('comprehensive')) {
      return baseTime + 10 + variation;
    }
    if (title.toLowerCase().includes('guide') || title.toLowerCase().includes('tutorial')) {
      return baseTime + 5 + variation;
    }
    
    return baseTime + variation;
  }

}

export const realWebScraper = new RealWebScraper();
