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

  // Search for real articles using DuckDuckGo (no rate limits, good results)
  async searchRealArticles(query: string, goal?: string): Promise<ResourceT[]> {
    const results: ResourceT[] = [];
    const usedUrls = new Set<string>();
    
    try {
      console.log(`🔍 [RealWebScraper] Searching for real articles about: "${query}" with goal: "${goal}"`);
      
      // Create focused search queries
      const searchQueries = this.createSearchQueries(query, goal);
      console.log(`🔍 [RealWebScraper] Created ${searchQueries.length} search queries:`, searchQueries);
      
      for (const searchQuery of searchQueries.slice(0, 2)) { // Try max 2 queries
        if (results.length >= 2) break; // Max 2 articles per day
        
        try {
          // Use DuckDuckGo HTML search (no JS required, reliable)
          const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(searchQuery)}`;
          console.log(`🔗 Searching: ${searchQuery}`);
          console.log(`🔗 URL: ${searchUrl}`);
          
          const response = await this.makeRequest(searchUrl);
          
          if (response.status === 200) {
            const $ = cheerio.load(response.data);
            
            // DuckDuckGo result selectors
            const resultSelectors = [
              '.result__title a',
              '.result__url',
              '.result a[href^="http"]',
              'a[href^="http"]:not([href*="duckduckgo"])'
            ];
            
            for (const selector of resultSelectors) {
              if (results.length >= 2) break;
              
              $(selector).each((index, element) => {
                if (results.length >= 2) return false;
                
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
          
          if (results.length >= 2) break;
          
        } catch (error) {
          console.error(`Search failed for "${searchQuery}":`, error);
          continue;
        }
      }
      
      // If still no results, try specific high-quality sites
      if (results.length === 0) {
        await this.searchSpecificSites(query, goal, results, usedUrls);
      }
      
    } catch (error) {
      console.error('[RealWebScraper] Article search failed:', error);
    }
    
    console.log(`📚 [RealWebScraper] Total articles found: ${results.length}`);
    if (results.length === 0) {
      console.log(`❌ [RealWebScraper] No articles found for query: "${query}" with goal: "${goal}"`);
      console.log(`🔄 [RealWebScraper] Falling back to curated articles...`);
      
      // Fallback to curated high-quality articles
      const fallbackArticles = this.getFallbackArticles(query, goal);
      results.push(...fallbackArticles);
      console.log(`✅ [RealWebScraper] Added ${fallbackArticles.length} fallback articles`);
    }
    return results;
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
        `${cleanQuery} ${mainGoal} tutorial`,
        `${cleanQuery} ${mainGoal} guide`,
        `how to ${cleanQuery} ${mainGoal}`,
        `${mainGoal} ${cleanQuery} beginner`,
        `learn ${cleanQuery} ${mainGoal}`
      );
    } else {
      queries.push(
        `${cleanQuery} tutorial`,
        `${cleanQuery} guide`,
        `how to ${cleanQuery}`,
        `learn ${cleanQuery}`,
        `${cleanQuery} beginner guide`
      );
    }
    
    return queries.filter(q => q.trim().length > 0);
  }

  // Validate if this is a good article
  private isValidArticle(href: string | undefined, title: string, usedUrls: Set<string>): boolean {
    if (!href || !title) return false;
    if (title.length < 10 || title.length > 200) return false;
    if (usedUrls.has(href)) return false;
    
    // Skip bad URLs
    const badPatterns = [
      'search', 'results', '?q=', 'sitemap', 'tag/', 'category/',
      'login', 'register', 'signup', 'auth', 'profile', 'settings',
      'youtube.com', 'facebook.com', 'twitter.com', 'instagram.com',
      'duckduckgo.com', 'google.com', 'bing.com'
    ];
    
    for (const pattern of badPatterns) {
      if (href.toLowerCase().includes(pattern)) return false;
    }
    
    // Skip bad titles
    const badTitlePatterns = [
      'search', 'results', 'sitemap', 'login', 'register', 'signup',
      'subscribe', 'newsletter', 'privacy', 'terms', 'cookie'
    ];
    
    for (const pattern of badTitlePatterns) {
      if (title.toLowerCase().includes(pattern)) return false;
    }
    
    return true;
  }

  // Check if URL points to a real article
  private isRealArticleUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      
      // Must have meaningful path
      if (urlObj.pathname.length < 5) return false;
      if (urlObj.pathname === '/' || urlObj.pathname.endsWith('/')) return false;
      
      // Must have article-like path structure
      const pathParts = urlObj.pathname.split('/').filter(part => part.length > 0);
      if (pathParts.length < 2) return false;
      
      // Skip obvious non-article paths
      const badPaths = ['search', 'tag', 'category', 'archive', 'sitemap', 'feed'];
      for (const badPath of badPaths) {
        if (urlObj.pathname.includes(badPath)) return false;
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

  // Fallback curated articles when web scraping fails
  private getFallbackArticles(query: string, goal?: string): ResourceT[] {
    const articles: ResourceT[] = [];
    const lowerQuery = query.toLowerCase();
    const lowerGoal = goal?.toLowerCase() || '';

    // Programming/Development articles
    if (lowerQuery.includes('javascript') || lowerGoal.includes('javascript')) {
      articles.push({
        kind: 'read',
        title: 'JavaScript Fundamentals: Variables, Functions, and Scope',
        url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Grammar_and_types',
        source: 'MDN Web Docs',
        duration_minutes: 15,
        description: 'Comprehensive guide to JavaScript fundamentals from Mozilla Developer Network',
        split: null
      });
    }

    if (lowerQuery.includes('react') || lowerGoal.includes('react')) {
      articles.push({
        kind: 'read',
        title: 'Getting Started with React: Components and JSX',
        url: 'https://react.dev/learn/your-first-component',
        source: 'React.dev',
        duration_minutes: 12,
        description: 'Official React documentation on creating your first component',
        split: null
      });
    }

    if (lowerQuery.includes('python') || lowerGoal.includes('python')) {
      articles.push({
        kind: 'read',
        title: 'Python Basics: Syntax, Variables, and Data Types',
        url: 'https://docs.python.org/3/tutorial/introduction.html',
        source: 'Python.org',
        duration_minutes: 18,
        description: 'Official Python tutorial covering the basics',
        split: null
      });
    }

    // Data Science articles
    if (lowerQuery.includes('data') || lowerQuery.includes('analytics') || lowerGoal.includes('data')) {
      articles.push({
        kind: 'read',
        title: 'Introduction to Data Analysis with Pandas',
        url: 'https://pandas.pydata.org/docs/getting_started/intro_tutorials/01_table_oriented.html',
        source: 'Pandas Documentation',
        duration_minutes: 20,
        description: 'Official pandas tutorial for data manipulation',
        split: null
      });
    }

    // Web Development articles
    if (lowerQuery.includes('html') || lowerQuery.includes('css') || lowerGoal.includes('web')) {
      articles.push({
        kind: 'read',
        title: 'HTML Basics: Structure and Semantic Elements',
        url: 'https://developer.mozilla.org/en-US/docs/Learn/HTML/Introduction_to_HTML',
        source: 'MDN Web Docs',
        duration_minutes: 14,
        description: 'Complete guide to HTML fundamentals',
        split: null
      });
    }

    // Machine Learning articles
    if (lowerQuery.includes('machine learning') || lowerQuery.includes('ml') || lowerGoal.includes('ai')) {
      articles.push({
        kind: 'read',
        title: 'Machine Learning Fundamentals: Supervised vs Unsupervised Learning',
        url: 'https://scikit-learn.org/stable/user_guide.html',
        source: 'Scikit-learn',
        duration_minutes: 25,
        description: 'Comprehensive machine learning guide from scikit-learn',
        split: null
      });
    }

    // Design articles
    if (lowerQuery.includes('design') || lowerQuery.includes('ui') || lowerQuery.includes('ux')) {
      articles.push({
        kind: 'read',
        title: 'UI/UX Design Principles: Layout, Typography, and Color',
        url: 'https://www.interaction-design.org/literature/topics/ui-design',
        source: 'Interaction Design Foundation',
        duration_minutes: 16,
        description: 'Fundamental principles of user interface design',
        split: null
      });
    }

    // Generic learning articles as final fallback
    if (articles.length === 0) {
      articles.push({
        kind: 'read',
        title: `Complete Guide to ${query}`,
        url: 'https://en.wikipedia.org/wiki/' + encodeURIComponent(query.replace(/\s+/g, '_')),
        source: 'Wikipedia',
        duration_minutes: 12,
        description: `Comprehensive overview of ${query} from Wikipedia`,
        split: null
      });
    }

    return articles.slice(0, 1); // Return max 1 fallback article
  }
}

export const realWebScraper = new RealWebScraper();
