import { CommonPost } from '../types';

export async function scrapeGitHub(keyword: string): Promise<CommonPost[]> {
  const token = process.env.GH_TOKEN;
  if (!token) throw new Error('GH_TOKEN not set');

  const gql = async (type: string) => {
    const res = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `query($q: String!) {
          search(query: $q, type: ${type}, first: 25) {
            nodes {
              ... on Issue { title bodyText url createdAt }
              ... on PullRequest { title bodyText url createdAt }
              ... on Discussion { title bodyText url createdAt }
            }
          }
        }`,
        variables: { q: keyword },
      }),
    });
    if (!res.ok) throw new Error(`GitHub API ${res.status}`);
    return res.json() as Promise<{ data?: { search?: { nodes?: any[] } } }>;
  };

  const [issues, discussions] = await Promise.allSettled([
    gql('ISSUE'),
    gql('DISCUSSION'),
  ]);

  const posts: CommonPost[] = [];
  for (const result of [issues, discussions]) {
    if (result.status !== 'fulfilled') continue;
    for (const n of result.value?.data?.search?.nodes || []) {
      if (!n?.title) continue;
      posts.push({
        source: 'github',
        title: n.title,
        body: (n.bodyText || '').slice(0, 1000),
        comments: [],
        url: n.url || '',
        score: 0,
        date: n.createdAt || new Date().toISOString(),
      });
    }
  }
  return posts;
}
