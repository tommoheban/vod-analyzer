import { ProxyAgent, fetch as proxyFetch } from 'undici';
import { CommonPost } from '../types';

export async function scrapeReddit(keyword: string): Promise<CommonPost[]> {
  const proxyUrl = process.env.BRIGHTDATA_PROXY_URL;
  if (!proxyUrl) throw new Error('BRIGHTDATA_PROXY_URL not set');

  const dispatcher = new ProxyAgent({
    uri: proxyUrl,
    requestTls: { rejectUnauthorized: false },
    proxyTls: { rejectUnauthorized: false },
  });

  const url = `https://www.reddit.com/search.json?q=${encodeURIComponent(keyword)}&limit=50&sort=relevance`;
  const res = await proxyFetch(url, {
    dispatcher,
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; VoD-Analyzer/1.0)' },
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
