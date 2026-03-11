import { CommonPost } from '../types';

export async function scrapeStackOverflow(keyword: string): Promise<CommonPost[]> {
  const url = `https://api.stackexchange.com/2.3/search/advanced` +
    `?q=${encodeURIComponent(keyword)}&site=stackoverflow&pagesize=50&filter=withbody`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Stack Overflow returned ${res.status}`);
  const data = await res.json() as { items?: any[] };

  return (data.items || []).map((item: any) => ({
    source: 'stackoverflow' as const,
    title: item.title || '',
    body: (item.body || '').replace(/<[^>]*>/g, '').slice(0, 1000),
    comments: [],
    url: item.link || '',
    score: item.score || 0,
    date: new Date((item.creation_date || 0) * 1000).toISOString(),
  }));
}
