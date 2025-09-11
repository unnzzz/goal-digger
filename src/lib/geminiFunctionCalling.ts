import { GoogleGenerativeAI } from '@google/generative-ai';
import { advancedScraper } from './advancedWebScraper';
import { RoadmapT, ResourceT } from './schema';

// Initialize Gemini with function calling support
const genAI = new GoogleGenerativeAI('AIzaSyBQseIm2Zs6bBGeKeDkKvkjw4B4Q0X9Q6o');
const model = genAI.getGenerativeModel({ 
  model: 'gemini-1.5-flash',
  generationConfig: {
    temperature: 0.7,
    topK: 40,
    topP: 0.95,
    maxOutputTokens: 8192,
  }
});

// Define the web search function schema for Gemini
const webSearchFunction = {
  name: 'web_search',
  description: 'Search the web for educational resources including videos, articles, and tutorials',
  parameters: {
    type: 'object',
    properties: {
      queries: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'The search query for finding educational content'
            },
            resource_type: {
              type: 'string',
              enum: ['watch', 'read', 'listen'],
              description: 'The type of resource to search for'
            },
            context: {
              type: 'string',
              description: 'Additional context about what kind of content is needed'
            }
          },
          required: ['query', 'resource_type']
        },
        description: 'Array of search queries to execute'
      }
    },
    required: ['queries']
  }
};

interface SearchQuery {
  query: string;
  resource_type: 'watch' | 'read' | 'listen';
  context?: string;
}

interface SearchResult {
  query: string;
  resource_type: 'watch' | 'read' | 'listen';
  resources: ResourceT[];
}

// Multi-turn conversation handler
class GeminiFunctionCalling {
  private conversationHistory: any[] = [];

  // Start the conversation with user's goal
  async startConversation(goal: string, totalDays: number, dailyMinutes: number): Promise<string> {
    const initialPrompt = `You are an expert learning roadmap generator. The user wants to learn: "${goal}"

Create a detailed learning roadmap with ${totalDays} days, ${dailyMinutes} minutes per day.

For each day, you need to find real educational resources. Use the web_search function to find:
1. Video tutorials (watch resources)
2. Articles and guides (read resources) 
3. Podcasts or audio content (listen resources)

The roadmap should progress from beginner to intermediate level with practical, actionable learning.

Start by planning the daily topics, then use web_search to find resources for each day.`;

    this.conversationHistory = [
      {
        role: 'user',
        parts: [{ text: initialPrompt }]
      }
    ];

    const result = await model.generateContent({
      contents: this.conversationHistory,
      tools: [{ functionDeclarations: [webSearchFunction] }]
    });

    const response = result.response;
    this.conversationHistory.push({
      role: 'model',
      parts: response.candidates?.[0]?.content?.parts || []
    });

    return response.text();
  }

  // Handle function calls from Gemini
  async handleFunctionCall(functionCall: any): Promise<SearchResult[]> {
    if (functionCall.name !== 'web_search') {
      throw new Error(`Unknown function: ${functionCall.name}`);
    }

    const { queries } = functionCall.args;
    const results: SearchResult[] = [];

    console.log(`Gemini requested ${queries.length} web searches`);

    // Execute searches in parallel with rate limiting
    for (const searchQuery of queries) {
      try {
        console.log(`Searching for ${searchQuery.resource_type}: ${searchQuery.query}`);
        
        const resources = await advancedScraper.searchResources(
          searchQuery.query,
          searchQuery.resource_type
        );

        results.push({
          query: searchQuery.query,
          resource_type: searchQuery.resource_type,
          resources: resources
        });

        // Add delay between searches to be respectful
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`Search failed for ${searchQuery.query}:`, error);
        results.push({
          query: searchQuery.query,
          resource_type: searchQuery.resource_type,
          resources: []
        });
      }
    }

