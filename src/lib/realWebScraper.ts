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

  // Search for real articles using multiple search engines and approaches
  async searchRealArticles(query: string, goal?: string): Promise<ResourceT[]> {
    const results: ResourceT[] = [];
    const usedUrls = new Set<string>();
    
    try {
      console.log(`🔍 [RealWebScraper] Searching for real articles about: "${query}" with goal: "${goal}"`);
      
      // Create focused search queries
      const searchQueries = this.createSearchQueries(query, goal);
      console.log(`🔍 [RealWebScraper] Created ${searchQueries.length} search queries:`, searchQueries);
      
      // Try multiple search engines and approaches
      for (const searchQuery of searchQueries.slice(0, 3)) { // Try max 3 queries
        if (results.length >= 3) break; // Max 3 articles per day
        
        try {
          // Use DuckDuckGo HTML search (no JS required, reliable)
          const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(searchQuery)}`;
          console.log(`🔗 Searching: ${searchQuery}`);
          console.log(`🔗 URL: ${searchUrl}`);
          
          const response = await this.makeRequest(searchUrl);
          
          if (response.status === 200) {
            const $ = cheerio.load(response.data);
            
            // DuckDuckGo result selectors - more comprehensive
            const resultSelectors = [
              '.result__title a',
              '.result__url a',
              '.result a[href^="http"]',
              'a[href^="http"]:not([href*="duckduckgo"])',
              '.web-result a',
              '.results a[href^="http"]'
            ];
            
            for (const selector of resultSelectors) {
              if (results.length >= 3) break;
              
              $(selector).each((index, element) => {
                if (results.length >= 3) return false;
                
                const href = $(element).attr('href');
                let title = $(element).text().trim();
                
                // Get title from parent if needed
                if (!title || title.length < 10) {
                  title = $(element).closest('.result').find('.result__title').text().trim();
                }
                
                if (this.isValidArticle(href, title, usedUrls)) {
                  const cleanUrl = this.cleanUrl(href!);
                  const cleanTitle = this.cleanTitle(title);
                  
                  results.push({
                    kind: 'read',
                    title: cleanTitle,
                    url: cleanUrl,
                    source: this.extractDomain(cleanUrl),
                    duration_minutes: this.estimateReadingTime(cleanTitle),
                    description: `Learn about ${query} with this comprehensive article`,
                    split: null
                  });
                  
                  usedUrls.add(cleanUrl);
                  console.log(`✅ Found article: ${cleanTitle.substring(0, 50)}`);
                  console.log(`✅ URL: ${cleanUrl}`);
                }
              });
              
              if (results.length >= 2) break;
            }
          }
          
          if (results.length >= 3) break;
          
        } catch (error) {
          console.error(`Search failed for "${searchQuery}":`, error);
          continue;
        }
        
        // Also try Bing search for more results
        if (results.length < 3) {
          try {
            await this.searchBing(searchQuery, results, usedUrls);
          } catch (error) {
            console.error(`Bing search failed for "${searchQuery}":`, error);
          }
        }
      }
      
      // If still no results, try specific high-quality sites
      if (results.length === 0) {
        console.log(`🔍 [RealWebScraper] No results from general search, trying specific sites...`);
        await this.searchSpecificSites(query, goal, results, usedUrls);
      }
      
    } catch (error) {
      console.error('[RealWebScraper] Article search failed:', error);
    }
    
    console.log(`📚 [RealWebScraper] Total articles found: ${results.length}`);
    if (results.length === 0) {
      console.log(`❌ [RealWebScraper] No real articles found for query: "${query}" with goal: "${goal}"`);
    }
    return results;
  }

  // Search Bing for additional results
  private async searchBing(query: string, results: ResourceT[], usedUrls: Set<string>): Promise<void> {
    try {
      const searchUrl = `https://www.bing.com/search?q=${encodeURIComponent(query + ' article guide tutorial')}`;
      console.log(`🔍 [RealWebScraper] Searching Bing: ${query}`);
      
      const response = await this.makeRequest(searchUrl);
      
      if (response.status === 200) {
        const $ = cheerio.load(response.data);
        
        // Bing result selectors
        const selectors = [
          '.b_algo h2 a',
          '.b_title a',
          '.b_algo a[href^="http"]',
          'a[href^="http"]:not([href*="bing.com"]):not([href*="microsoft.com"])'
        ];
        
        for (const selector of selectors) {
          if (results.length >= 3) break;
          
          $(selector).each((index, element) => {
            if (results.length >= 3) return false;
            
            const href = $(element).attr('href');
            let title = $(element).text().trim();
            
            if (!title) {
              title = $(element).closest('.b_algo').find('h2').text().trim();
            }
            
            if (this.isValidArticle(href, title, usedUrls)) {
              const cleanUrl = this.cleanUrl(href!);
              const cleanTitle = this.cleanTitle(title);
              
              if (this.isRealArticleUrl(cleanUrl)) {
                results.push({
                  kind: 'read',
                  title: cleanTitle,
                  url: cleanUrl,
                  source: this.extractDomain(cleanUrl),
                  duration_minutes: this.estimateReadingTime(cleanTitle),
                  description: `Learn about ${query.split(' ')[0]} with this comprehensive article`,
                  split: null
                });
                
                usedUrls.add(cleanUrl);
                console.log(`✅ [RealWebScraper] Found Bing article: ${cleanTitle.substring(0, 50)}`);
              }
            }
          });
          
          if (results.length > 0) break;
        }
      }
    } catch (error) {
      console.error('[RealWebScraper] Bing search failed:', error);
    }
  }

  // Search specific high-quality sites directly
  private async searchSpecificSites(query: string, goal: string | undefined, results: ResourceT[], usedUrls: Set<string>): Promise<void> {
    const sites = [
      {
        name: 'Medium',
        searchUrl: (q: string) => `https://medium.com/search?q=${encodeURIComponent(q)}`,
        selectors: ['article h2 a', 'article h3 a', '.postArticle-readMore a'],
        domain: 'medium.com'
      },
      {
        name: 'Dev.to',
        searchUrl: (q: string) => `https://dev.to/search?q=${encodeURIComponent(q)}`,
        selectors: ['.crayons-story__title a', 'article h2 a', 'article h3 a'],
        domain: 'dev.to'
      },
      {
        name: 'FreeCodeCamp',
        searchUrl: (q: string) => `https://www.freecodecamp.org/news/search/?query=${encodeURIComponent(q)}`,
        selectors: ['article h2 a', '.post-card-title a', 'h3 a'],
        domain: 'freecodecamp.org'
      }
    ];

    for (const site of sites) {
      if (results.length >= 2) break;
      
      try {
        const searchUrl = site.searchUrl(query);
        console.log(`🔍 Searching ${site.name}: ${query}`);
        
        const response = await this.makeRequest(searchUrl);
        
        if (response.status === 200) {
          const $ = cheerio.load(response.data);
          
          for (const selector of site.selectors) {
            if (results.length >= 2) break;
            
            $(selector).each((index, element) => {
              if (results.length >= 2) return false;
              
              const href = $(element).attr('href');
              const title = $(element).text().trim();
              
              if (this.isValidArticle(href, title, usedUrls)) {
                let fullUrl = href!;
                if (!fullUrl.startsWith('http')) {
                  fullUrl = fullUrl.startsWith('/') ? `https://${site.domain}${fullUrl}` : `https://${site.domain}/${fullUrl}`;
                }
                
                if (this.isRealArticleUrl(fullUrl)) {
                  const cleanTitle = this.cleanTitle(title);
                  
                  results.push({
                    kind: 'read',
                    title: cleanTitle,
                    url: fullUrl,
                    source: site.domain,
                    duration_minutes: this.estimateReadingTime(cleanTitle),
                    description: `Learn about ${query} with this article from ${site.name}`,
                    split: null
                  });
                  
                  usedUrls.add(fullUrl);
                  console.log(`✅ Found ${site.name} article: ${cleanTitle.substring(0, 50)}`);
                  return false; // Stop after finding one from this site
                }
              }
            });
            
            if (results.length > 0) break;
          }
        }
        
      } catch (error) {
        console.error(`${site.name} search failed:`, error);
        continue;
      }
    }
  }

  // Create focused search queries
  private createSearchQueries(query: string, goal?: string): string[] {
    const queries = [];
    
    // Clean up the query
    const cleanQuery = query.replace(/day \d+/gi, '').trim();
    
    if (goal) {
      const goalWords = goal.toLowerCase().split(' ').filter(word => word.length > 3);
      const mainGoal = goalWords[0] || goal.toLowerCase();
      
      queries.push(
        `"${cleanQuery}" ${mainGoal} tutorial article`,
        `${cleanQuery} ${mainGoal} complete guide`,
        `how to ${cleanQuery} ${mainGoal} step by step`,
        `${mainGoal} ${cleanQuery} beginner tutorial`,
        `learn ${cleanQuery} ${mainGoal} comprehensive`,
        `${cleanQuery} ${mainGoal} explained tutorial`,
        `${cleanQuery} in ${mainGoal} guide article`
      );
    } else {
      queries.push(
        `"${cleanQuery}" tutorial complete guide`,
        `${cleanQuery} comprehensive tutorial`,
        `how to ${cleanQuery} step by step`,
        `learn ${cleanQuery} beginner guide`,
        `${cleanQuery} explained tutorial`,
        `${cleanQuery} complete course article`,
        `${cleanQuery} fundamentals guide`
      );
    }
    
    return queries.filter(q => q.trim().length > 0);
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
