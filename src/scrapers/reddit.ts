import { CommonPost } from '../types';

export async function scrapeReddit(keyword: string): Promise<CommonPost[]> {
  const url = `https://old.reddit.com/search.json?q=${encodeURIComponent(keyword)}&limit=50&sort=relevance`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; VoD-Analyzer/1.0)',
      'Accept': 'application/json',
    },
  });
  if (!res.ok) throw new Error(`Reddit returned ${res.status}`);
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
