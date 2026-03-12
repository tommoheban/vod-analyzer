import OpenAI from 'openai';
import { CommonPost, VoDReport } from './types';

const client = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY || '',
});

export async function analyze(keyword: string, posts: CommonPost[]): Promise<VoDReport> {
  const sourceCounts = { reddit: 0, github: 0, stackoverflow: 0, hackernews: 0 };
  for (const p of posts) sourceCounts[p.source]++;

  const sliced = posts.slice(0, 80);
  const postsText = sliced.map((p, i) =>
    `[#${i}][${p.source}] ${p.title}\n${p.body.slice(0, 300)}`
  ).join('\n---\n');

  const response = await client.chat.completions.create({
    model: 'anthropic/claude-3.5-sonnet',
    response_format: { type: 'json_object' },
    messages: [{
      role: 'user',
      content: `Analyze these ${sliced.length} developer posts about "${keyword}" from Reddit, GitHub, Stack Overflow, and HackerNews.
Source counts: ${JSON.stringify(sourceCounts)}.

Each post is prefixed with [#N] where N is its index number (0-${sliced.length - 1}).

Return ONLY valid JSON with this structure:
{
  "keyword": "${keyword}",
  "generated_at": "${new Date().toISOString()}",
  "overview": {
    "total_analyzed": ${sliced.length},
    "sources": ${JSON.stringify(sourceCounts)},
    "sentiment_breakdown": { "positive": <number>, "negative": <number>, "mixed": <number> },
    "major_themes": ["theme1", "theme2"]
  },
  "pros": [{ "title": "", "description": "", "example_quote": "", "source_index": <post #N as integer>, "frequency": "high|medium|low" }],
  "cons": [{ "title": "", "description": "", "example_quote": "", "source_index": <post #N as integer>, "frequency": "high|medium|low" }],
  "major_issues": [{ "title": "", "description": "", "severity": "critical|high|medium", "examples": [""] }],
  "detailed_findings": {
    "common_themes": [], "recurring_patterns": [],
    "critical_pain_points": [], "praised_features": []
  },
  "recommendations": [""],
  "notable_quotes": [{ "quote": "", "source": "", "source_index": <post #N as integer>, "sentiment": "positive|negative|neutral" }]
}

IMPORTANT: For every example_quote and notable quote, set source_index to the integer index N of the post it came from (the [#N] prefix). This is required for source attribution.

Posts:
${postsText}`,
    }],
  });

  const text = response.choices[0].message.content || '';
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Could not parse response as JSON');

  // Parse raw response and resolve source_index -> source_url
  const raw = JSON.parse(match[0]) as any;

  const resolveUrl = (item: any): string | undefined => {
    const idx = item?.source_index;
    if (typeof idx === 'number' && idx >= 0 && idx < sliced.length) {
      return sliced[idx].url;
    }
    return undefined;
  };

  for (const pro of raw.pros || []) {
    pro.source_url = resolveUrl(pro);
  }
  for (const con of raw.cons || []) {
    con.source_url = resolveUrl(con);
  }
  for (const q of raw.notable_quotes || []) {
    q.source_url = resolveUrl(q);
  }

  return raw as VoDReport;
}
