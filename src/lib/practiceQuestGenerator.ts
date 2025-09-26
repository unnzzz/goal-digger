import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini
const genAI = new GoogleGenerativeAI('AIzaSyBQseIm2Zs6bBGeKeDkKvkjw4B4Q0X9Q6o');
const model = genAI.getGenerativeModel({ 
  model: 'gemini-1.5-pro',
  generationConfig: {
    temperature: 0.7,
    topK: 40,
    topP: 0.95,
    maxOutputTokens: 2048,
  }
});

export async function generatePracticeQuests(goal: string, dayTitle: string, dayNumber: number): Promise<{
  exercise1Title: string;
  exercise1Description: string;
  exercise2Title: string;
  exercise2Description: string;
}> {
  try {
    // Use AI to generate contextually relevant practice exercises
    const practicePrompt = `Generate 2 specific, practical practice exercises for someone learning "${goal}" on day ${dayNumber} about "${dayTitle}".

Requirements:
- Each exercise should be 30-45 minutes long
- Be specific to the goal and day topic, not generic
- Include hands-on, practical activities
- Make them engaging and educational
- Use the exact goal and topic in the descriptions
- Be creative and unique for each goal type

Return JSON format:
{
  "exercise1": {
    "title": "Specific exercise title",
    "description": "Detailed 2-3 sentence description of what to do"
  },
  "exercise2": {
    "title": "Specific exercise title", 
    "description": "Detailed 2-3 sentence description of what to do"
  }
}`;

    const result = await model.generateContent(practicePrompt);
    const response = await result.response;
    const text = response.text();
    
    // Extract JSON from response
    let jsonText = text;
    if (text.includes('```json')) {
      jsonText = text.split('```json')[1].split('```')[0].trim();
    } else if (text.includes('```')) {
      jsonText = text.split('```')[1].split('```')[0].trim();
    }
    
    const practiceData = JSON.parse(jsonText);
    return {
      exercise1Title: practiceData.exercise1.title,
      exercise1Description: practiceData.exercise1.description,
      exercise2Title: practiceData.exercise2.title,
      exercise2Description: practiceData.exercise2.description
    };
    
  } catch (error) {
    console.error('AI practice generation failed, using fallback:', error);
    // Fallback to contextual but generic exercises
    const goalWords = goal.toLowerCase().split(' ').filter(word => word.length > 3);
    const coreTopic = dayTitle.replace(/day \d+:/gi, '').replace(/:/g, '').trim();
    
    return {
      exercise1Title: `${coreTopic} Practice: ${goalWords[0] || 'Learning'} Skills`,
      exercise1Description: `Spend 2-3 hours actively practicing the specific ${coreTopic.toLowerCase()} techniques for ${goal.toLowerCase()}. Focus on hands-on application and real-world scenarios. Create something tangible that demonstrates your understanding. Document your process and challenges. Experiment with different approaches and find what works best for you.`,
      exercise2Title: `${coreTopic} Project: ${goalWords[0] || 'Learning'} Application`,
      exercise2Description: `Create a comprehensive project that showcases your ${coreTopic.toLowerCase()} skills in ${goal.toLowerCase()}. Choose something that excites you and allows you to express your creativity while applying what you've learned. Focus on creating something of value that you can be proud of and share with others. Document your creative process and reflect on what you learned.`
    };
  }
}
