import express from 'express';
import crypto from 'crypto';
import { scrapeReddit } from './src/scrapers/reddit';
import { scrapeGitHub } from './src/scrapers/github';
import { scrapeStackOverflow } from './src/scrapers/stackoverflow';
import { scrapeHackerNews } from './src/scrapers/hackernews';
import { analyze } from './src/analyzer';
import { renderReport } from './src/report';
import { CommonPost } from './src/types';

const app = express();
app.use(express.json());

const VOD_PASSWORD = process.env.VOD_PASSWORD;
if (!VOD_PASSWORD) console.warn('WARNING: VOD_PASSWORD not set — auth disabled');
const sessions = new Set<string>();

function parseCookies(header: string | undefined): Record<string, string> {
  if (!header) return {};
  return Object.fromEntries(header.split(';').map(c => {
    const [k, ...v] = c.trim().split('=');
    return [k, v.join('=')];
  }));
}

function isAuthed(req: express.Request): boolean {
  if (!VOD_PASSWORD) return true;
  const token = parseCookies(req.headers.cookie)['vod_session'];
  return !!token && sessions.has(token);
}

const loginPage = (error = '') => `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>VoD Analyzer - Login</title>
<link rel="icon" type="image/png" href="https://github.com/tommoheban.png?size=32">
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;background:#f5f5f5;padding:40px 20px;display:flex;justify-content:center;align-items:center;min-height:100vh}
.card{max-width:400px;width:100%;background:#fff;border-radius:12px;box-shadow:0 2px 12px rgba(0,0,0,.08);padding:40px}
h1{font-size:22px;margin-bottom:6px}
.sub{color:#666;font-size:14px;margin-bottom:24px}
input{width:100%;padding:12px 16px;border:1px solid #ddd;border-radius:8px;font-size:16px;outline:none;margin-bottom:16px}
input:focus{border-color:#2563eb}
button{width:100%;padding:12px;background:#2563eb;color:#fff;border:none;border-radius:8px;font-size:16px;cursor:pointer}
.err{color:#dc2626;font-size:14px;margin-bottom:12px}
</style></head><body><div class="card">
<h1>Voice of Developer Analyzer</h1>
<p class="sub">Enter password to continue</p>
${error ? '<p class="err">' + error + '</p>' : ''}
<form method="POST" action="/login">
  <input type="password" name="password" placeholder="Password" autofocus required/>
  <button type="submit">Login</button>
</form>
</div></body></html>`;

app.use(express.urlencoded({ extended: false }));

app.post('/login', (req, res) => {
  if (!VOD_PASSWORD || req.body.password === VOD_PASSWORD) {
    const token = crypto.randomUUID();
    sessions.add(token);
    res.setHeader('Set-Cookie', `vod_session=${token}; Path=/; HttpOnly; SameSite=Lax`);
    res.redirect('/');
  } else {
    res.type('html').send(loginPage('Incorrect password'));
  }
});

app.post('/logout', (req, res) => {
  const token = parseCookies(req.headers.cookie)['vod_session'];
  if (token) sessions.delete(token);
  res.setHeader('Set-Cookie', 'vod_session=; Path=/; HttpOnly; Max-Age=0');
  res.redirect('/');
});

