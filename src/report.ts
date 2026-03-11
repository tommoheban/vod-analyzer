import { VoDReport } from './types';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const badge = (text: string, bg: string) =>
  `<span style="background:${bg};color:#fff;padding:2px 8px;border-radius:10px;font-size:12px">${text}</span>`;

const freqColor: Record<string, string> = { high: '#dc2626', medium: '#f59e0b', low: '#6b7280' };
const sevColor: Record<string, string> = { critical: '#dc2626', high: '#f59e0b', medium: '#3b82f6' };
const sentColor: Record<string, string> = { positive: '#16a34a', negative: '#dc2626', neutral: '#6b7280' };

export function renderReport(report: VoDReport): string {
  const { overview: o, pros, cons, major_issues: mi, detailed_findings: df, recommendations: rec, notable_quotes: nq } = report;
  const s = o.sentiment_breakdown;
  const total = s.positive + s.negative + s.mixed || 1;

  const srcNames: Record<string, string> = { reddit: 'Reddit', github: 'GitHub', stackoverflow: 'Stack Overflow', hackernews: 'HackerNews' };

  return `<div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:900px;margin:0 auto;color:#1a1a1a">
  <div style="text-align:center;margin-bottom:30px">
    <h2 style="font-size:26px;margin:0 0 6px">Voice of Developer: ${esc(report.keyword)}</h2>
    <p style="color:#666;font-size:14px">Generated ${new Date(report.generated_at).toLocaleDateString()} &middot; Analyzed ${o.total_analyzed} posts from 4 sources</p>
  </div>

  <div style="display:flex;height:24px;border-radius:12px;overflow:hidden;margin:16px 0">
    <div style="width:${s.positive/total*100}%;background:#16a34a" title="Positive"></div>
    <div style="width:${s.mixed/total*100}%;background:#f59e0b" title="Mixed"></div>
    <div style="width:${s.negative/total*100}%;background:#dc2626" title="Negative"></div>
  </div>
  <div style="display:flex;justify-content:space-between;font-size:13px;color:#666;margin-bottom:24px">
    <span>Positive: ${s.positive}</span><span>Mixed: ${s.mixed}</span><span>Negative: ${s.negative}</span>
  </div>

  <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:28px">
    ${(Object.keys(srcNames) as Array<keyof typeof o.sources>).map(k =>
      `<span style="background:#f3f4f6;padding:6px 14px;border-radius:20px;font-size:14px">${srcNames[k]} <b>${o.sources[k]}</b></span>`
    ).join('')}
  </div>

  <div style="margin-bottom:28px"><h3 style="margin-bottom:10px">Major Themes</h3>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      ${o.major_themes.map(t => `<span style="background:#e0e7ff;color:#3730a3;padding:4px 12px;border-radius:16px;font-size:13px">${esc(t)}</span>`).join('')}
    </div>
  </div>

  <h3 style="color:#16a34a;margin-bottom:12px">Pros</h3>
  ${pros.map(p => `<div style="border-left:4px solid #16a34a;background:#f0fdf4;padding:14px 16px;margin:0 0 12px;border-radius:0 8px 8px 0">
    <div style="display:flex;justify-content:space-between;align-items:center"><strong>${esc(p.title)}</strong>${badge(p.frequency, freqColor[p.frequency] || '#6b7280')}</div>
    <p style="margin:6px 0;color:#333;font-size:14px">${esc(p.description)}</p>
    <blockquote style="margin:6px 0 0;padding:6px 12px;border-left:2px solid #86efac;color:#555;font-style:italic;font-size:13px">"${esc(p.example_quote)}"</blockquote>
  </div>`).join('')}

  <h3 style="color:#dc2626;margin:20px 0 12px">Cons</h3>
  ${cons.map(c => `<div style="border-left:4px solid #dc2626;background:#fef2f2;padding:14px 16px;margin:0 0 12px;border-radius:0 8px 8px 0">
    <div style="display:flex;justify-content:space-between;align-items:center"><strong>${esc(c.title)}</strong>${badge(c.frequency, freqColor[c.frequency] || '#6b7280')}</div>
    <p style="margin:6px 0;color:#333;font-size:14px">${esc(c.description)}</p>
    <blockquote style="margin:6px 0 0;padding:6px 12px;border-left:2px solid #fca5a5;color:#555;font-style:italic;font-size:13px">"${esc(c.example_quote)}"</blockquote>
  </div>`).join('')}

  <h3 style="margin:20px 0 12px">Major Issues</h3>
  <table style="width:100%;border-collapse:collapse">
    <tr style="background:#f9fafb;text-align:left"><th style="padding:10px">Severity</th><th style="padding:10px">Issue</th><th style="padding:10px">Description</th></tr>
    ${mi.map(i => `<tr style="border-bottom:1px solid #e5e7eb">
      <td style="padding:10px">${badge(i.severity, sevColor[i.severity] || '#6b7280')}</td>
      <td style="padding:10px"><strong>${esc(i.title)}</strong></td>
      <td style="padding:10px;font-size:14px">${esc(i.description)}</td>
    </tr>`).join('')}
  </table>

  <h3 style="margin:24px 0 12px">Detailed Findings</h3>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
    <div><h4 style="color:#dc2626;margin-bottom:8px">Critical Pain Points</h4>
      <ul style="padding-left:18px;font-size:14px">${df.critical_pain_points.map(p => `<li style="margin:4px 0">${esc(p)}</li>`).join('')}</ul>
    </div>
    <div><h4 style="color:#16a34a;margin-bottom:8px">Praised Features</h4>
      <ul style="padding-left:18px;font-size:14px">${df.praised_features.map(p => `<li style="margin:4px 0">${esc(p)}</li>`).join('')}</ul>
    </div>
  </div>

  <h3 style="margin:24px 0 12px">Recommendations</h3>
  <ol style="padding-left:20px;font-size:14px">${rec.map(r => `<li style="margin:6px 0">${esc(r)}</li>`).join('')}</ol>

  <h3 style="margin:24px 0 12px">Notable Quotes</h3>
  ${nq.map(q => `<div style="border-left:4px solid ${sentColor[q.sentiment] || '#6b7280'};padding:10px 16px;margin:0 0 10px;background:#fafafa;border-radius:0 8px 8px 0">
    <p style="margin:0;font-style:italic;font-size:14px">"${esc(q.quote)}"</p>
    <p style="margin:4px 0 0;font-size:12px;color:#888">&mdash; ${esc(q.source)} (${q.sentiment})</p>
  </div>`).join('')}
</div>`;
}
