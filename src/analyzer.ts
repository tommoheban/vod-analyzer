import OpenAI from 'openai';
import { CommonPost, VoDReport } from './types';

const client = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY || '',
});

export async function analyze(keyword: string, posts: CommonPost[]): Promise<VoDReport> {
  const sourceCounts = { reddit: 0, github: 0, stackoverflow: 0, hackernews: 0 };
  for (const p of posts) sourceCounts[p.source]++;

  const sliced = posts; // send all collected posts — haiku's 200K context handles it

  const postsText = sliced.map((p, i) =>
    `[#${i}][${p.source}] ${p.title}\n${p.body.slice(0, 300)}`
  ).join('\n---\n');

  const response = await client.chat.completions.create({
    model: 'anthropic/claude-3.5-haiku',
    response_format: { type: 'json_object' },
    messages: [{
      role: 'user',
      content: `Analyze these ${sliced.length} developer posts about "${keyword}" from Reddit, GitHub, Stack Overflow, and HackerNews.
Source counts: ${JSON.stringify(sourceCounts)}.

Each post is prefixed with [#N] where N is its index (0-${sliced.length - 1}).

EVIDENCE RULE: Only include a finding (pro, con, pain point, praised feature, theme, pattern) if it is supported by evidence from AT LEAST 3 different posts. Do not elevate one-off comments to findings. Every finding must reflect a recurring signal across the dataset.

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
  "pros": [{ "title": "", "description": "", "example_quote": "", "source_index": <N>, "frequency": "high|medium|low" }],
  "cons": [{ "title": "", "description": "", "example_quote": "", "source_index": <N>, "frequency": "high|medium|low" }],
  "major_issues": [{ "title": "", "description": "", "severity": "critical|high|medium", "examples": [""] }],
  "detailed_findings": {
    "praised_features": [{ "text": "", "source_index": <N> }],
    "critical_pain_points": [{ "text": "", "source_index": <N> }],
    "common_themes": [{ "text": "", "source_index": <N> }],
    "recurring_patterns": [{ "text": "", "source_index": <N> }]
  },
  "recommendations": [""],
  "notable_quotes": [{ "quote": "", "source": "", "source_index": <N>, "sentiment": "positive|negative|neutral" }]
}

For every item with source_index: set it to the integer index N of the most representative post for that finding (the [#N] prefix). This enables source attribution links.

Posts:
${postsText}`,
    }],
  });

  const text = response.choices[0].message.content || '';
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Could not parse response as JSON');

  const raw = JSON.parse(match[0]) as any;

  const resolveUrl = (item: any): string | undefined => {
    const idx = item?.source_index;
    if (typeof idx === 'number' && idx >= 0 && idx < sliced.length) {
      return sliced[idx].url;
    }
    return undefined;
  };

  for (const pro of raw.pros || []) pro.source_url = resolveUrl(pro);
  for (const con of raw.cons || []) con.source_url = resolveUrl(con);
  for (const q of raw.notable_quotes || []) q.source_url = resolveUrl(q);

  const df = raw.detailed_findings || {};
  for (const key of ['praised_features', 'critical_pain_points', 'common_themes', 'recurring_patterns']) {
    for (const item of df[key] || []) item.source_url = resolveUrl(item);
  }

  return raw as VoDReport;
}
