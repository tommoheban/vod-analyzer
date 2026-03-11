import OpenAI from 'openai';
import { CommonPost, VoDReport } from './types';

const client = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY || '',
});

export async function analyze(keyword: string, posts: CommonPost[]): Promise<VoDReport> {
  const sourceCounts = { reddit: 0, github: 0, stackoverflow: 0, hackernews: 0 };
  for (const p of posts) sourceCounts[p.source]++;

  const postsText = posts.slice(0, 80).map(p =>
    `[${p.source}] ${p.title}\n${p.body.slice(0, 300)}`
  ).join('\n---\n');

  const response = await client.chat.completions.create({
    model: 'anthropic/claude-3.5-sonnet',
    response_format: { type: 'json_object' },
    messages: [{
      role: 'user',
      content: `Analyze these ${posts.length} developer posts about "${keyword}" from Reddit, GitHub, Stack Overflow, and HackerNews.
Source counts: ${JSON.stringify(sourceCounts)}.

Return ONLY valid JSON with this structure:
{
  "keyword": "${keyword}",
  "generated_at": "${new Date().toISOString()}",
  "overview": {
    "total_analyzed": ${posts.length},
    "sources": ${JSON.stringify(sourceCounts)},
    "sentiment_breakdown": { "positive": <number>, "negative": <number>, "mixed": <number> },
    "major_themes": ["theme1", "theme2"]
  },
  "pros": [{ "title": "", "description": "", "example_quote": "", "frequency": "high|medium|low" }],
  "cons": [{ "title": "", "description": "", "example_quote": "", "frequency": "high|medium|low" }],
  "major_issues": [{ "title": "", "description": "", "severity": "critical|high|medium", "examples": [""] }],
  "detailed_findings": {
    "common_themes": [], "recurring_patterns": [],
    "critical_pain_points": [], "praised_features": []
  },
  "recommendations": [""],
  "notable_quotes": [{ "quote": "", "source": "", "sentiment": "positive|negative|neutral" }]
}

Posts:
${postsText}`,
    }],
  });

  const text = response.choices[0].message.content || '';
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Could not parse response as JSON');
  return JSON.parse(match[0]);
}
