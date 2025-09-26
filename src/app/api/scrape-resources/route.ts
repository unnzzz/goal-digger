import { NextRequest, NextResponse } from 'next/server';
import { advancedScraper } from '@/lib/advancedWebScraper';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const type = searchParams.get('type') as 'watch' | 'read' | 'listen';
    const goal = searchParams.get('goal');

    if (!query || !type) {
      return NextResponse.json({ error: 'Missing query or type parameter' }, { status: 400 });
    }

    console.log(`Advanced scraping: ${type} resources for "${query}" with goal context: "${goal || 'none'}"`);

    // Use advanced scraper to get real internet resources
    const resources = await advancedScraper.searchResources(query, type, goal ?? undefined);
    const stats = advancedScraper.getStats();
    
    console.log(`Advanced scraper found ${resources.length} resources`);

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
