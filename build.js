#!/usr/bin/env node
// Linklog builder: reads links.json + services.json, writes two outputs:
//   dist/links/index.html  → full linklog (deployed to links.r-dh.com)
//   dist/rdh/index.html    → homepage with services + recent entries (r-dh.com)
// No deps. Run with: node build.js

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const LINKS = path.join(ROOT, 'links.json');
const SERVICES = path.join(ROOT, 'services.json');
const OUT_LINKS = path.join(ROOT, 'dist', 'links', 'index.html');
const OUT_HOME = path.join(ROOT, 'dist', 'rdh', 'index.html');

const HOME_ENTRY_LIMIT = 10;

function esc(s = '') {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDate(iso) {
  const d = new Date(iso);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function renderEntry(entry) {
  const tags = (entry.tags || [])
    .map(t => `<span class="tag" data-tag="${esc(t)}">${esc(t)}</span>`)
    .join('');

  const insights = entry.kind === 'youtube' && entry.insights?.length
    ? `<ul class="insights">${entry.insights.map(i => `<li>${esc(i)}</li>`).join('')}</ul>`
    : '';

  const audio = entry.audio_url
    ? `<a class="audio-link" href="${esc(entry.audio_url)}">🎧 listen${entry.audio_mode === 'summary' ? ' (summary)' : ''}</a>`
    : '';

  const note = entry.note ? `<div class="note user-note">${esc(entry.note)}</div>` : '';

  return `
    <article class="entry" data-tags="${esc((entry.tags || []).join(' '))}">
      <div class="entry-date">${esc(formatDate(entry.date))}</div>
      <a class="entry-title" href="${esc(entry.url)}">${esc(entry.title)}</a>
      <div class="note">${esc(entry.summary || '')}</div>
      ${note}
      ${insights}
      <div class="entry-meta">
        ${tags}
        ${audio}
      </div>
    </article>
  `.trim();
}

function renderServices(services) {
  if (!services?.length) return '';
  const items = services.map(s => `
    <a class="service" href="${esc(s.url)}">
      <span class="service-name">${esc(s.name)}</span>
      <span class="service-desc">${esc(s.description || '')}</span>
    </a>
  `.trim()).join('\n');
  return `
    <section class="services">
      <h2>Tools</h2>
      <div class="service-grid">${items}</div>
    </section>
  `.trim();
}

const STYLES = `
    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
      background: #0a0a0a;
      color: #e0e0e0;
      min-height: 100vh;
      padding: 2rem;
      max-width: 640px;
      margin: 0 auto;
      line-height: 1.5;
    }

    header {
      margin-bottom: 2rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid #222;
    }

    header h1 {
      font-size: 1.2rem;
      font-weight: 600;
      color: #fff;
      letter-spacing: -0.02em;
    }

    header p {
      font-size: 0.85rem;
      color: #666;
      margin-top: 0.3rem;
    }

    .services {
      margin-bottom: 2.5rem;
    }

    .services h2 {
      font-size: 0.7rem;
      font-weight: 600;
      color: #555;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      margin-bottom: 0.8rem;
    }

    .service-grid {
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
    }

    .service {
      display: flex;
      flex-direction: column;
      padding: 0.7rem 0.9rem;
      background: #111;
      border: 1px solid #1e1e1e;
      border-radius: 4px;
      text-decoration: none;
      transition: border-color 0.15s;
    }

    .service:hover { border-color: #333; }

    .service-name {
      font-size: 0.9rem;
      font-weight: 500;
      color: #4a9eff;
    }

    .service-desc {
      font-size: 0.78rem;
      color: #777;
      margin-top: 0.2rem;
    }

    .section-label {
      font-size: 0.7rem;
      font-weight: 600;
      color: #555;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      margin-bottom: 1rem;
    }

    .filters {
      display: flex;
      flex-wrap: wrap;
      gap: 0.3rem;
      margin-bottom: 2rem;
    }

    .tag-filter {
      font-family: inherit;
      font-size: 0.7rem;
      color: #888;
      background: #141414;
      border: 1px solid #222;
      padding: 0.25rem 0.6rem;
      border-radius: 3px;
      cursor: pointer;
      transition: color 0.15s, border-color 0.15s;
    }

    .tag-filter:hover { color: #e0e0e0; border-color: #333; }
    .tag-filter.active { color: #4a9eff; border-color: #4a9eff; }

    .feed { display: flex; flex-direction: column; gap: 1.5rem; }

    .entry {
      padding-bottom: 1.5rem;
      border-bottom: 1px solid #1a1a1a;
    }

    .entry:last-child { border-bottom: none; }
    .entry.hidden { display: none; }

    .entry-date {
      font-size: 0.75rem;
      color: #555;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 0.4rem;
    }

    .entry-title {
      color: #4a9eff;
      text-decoration: none;
      font-weight: 500;
      font-size: 1rem;
    }

    .entry-title:hover { text-decoration: underline; }

    .note {
      font-size: 0.85rem;
      color: #888;
      margin-top: 0.4rem;
    }

    .user-note {
      color: #a0a0a0;
      font-style: italic;
      padding-left: 0.6rem;
      border-left: 2px solid #222;
      margin-top: 0.5rem;
    }

    .insights {
      font-size: 0.82rem;
      color: #888;
      margin-top: 0.6rem;
      padding-left: 1.2rem;
    }

    .insights li { margin-bottom: 0.2rem; }

    .entry-meta {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.3rem;
      margin-top: 0.5rem;
    }

    .tag {
      display: inline-block;
      font-size: 0.7rem;
      color: #666;
      background: #141414;
      padding: 0.15rem 0.5rem;
      border-radius: 3px;
    }

    .audio-link {
      font-size: 0.75rem;
      color: #888;
      text-decoration: none;
      margin-left: auto;
      padding: 0.15rem 0.5rem;
      border: 1px solid #222;
      border-radius: 3px;
    }

    .audio-link:hover { color: #4a9eff; border-color: #4a9eff; }

    .see-more {
      display: inline-block;
      margin-top: 1.5rem;
      font-size: 0.8rem;
      color: #888;
      text-decoration: none;
      padding: 0.3rem 0.7rem;
      border: 1px solid #222;
      border-radius: 3px;
    }

    .see-more:hover { color: #4a9eff; border-color: #4a9eff; }

    footer {
      margin-top: 3rem;
      padding-top: 1rem;
      border-top: 1px solid #222;
      font-size: 0.75rem;
      color: #555;
    }
`;

const SCRIPT = `
  <script>
    (() => {
      const filters = document.querySelectorAll('.tag-filter');
      const entries = document.querySelectorAll('.entry');
      const active = new Set();

      function applyFilter() {
        entries.forEach(e => {
          const tags = (e.dataset.tags || '').split(' ').filter(Boolean);
          const show = active.size === 0 || [...active].every(t => tags.includes(t));
          e.classList.toggle('hidden', !show);
        });
      }

      filters.forEach(btn => {
        btn.addEventListener('click', () => {
          const tag = btn.dataset.tag;
          if (active.has(tag)) { active.delete(tag); btn.classList.remove('active'); }
          else { active.add(tag); btn.classList.add('active'); }
          applyFilter();
        });
      });
    })();
  </script>
`;

function renderLinklogPage(entries) {
  const allTags = [...new Set(entries.flatMap(e => e.tags || []))].sort();
  const tagFilters = allTags
    .map(t => `<button class="tag-filter" data-tag="${esc(t)}">${esc(t)}</button>`)
    .join('');
  const entriesHtml = entries.map(renderEntry).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>r-dh · linklog</title>
  <meta name="description" content="Things I found interesting.">
  <style>${STYLES}</style>
</head>
<body>
  <header>
    <h1>r-dh / linklog</h1>
    <p>Things I found interesting.</p>
  </header>

  ${allTags.length ? `<div class="filters">${tagFilters}</div>` : ''}

  <div class="feed">
    ${entriesHtml}
  </div>

  <footer>
    ${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}. <a href="https://r-dh.com" style="color:#555;">← home</a>
  </footer>
  ${SCRIPT}
</body>
</html>
`;
}

function renderHomePage(entries, services) {
  const recent = entries.slice(0, HOME_ENTRY_LIMIT);
  const entriesHtml = recent.map(renderEntry).join('\n');
  const more = entries.length > HOME_ENTRY_LIMIT
    ? `<a class="see-more" href="https://links.r-dh.com">see all ${entries.length} entries →</a>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>r-dh</title>
  <meta name="description" content="Tools and things I found interesting.">
  <style>${STYLES}</style>
</head>
<body>
  <header>
    <h1>r-dh</h1>
    <p>Tools and things I found interesting.</p>
  </header>

  ${renderServices(services)}

  <div class="section-label">Recent links</div>
  <div class="feed">
    ${entriesHtml}
  </div>
  ${more}
  ${SCRIPT}
</body>
</html>
`;
}

function main() {
  const entries = JSON.parse(fs.readFileSync(LINKS, 'utf8'));
  const services = fs.existsSync(SERVICES) ? JSON.parse(fs.readFileSync(SERVICES, 'utf8')) : [];

  entries.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  fs.mkdirSync(path.dirname(OUT_LINKS), { recursive: true });
  fs.mkdirSync(path.dirname(OUT_HOME), { recursive: true });

  fs.writeFileSync(OUT_LINKS, renderLinklogPage(entries));
  fs.writeFileSync(OUT_HOME, renderHomePage(entries, services));

  console.log(`Built linklog (${entries.length}) → ${path.relative(ROOT, OUT_LINKS)}`);
  console.log(`Built home (${services.length} services, ${Math.min(entries.length, HOME_ENTRY_LIMIT)} entries) → ${path.relative(ROOT, OUT_HOME)}`);
}

main();
