import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import axios from 'axios';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const type = searchParams.get('type') as 'watch' | 'read' | 'listen';

    if (!query || !type) {
      return NextResponse.json({ error: 'Missing query or type parameter' }, { status: 400 });
    }

    console.log(`Server-side scraping: ${type} resources for "${query}"`);

    const resources: any[] = [];

    if (type === 'watch') {
      // Search YouTube
      const youtubeUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
      
      try {
        const response = await axios.get(youtubeUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
          }
        });

        const $ = cheerio.load(response.data);
        
        // Extract video information from YouTube search results
        $('a[href*="/watch?v="]').each((index, element) => {
          if (index >= 5) return false; // Limit to 5 videos
          
          const href = $(element).attr('href');
          const titleElement = $(element).find('h3');
          const title = titleElement.text().trim();
          
          if (href && title && href.includes('/watch?v=')) {
            const videoId = href.split('v=')[1]?.split('&')[0];
            if (videoId && title.length > 10) {
              resources.push({
                kind: 'watch',
                title: title.substring(0, 100),
                url: `https://www.youtube.com/watch?v=${videoId}`,
                source: 'YouTube',
                duration_minutes: 15, // Default duration
                split: null
              });
            }
          }
        });
        
        console.log(`Found ${resources.length} YouTube videos for "${query}"`);
        
      } catch (error) {
        console.error('YouTube scraping error:', error);
      }
    } else if (type === 'read') {
      // Search for articles using DuckDuckGo (more reliable than Google)
      const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
      
      try {
        const response = await axios.get(searchUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
          }
        });

        const $ = cheerio.load(response.data);
        
        // Extract article links
        $('.result__title a').each((index, element) => {
          if (index >= 5) return false; // Limit to 5 articles
          
          const href = $(element).attr('href');
          const title = $(element).text().trim();
          
          if (href && title && !href.includes('duckduckgo.com') && title.length > 10) {
            try {
              const url = new URL(href);
              resources.push({
                kind: 'read',
                title: title.substring(0, 100),
                url: href,
                source: url.hostname,
                duration_minutes: 10,
                split: null
              });
            } catch (e) {
              // Skip invalid URLs
            }
          }
        });
        
        console.log(`Found ${resources.length} articles for "${query}"`);
        
      } catch (error) {
        console.error('Article scraping error:', error);
      }
    } else if (type === 'listen') {
      // Search for podcasts
      const podcastUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query + ' podcast')}`;
      
      try {
        const response = await axios.get(podcastUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
          }
        });

        const $ = cheerio.load(response.data);
        
        // Extract podcast links
        $('.result__title a').each((index, element) => {
          if (index >= 3) return false; // Limit to 3 podcasts
          
          const href = $(element).attr('href');
          const title = $(element).text().trim();
          
          if (href && title && !href.includes('duckduckgo.com') && title.toLowerCase().includes('podcast')) {
            try {
              const url = new URL(href);
              resources.push({
                kind: 'listen',
                title: title.substring(0, 100),
                url: href,
                source: url.hostname,
                duration_minutes: 20,
                split: null
              });
            } catch (e) {
              // Skip invalid URLs
            }
          }
        });
        
        console.log(`Found ${resources.length} podcasts for "${query}"`);
        
      } catch (error) {
        console.error('Podcast scraping error:', error);
      }
    }

    return NextResponse.json({ 
      resources: resources,
      query: query,
      type: type,
      count: resources.length
    });

  } catch (error) {
    console.error('Scraping API error:', error);
    return NextResponse.json({ 
      error: 'Failed to scrape resources',
      resources: []
    }, { status: 500 });
  }
}
