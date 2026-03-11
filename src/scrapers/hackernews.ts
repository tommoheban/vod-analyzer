import { CommonPost } from '../types';

export async function scrapeHackerNews(keyword: string): Promise<CommonPost[]> {
  const url = `https://hn.algolia.com/api/v1/search` +
    `?query=${encodeURIComponent(keyword)}&tags=comment&hitsPerPage=100`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HackerNews returned ${res.status}`);
  const data = await res.json();

  return (data.hits || []).map((hit: any) => ({
    source: 'hackernews' as const,
    title: hit.story_title || hit.title || '',
    body: (hit.comment_text || '').replace(/<[^>]*>/g, '').slice(0, 1000),
    comments: [],
    url: `https://news.ycombinator.com/item?id=${hit.objectID}`,
    score: hit.points || 0,
    date: hit.created_at || new Date().toISOString(),
  }));
}
