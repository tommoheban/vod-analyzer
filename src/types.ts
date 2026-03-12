export interface CommonPost {
  source: 'reddit' | 'github' | 'stackoverflow' | 'hackernews';
  title: string;
  body: string;
  comments: string[];
  url: string;
  score: number;
  date: string;
}

export interface VoDReport {
  keyword: string;
  generated_at: string;
  overview: {
    total_analyzed: number;
    sources: { reddit: number; github: number; stackoverflow: number; hackernews: number };
    sentiment_breakdown: { positive: number; negative: number; mixed: number };
    major_themes: string[];
  };
  pros: Array<{
    title: string; description: string; example_quote: string;
    source_url?: string; frequency: 'high' | 'medium' | 'low';
  }>;
  cons: Array<{
    title: string; description: string; example_quote: string;
    source_url?: string; frequency: 'high' | 'medium' | 'low';
  }>;
  major_issues: Array<{
    title: string; description: string;
    severity: 'critical' | 'high' | 'medium'; examples: string[];
  }>;
  detailed_findings: {
    common_themes: Array<{ text: string; source_url?: string }>;
    recurring_patterns: Array<{ text: string; source_url?: string }>;
    critical_pain_points: Array<{ text: string; source_url?: string }>;
    praised_features: Array<{ text: string; source_url?: string }>;
  };
  recommendations: string[];
  notable_quotes: Array<{
    quote: string; source: string; source_url?: string;
    sentiment: 'positive' | 'negative' | 'neutral';
  }>;
}
