import { CommonPost } from '../types';

export async function scrapeReddit(keyword: string): Promise<CommonPost[]> {
  const apiKey = process.env.BRIGHTDATA_API_KEY;
  const zone = process.env.BRIGHTDATA_ZONE || 'web_unlocker1';
  if (!apiKey) throw new Error('BRIGHTDATA_API_KEY not set');

  const targetUrl = `https://www.reddit.com/search.json?q=${encodeURIComponent(keyword)}&limit=50&sort=relevance`;

  const res = await fetch('https://api.brightdata.com/request', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ zone, url: targetUrl, format: 'raw' }),
  });

  if (!res.ok) throw new Error(`Bright Data returned ${res.status}: ${await res.text()}`);
  const data = await res.json() as { data?: { children?: any[] } };

  return (data.data?.children || []).map((child: any) => {
    const p = child.data;
    return {
      source: 'reddit' as const,
      title: p.title || '',
      body: (p.selftext || '').slice(0, 1000),
      comments: [],
      url: `https://reddit.com${p.permalink}`,
      score: p.score || 0,
      date: new Date((p.created_utc || 0) * 1000).toISOString(),
    };
  });
}
