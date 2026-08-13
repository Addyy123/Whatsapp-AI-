import { toolRegistry } from './registry';

toolRegistry.register({
  name: 'web.search',
  schema: {
    type: 'function',
    function: {
      name: 'web.search',
      description: 'Search the web for up-to-date information, news, or facts.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'The search query' }
        },
        required: ['query']
      }
    }
  },
  handler: async (args: any, context) => {
    const SERPER_API_KEY = process.env.SERPER_API_KEY;
    if (!SERPER_API_KEY || SERPER_API_KEY.includes('your-serper')) {
      throw new Error('Web search is not configured yet (Missing SERPER_API_KEY).');
    }

    try {
      const response = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: {
          'X-API-KEY': SERPER_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ q: args.query })
      });

      if (!response.ok) {
        throw new Error(`Serper API error: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Extract organic results to save LLM tokens
      const results = (data.organic || []).slice(0, 5).map((r: any) => ({
        title: r.title,
        link: r.link,
        snippet: r.snippet
      }));

      return { success: true, results };
    } catch (err: any) {
      throw new Error(`Web search failed: ${err.message}`);
    }
  }
});

export {};
