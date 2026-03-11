import { GoogleGenerativeAI } from '@google/generative-ai';
import { CommonPost, VoDReport } from './types';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function analyze(keyword: string, posts: CommonPost[]): Promise<VoDReport> {
  const sourceCounts = { reddit: 0, github: 0, stackoverflow: 0, hackernews: 0 };
  for (const p of posts) sourceCounts[p.source]++;

  const postsText = posts.slice(0, 80).map(p =>
    `[${p.source}] ${p.title}\n${p.body.slice(0, 300)}`
  ).join('\n---\n');

  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    generationConfig: { responseMimeType: 'application/json' },
  });

  const result = await model.generateContent(
    `Analyze these ${posts.length} developer posts about "${keyword}" from Reddit, GitHub, Stack Overflow, and HackerNews.
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
  );

  const text = result.response.text();
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Could not parse Gemini response as JSON');
  return JSON.parse(match[0]);
}
