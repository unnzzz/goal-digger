import { NextRequest, NextResponse } from 'next/server';
import { advancedScraper } from '@/lib/advancedWebScraper';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const type = searchParams.get('type') as 'watch' | 'read' | 'listen';

    if (!query || !type) {
      return NextResponse.json({ error: 'Missing query or type parameter' }, { status: 400 });
    }

    console.log(`Advanced scraping: ${type} resources for "${query}"`);

    // Use the advanced scraper
    const resources = await advancedScraper.searchResources(query, type);
    
    // Get scraping statistics
    const stats = advancedScraper.getStats();

    return NextResponse.json({ 
      resources: resources,
      query: query,
      type: type,
      count: resources.length,
      stats: stats
    });

  } catch (error) {
    console.error('Advanced scraping API error:', error);
    return NextResponse.json({ 
      error: 'Failed to scrape resources',
      resources: []
    }, { status: 500 });
  }
}
