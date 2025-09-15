import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ 
  model: 'gemini-1.5-flash',
  generationConfig: {
    temperature: 0.7,
    topK: 40,
    topP: 0.95,
    maxOutputTokens: 2048,
  }
});

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params;
    console.log(`AI content API called with slug: ${slug}`);
    
    // Simple test response first
    if (slug === 'test') {
      return new NextResponse(`
        <html>
          <body>
            <h1>Test Page</h1>
            <p>API route is working!</p>
            <a href="javascript:history.back()">← Back</a>
          </body>
        </html>
      `, {
        headers: { 'Content-Type': 'text/html' },
      });
    }
    
    // For debugging, let's return a simple response for any slug
    if (slug.includes('learn-spanish')) {
      return new NextResponse(`
        <html>
          <body>
            <h1>Debug: API Route Working</h1>
            <p>Slug: ${slug}</p>
            <p>This confirms the API route is being called!</p>
            <a href="javascript:history.back()">← Back</a>
          </body>
        </html>
      `, {
        headers: { 'Content-Type': 'text/html' },
      });
    }
    
    // Parse the slug to extract information
    // Format: goal-day-number-type (e.g., "learn-horse-riding-day-1-article")
    const parts = slug.split('-');
    const type = parts[parts.length - 1]; // 'article' or 'podcast'
    const dayNumber = parts[parts.length - 2]; // day number
    const goal = parts.slice(0, -2).join(' ').replace(/-/g, ' '); // goal name
    
    console.log(`Parsed slug: ${slug} -> goal: "${goal}", day: ${dayNumber}, type: ${type}`);
    
    // For now, let's use a more generic approach since we don't have the exact day title
    const dayTitle = `Day ${dayNumber}: ${goal.charAt(0).toUpperCase() + goal.slice(1)}`;
    
    console.log(`Generating AI content for slug: ${slug}, type: ${type}, goal: ${goal}`);
    
    // Generate the content
    const prompt = `Create a comprehensive ${type} about "${dayTitle}" for someone learning "${goal}".

Requirements:
- Make it educational and practical
- Include specific examples and actionable advice
- Write in an engaging, conversational tone
- Length: ${type === 'article' ? '800-1200' : '15-20'} words
- Focus on the specific topic: ${dayTitle}

Return ONLY a JSON object with this exact structure:
{
  "title": "Specific, engaging title",
  "content": "Full ${type} content here...",
  "source": "AI Generated ${type === 'article' ? 'Article' : 'Podcast'}"
}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Extract JSON from response
    let jsonText = text;
    if (text.includes('```json')) {
      jsonText = text.split('```json')[1].split('```')[0].trim();
    } else if (text.includes('```')) {
      jsonText = text.split('```')[1].split('```')[0].trim();
    }
    
    const content = JSON.parse(jsonText);
    
    // Return the content as HTML
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${content.title}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f9fafb;
        }
        .container {
            background: white;
            padding: 40px;
            border-radius: 12px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        h1 {
            color: #1f2937;
            margin-bottom: 20px;
            font-size: 2rem;
        }
        .meta {
            color: #6b7280;
            margin-bottom: 30px;
            font-size: 0.9rem;
        }
        .content {
            color: #374151;
            font-size: 1.1rem;
            white-space: pre-wrap;
        }
        .back-button {
            display: inline-block;
            margin-top: 30px;
            padding: 10px 20px;
            background-color: #3b82f6;
            color: white;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 500;
        }
        .back-button:hover {
            background-color: #2563eb;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>${content.title}</h1>
        <div class="meta">
            <strong>Source:</strong> ${content.source} | 
            <strong>Type:</strong> ${type === 'article' ? 'Article' : 'Podcast'} | 
            <strong>Duration:</strong> ${type === 'article' ? '15 min' : '20 min'}
        </div>
        <div class="content">${content.content}</div>
        <a href="/dashboard" class="back-button">← Back to Roadmap</a>
    </div>
</body>
</html>`;

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
      },
    });

  } catch (error) {
    console.error('AI content generation failed:', error);
    
    const errorHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Content Unavailable</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f9fafb;
        }
        .container {
            background: white;
            padding: 40px;
            border-radius: 12px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            text-align: center;
        }
        h1 {
            color: #dc2626;
            margin-bottom: 20px;
        }
        .back-button {
            display: inline-block;
            margin-top: 30px;
            padding: 10px 20px;
            background-color: #3b82f6;
            color: white;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 500;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Content Unavailable</h1>
        <p>This AI-generated content is temporarily unavailable. Please try again later.</p>
        <a href="/dashboard" class="back-button">← Back to Roadmap</a>
    </div>
</body>
</html>`;

    return new NextResponse(errorHtml, {
      status: 500,
      headers: {
        'Content-Type': 'text/html',
      },
    });
  }
}
