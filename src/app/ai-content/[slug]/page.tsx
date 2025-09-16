'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

// Format content for better display
function formatContent(content: string): string {
  // If content already contains HTML tags, return as-is
  if (content.includes('<p>') || content.includes('<strong>') || content.includes('<ul>') || content.includes('<h')) {
    return content;
  }
  
  // Otherwise, format as markdown
  return content
    // Headers
    .replace(/^### (.*$)/gim, '<h3 style="color: #1F2937; font-size: 20px; font-weight: 600; margin: 24px 0 12px 0; border-bottom: 2px solid #E5E7EB; padding-bottom: 8px;">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 style="color: #111827; font-size: 24px; font-weight: 700; margin: 32px 0 16px 0; border-bottom: 3px solid #6A3EE8; padding-bottom: 12px;">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 style="color: #111827; font-size: 28px; font-weight: 800; margin: 40px 0 20px 0; text-align: center; background: linear-gradient(135deg, #6A3EE8, #8B5CF6); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">$1</h1>')
    
    // Bold text
    .replace(/\*\*(.*?)\*\*/g, '<strong style="color: #1F2937; font-weight: 700;">$1</strong>')
    
    // Italic text
    .replace(/\*(.*?)\*/g, '<em style="color: #4B5563; font-style: italic;">$1</em>')
    
    // Lists
    .replace(/^\* (.*$)/gim, '<li style="margin: 8px 0; padding-left: 8px; position: relative;"><span style="color: #6A3EE8; font-weight: bold; position: absolute; left: -16px;">•</span>$1</li>')
    .replace(/^- (.*$)/gim, '<li style="margin: 8px 0; padding-left: 8px; position: relative;"><span style="color: #6A3EE8; font-weight: bold; position: absolute; left: -16px;">•</span>$1</li>')
    
    // Wrap lists in ul tags
    .replace(/(<li.*<\/li>)/g, '<ul style="margin: 16px 0; padding-left: 20px; background: #F9FAFB; border-left: 4px solid #6A3EE8; padding: 16px 20px; border-radius: 8px;">$1</ul>')
    
    // Code blocks
    .replace(/```([\s\S]*?)```/g, '<pre style="background: #1F2937; color: #F9FAFB; padding: 20px; border-radius: 8px; overflow-x: auto; margin: 16px 0; font-family: \'Monaco\', \'Menlo\', monospace; font-size: 14px; line-height: 1.5;"><code>$1</code></pre>')
    
    // Inline code
    .replace(/`([^`]+)`/g, '<code style="background: #F3E8FF; color: #6A3EE8; padding: 2px 6px; border-radius: 4px; font-family: \'Monaco\', \'Menlo\', monospace; font-size: 14px;">$1</code>')
    
    // Paragraphs
    .replace(/^(?!<[h|u|l|p])(.*$)/gim, '<p style="margin: 16px 0; line-height: 1.8;">$1</p>')
    
    // Remove empty paragraphs
    .replace(/<p><\/p>/g, '')
    
    // Clean up multiple newlines
    .replace(/\n{3,}/g, '\n\n');
}

export default function AIContentPage() {
  const params = useParams();
  const router = useRouter();
  const [content, setContent] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Extract content from URL or localStorage
    const slug = params.slug as string;
    const decodedSlug = decodeURIComponent(slug);
    const contentKey = `ai-content-${decodedSlug}`;
    console.log('Original slug:', slug);
    console.log('Decoded slug:', decodedSlug);
    console.log('Looking for AI content with key:', contentKey);
    console.log('Available localStorage keys:', Object.keys(localStorage).filter(k => k.startsWith('ai-content')));
    
    let storedContent = localStorage.getItem(contentKey);
    console.log('Stored content found:', !!storedContent);
    console.log('Stored content length:', storedContent?.length);
    
    // If not found with the expected key, try alternative patterns
    if (!storedContent) {
      console.log('Trying alternative slug patterns...');
      
      // Try different slug patterns that might exist
      const alternativeKeys = Object.keys(localStorage).filter(k => k.startsWith('ai-content-'));
      console.log('Available alternative keys:', alternativeKeys);
      
      // Look for keys that might match the goal and day
      const goalMatch = decodedSlug.match(/^([^-]+)-day-(\d+)-/);
      if (goalMatch) {
        const [, goal, dayNumber] = goalMatch;
        console.log(`Looking for goal: "${goal}", day: ${dayNumber}`);
        
        // Try to find any key that contains the goal and day
        const matchingKey = alternativeKeys.find(key => 
          key.includes(goal) && key.includes(`day-${dayNumber}`)
        );
        
        if (matchingKey) {
          console.log(`Found matching key: ${matchingKey}`);
          storedContent = localStorage.getItem(matchingKey);
        }
      }
    }
    
    if (storedContent) {
      try {
        const parsedContent = JSON.parse(storedContent);
        console.log('Parsed content:', parsedContent);
        setContent(parsedContent);
      } catch (error) {
        console.error('Error parsing stored content:', error);
        setContent({
          title: 'AI Generated Content',
          content: 'Error loading AI generated content.',
          source: 'AI Generated'
        });
      }
    } else {
      // If no stored content, try to generate it on-demand via API
      console.log('No stored content found, attempting to generate on-demand via API...');
      
      try {
        // Call the API route to generate content on-demand
        const response = await fetch(`/api/ai-content/${encodeURIComponent(decodedSlug)}`);
        if (response.ok) {
          // The API route returns HTML, so we need to extract the content
          const html = await response.text();
          
          // Parse the HTML to extract the content (basic parsing)
          const titleMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/);
          const contentMatch = html.match(/<div[^>]*class="content"[^>]*>([\s\S]*?)<\/div>/);
          
          if (titleMatch && contentMatch) {
            const generatedContent = {
              title: titleMatch[1],
              content: contentMatch[1],
              source: 'AI Generated (On-Demand)'
            };
            console.log('Successfully generated content via API:', generatedContent);
            setContent(generatedContent);
          } else {
            throw new Error('Could not parse generated content');
          }
        } else {
          throw new Error(`API request failed with status: ${response.status}`);
        }
      } catch (error) {
        console.error('Failed to generate content via API:', error);
        
        // Fallback to basic content if API fails
        const parts = decodedSlug.split('-');
        const type = parts[parts.length - 1]; // 'article' or 'podcast'
        const dayNumber = parts[parts.length - 2]; // day number
        const goal = parts.slice(0, -2).join(' ').replace(/-/g, ' '); // goal name
        
        console.log(`Using fallback content for: goal="${goal}", day=${dayNumber}, type=${type}`);
        
        const fallbackContent = {
          title: `${goal} - Day ${dayNumber} ${type === 'article' ? 'Article' : 'Podcast'}`,
          content: `This is AI-generated content about ${goal} for day ${dayNumber}. The content was not found in storage, but you can still learn about this topic.`,
          source: 'AI Generated (Fallback)'
        };
        
        setContent(fallbackContent);
      }
    }
    setLoading(false);
  }, [params.slug]);

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontSize: '18px'
      }}>
        Loading AI generated content...
      </div>
    );
  }

  return (
    <div style={{
      maxWidth: '800px',
      margin: '0 auto',
      padding: '40px 20px',
      fontFamily: 'Baloo Bhai, sans-serif'
    }}>
      <div style={{
        background: 'linear-gradient(135deg, #6A3EE8 0%, #8B5CF6 100%)',
        color: 'white',
        padding: '30px',
        borderRadius: '12px',
        marginBottom: '30px',
        textAlign: 'center'
      }}>
        <h1 style={{
          fontSize: '28px',
          fontWeight: 'bold',
          margin: '0 0 10px 0'
        }}>
          {content?.title || 'AI Generated Content'}
        </h1>
        <p style={{
          fontSize: '16px',
          opacity: 0.9,
          margin: 0
        }}>
          {content?.source || 'AI Generated'}
        </p>
      </div>

      <div style={{
        background: 'white',
        padding: '30px',
        borderRadius: '12px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
        lineHeight: '1.6',
        fontSize: '16px'
      }}>
        <div 
          style={{
            color: '#374151',
            lineHeight: '1.7',
            fontSize: '16px'
          }}
        >
          <div dangerouslySetInnerHTML={{ __html: formatContent(content?.content || 'Content not available.') }} />
        </div>
      </div>

      <div style={{
        marginTop: '30px',
        textAlign: 'center'
      }}>
        <button
          onClick={() => {
            // Try to go back in history, if that fails, go to dashboard
            if (window.history.length > 1) {
              router.back();
            } else {
              router.push('/dashboard');
            }
          }}
          style={{
            background: '#6A3EE8',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'background-color 0.2s ease'
          }}
          onMouseOver={(e) => (e.target as HTMLButtonElement).style.background = '#5a2d91'}
          onMouseOut={(e) => (e.target as HTMLButtonElement).style.background = '#6A3EE8'}
        >
          ← Back to Roadmap
        </button>
      </div>
    </div>
  );
}