app.get('/', (req, res) => {
  if (!isAuthed(req)) { res.type('html').send(loginPage()); return; }
  res.type('html').send(`<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>VoD Analyzer</title>
<link rel="icon" type="image/png" href="https://github.com/tommoheban.png?size=32">
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;background:#f5f5f5;padding:40px 20px}
.card{max-width:680px;margin:0 auto;background:#fff;border-radius:12px;box-shadow:0 2px 12px rgba(0,0,0,.08);padding:40px}
h1{font-size:24px;margin-bottom:8px}
.sub{color:#666;font-size:14px;margin-bottom:24px;line-height:1.5}
.row{display:flex;gap:12px}
input{flex:1;padding:12px 16px;border:1px solid #ddd;border-radius:8px;font-size:16px;outline:none}
input:focus{border-color:#2563eb}
button{padding:12px 24px;background:#2563eb;color:#fff;border:none;border-radius:8px;font-size:16px;cursor:pointer;white-space:nowrap}
button:disabled{background:#93c5fd;cursor:not-allowed}
#progress{margin-top:20px;display:none;background:#fafafa;border-radius:8px;padding:16px;font-family:monospace;font-size:13px;line-height:1.8}
#progress p{margin:2px 0}
</style></head><body>
<div class="card">
  <h1>Voice of Developer Analyzer</h1>
  <p class="sub">Enter a keyword to analyze developer sentiment across GitHub, Reddit, Stack Overflow, and HackerNews</p>
  <div class="row">
    <input id="kw" placeholder="e.g. Bright Data, Playwright, Vite..." onkeydown="if(event.key==='Enter')run()"/>
    <button id="btn" onclick="run()">Analyze</button>
  </div>
  <div id="progress"></div>
</div>
<div id="toolbar" style="max-width:900px;margin:16px auto;padding:0 20px;display:none;justify-content:flex-end">
  <button onclick="saveReport()" style="padding:8px 18px;background:#2563eb;color:#fff;border:none;border-radius:8px;font-size:14px;cursor:pointer;display:flex;align-items:center;gap:6px">
    &#x1F4BE; Save Report
  </button>
</div>
<div id="report" style="max-width:900px;margin:0 auto;padding:0 20px"></div>
<script>
async function run(){
  var kw=document.getElementById('kw').value.trim();
  if(!kw)return;
  var btn=document.getElementById('btn');
  var prog=document.getElementById('progress');
  var report=document.getElementById('report');
  btn.disabled=true; prog.style.display='block'; prog.innerHTML=''; report.innerHTML='';
  try{
    var res=await fetch('/analyze',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({keyword:kw})});
    var reader=res.body.getReader(), decoder=new TextDecoder(), buf='';
    while(true){
      var r=await reader.read(); if(r.done)break;
      buf+=decoder.decode(r.value,{stream:true});
      var lines=buf.split('\\n'); buf=lines.pop()||'';
      for(var l of lines){
        if(!l.startsWith('data: '))continue;
        var e=JSON.parse(l.slice(6));
        if(e.type==='progress')prog.innerHTML+='<p>'+e.message+'</p>';
        if(e.type==='done'){report.innerHTML=e.html;report.dataset.keyword=kw;document.getElementById('toolbar').style.display='flex';}
        if(e.type==='error')prog.innerHTML+='<p style="color:red">'+e.message+'</p>';
      }
    }
  }catch(err){prog.innerHTML+='<p style="color:red">Error: '+err.message+'</p>';}
  btn.disabled=false;
}
function saveReport(){
  var report=document.getElementById('report');
  var kw=report.dataset.keyword||'report';
  var full='<!DOCTYPE html><html><head><meta charset="utf-8"><title>VoD Report: '+kw+'</title>'
    +'<link rel="icon" type="image/png" href="https://github.com/tommoheban.png?size=32">'
    +'<style>body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;background:#f5f5f5;padding:40px 20px}</style>'
    +'</head><body>'+report.innerHTML+'</body></html>';
  var blob=new Blob([full],{type:'text/html'});
  var a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download='vod-report-'+kw.replace(/[^a-z0-9]+/gi,'-').toLowerCase()+'-'+new Date().toISOString().slice(0,10)+'.html';
  document.body.appendChild(a);a.click();document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
}
</script></body></html>`);
});

app.post('/analyze', async (req, res) => {
  if (!isAuthed(req)) { res.status(401).json({ error: 'unauthorized' }); return; }
  const { keyword } = req.body;
  if (!keyword) { res.status(400).json({ error: 'keyword required' }); return; }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const send = (type: string, data: Record<string, unknown>) =>
    res.write(`data: ${JSON.stringify({ type, ...data })}\n\n`);

  const scrapers = [
    { name: 'Reddit', fn: () => scrapeReddit(keyword) },
    { name: 'GitHub', fn: () => scrapeGitHub(keyword) },
    { name: 'Stack Overflow', fn: () => scrapeStackOverflow(keyword) },
    { name: 'HackerNews', fn: () => scrapeHackerNews(keyword) },
  ];

  for (const s of scrapers) send('progress', { message: `\u23F3 Scraping ${s.name}...` });

  try {
    const results = await Promise.allSettled(
      scrapers.map(async ({ name, fn }) => {
        const posts = await fn();
        send('progress', { message: `\u2705 ${name}: ${posts.length} posts found` });
        return posts;
      }),
    );

    const allPosts: CommonPost[] = [];
    results.forEach((r, i) => {
      if (r.status === 'fulfilled') allPosts.push(...r.value);
      else send('progress', { message: `\u26A0\uFE0F ${scrapers[i].name} unavailable, continuing...` });
    });

    if (allPosts.length === 0) {
      send('error', { message: 'No posts found from any source' });
      res.end();
      return;
    }

    send('progress', { message: '\u23F3 Sending to OpenRouter for analysis...' });
    const report = await analyze(keyword, allPosts);
    send('progress', { message: '\u2705 Analysis complete \u2014 building report...' });
    const html = renderReport(report);
    send('done', { html });
  } catch (err: any) {
    send('error', { message: err.message || 'Analysis failed' });
  }
  res.end();
});

app.listen(3000, () => console.log('VoD Analyzer running on http://localhost:3000'));