    return results;
  }

  // Send search results back to Gemini
  async sendSearchResults(searchResults: SearchResult[]): Promise<string> {
    const functionResponse = {
      name: 'web_search',
      response: {
        search_results: searchResults.map(result => ({
          query: result.query,
          resource_type: result.resource_type,
          resources_found: result.resources.length,
          resources: result.resources.map(resource => ({
            title: resource.title,
            url: resource.url,
            source: resource.source,
            duration_minutes: resource.duration_minutes,
            type: resource.kind
          }))
        }))
      }
    };

    this.conversationHistory.push({
      role: 'user',
      parts: [{ functionResponse }]
    });

    const result = await model.generateContent({
      contents: this.conversationHistory,
      tools: [{ functionDeclarations: [webSearchFunction] }]
    });

    const response = result.response;
    this.conversationHistory.push({
      role: 'model',
      parts: response.candidates?.[0]?.content?.parts || []
    });

    return response.text();
  }

  // Generate final roadmap with JSON schema enforcement
  async generateFinalRoadmap(): Promise<RoadmapT> {
    const jsonSchemaPrompt = `Based on all the resources we've found, generate a complete learning roadmap in the following JSON format:

{
  "goal": "string",
  "total_days": number,
  "daily_minutes": number,
  "days": [
    {
      "day": number,
      "title": "string - specific, unique topic for this day",
      "minutes": number,
      "learn": [
        {
          "kind": "watch" | "read" | "listen",
          "title": "string",
          "url": "string",
          "source": "string",
          "duration_minutes": number,
          "split": null
        }
      ],
      "practice": [
        {
          "kind": "watch" | "read" | "listen", 
          "title": "string",
          "url": "string",
          "source": "string",
          "duration_minutes": number,
          "split": null
        }
      ],
      "reflect": "string - specific reflection question"
    }
  ]
}

IMPORTANT: Return ONLY valid JSON, no markdown, no code blocks, no explanations.`;

    this.conversationHistory.push({
      role: 'user',
      parts: [{ text: jsonSchemaPrompt }]
    });

    const result = await model.generateContent({
      contents: this.conversationHistory
    });

    const response = result.response;
    const roadmapText = response.text();

    // Extract JSON from response
    let roadmapJson = roadmapText;
    if (roadmapText.includes('```json')) {
      roadmapJson = roadmapText.split('```json')[1].split('```')[0].trim();
    } else if (roadmapText.includes('```')) {
      roadmapJson = roadmapText.split('```')[1].split('```')[0].trim();
    }

    try {
      const roadmap = JSON.parse(roadmapJson);
      return roadmap as RoadmapT;
    } catch (error) {
      console.error('Failed to parse roadmap JSON:', error);
      throw new Error('Failed to generate valid roadmap JSON');
    }
  }

  // Main orchestration method
  async generateRoadmapWithFunctionCalling(goal: string, totalDays: number, dailyMinutes: number): Promise<RoadmapT> {
    try {
      console.log('Starting Gemini function calling conversation...');
      
      // Step 1: Start conversation
      const initialResponse = await this.startConversation(goal, totalDays, dailyMinutes);
      console.log('Initial response:', initialResponse.substring(0, 200) + '...');

      // Step 2: Handle function calls in a loop
      let maxIterations = 5; // Prevent infinite loops
      let iteration = 0;

      while (iteration < maxIterations) {
        const lastMessage = this.conversationHistory[this.conversationHistory.length - 1];
        const lastParts = lastMessage.parts || [];

        // Check if the last response contains function calls
        const functionCalls = lastParts.filter((part: any) => part.functionCall);
        
        if (functionCalls.length === 0) {
          // No more function calls, generate final roadmap
          break;
        }

        // Execute function calls
        for (const part of functionCalls) {
          if (part.functionCall) {
            const searchResults = await this.handleFunctionCall(part.functionCall);
            await this.sendSearchResults(searchResults);
          }
        }

        iteration++;
      }

      // Step 3: Generate final roadmap
      console.log('Generating final roadmap...');
      const roadmap = await this.generateFinalRoadmap();
      
      console.log('Roadmap generation completed successfully');
      return roadmap;

    } catch (error) {
      console.error('Function calling roadmap generation failed:', error);
      throw error;
    }
  }
}

export const geminiFunctionCalling = new GeminiFunctionCalling();
export default geminiFunctionCalling;
