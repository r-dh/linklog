# linklog

Static site powering [r-dh.com](https://r-dh.com) and [links.r-dh.com](https://links.r-dh.com).

A minimal linklog: forward a link, get a tagged entry. The build is a single zero-dep Node script that reads `links.json` + `services.json` and emits two static pages.

## Build

```bash
node build.js
```

Outputs:

- `dist/rdh/index.html` — homepage with tools + recent links (for r-dh.com)
- `dist/links/index.html` — full linklog with tag filtering (for links.r-dh.com)

## Schema

### links.json

```json
{
  "url": "https://...",
  "title": "...",
  "summary": "One or two sentences.",
  "tags": ["tag1", "tag2"],
  "date": "YYYY-MM-DD",
  "kind": "article | youtube",
  "note": "optional personal note",
  "insights": ["optional youtube insights"],
  "audio_url": "optional TTS output",
  "audio_mode": "full | summary"
}
```

### services.json

```json
{
  "name": "short-name",
  "url": "https://subdomain.r-dh.com",
  "description": "One-line description."
}
```

## Deploy

Static files from `dist/rdh/` go to `/var/www/rdh/`, `dist/links/` goes to `/var/www/links/` on the Lightsail VPS. Caddy serves both.
