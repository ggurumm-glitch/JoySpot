import { action } from './_generated/server'
import { v } from 'convex/values'

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'

function decodeEntities(s) {
  return String(s)
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => {
      try {
        return String.fromCodePoint(+n)
      } catch {
        return ''
      }
    })
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => {
      try {
        return String.fromCodePoint(parseInt(h, 16))
      } catch {
        return ''
      }
    })
}

function extractMeta(html, baseUrl) {
  const metas = html.match(/<meta\b[^>]*>/gi) || []
  const get = (keys) => {
    for (const tag of metas) {
      const prop = (tag.match(/(?:property|name)\s*=\s*["']([^"']+)["']/i) || [])[1]
      if (prop && keys.includes(prop.toLowerCase())) {
        const content = (tag.match(/content\s*=\s*["']([^"']*)["']/i) || [])[1]
        if (content) return decodeEntities(content).trim()
      }
    }
    return ''
  }
  const titleTag = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || ''
  let image = get(['og:image', 'og:image:url', 'twitter:image', 'twitter:image:src'])
  if (image) {
    try {
      image = new URL(image, baseUrl).href
    } catch {
      /* keep */
    }
  }
  return {
    title: get(['og:title', 'twitter:title']) || decodeEntities(titleTag).trim(),
    image,
    description: get(['og:description', 'twitter:description', 'description']),
  }
}

// enrich #1: 링크 OG 메타 (Convex action에서 서버측 fetch)
export const enrichLink = action({
  args: { url: v.string() },
  handler: async (_ctx, { url }) => {
    let u
    try {
      u = new URL(url)
    } catch {
      return { ok: false, error: '유효하지 않은 URL' }
    }
    if (u.protocol !== 'http:' && u.protocol !== 'https:') {
      return { ok: false, error: 'http/https만 지원' }
    }
    try {
      const r = await fetch(url, {
        headers: {
          'User-Agent': UA,
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
        },
        redirect: 'follow',
      })
      const html = await r.text()
      return { ok: true, ...extractMeta(html, url) }
    } catch (e) {
      return { ok: false, error: String(e?.message || e) }
    }
  },
})

// enrich #2: Serper 검색 (키는 Convex env SERPER_API_KEY, 서버측)
export const serperSearch = action({
  args: { q: v.string() },
  handler: async (_ctx, { q }) => {
    const key = process.env.SERPER_API_KEY
    if (!key) return { ok: false, configured: false }
    try {
      const call = (endpoint) =>
        fetch('https://google.serper.dev/' + endpoint, {
          method: 'POST',
          headers: { 'X-API-KEY': key, 'Content-Type': 'application/json' },
          body: JSON.stringify({ q, gl: 'kr', hl: 'ko', num: 6 }),
        }).then((r) => r.json())
      const [data, imgData] = await Promise.all([call('search'), call('images').catch(() => ({}))])
      const results = (data.organic || []).slice(0, 6).map((o) => ({
        title: o.title,
        link: o.link,
        snippet: o.snippet || '',
      }))
      const images = (imgData.images || data.images || [])
        .slice(0, 8)
        .map((i) => i.imageUrl)
        .filter(Boolean)
      return { ok: true, configured: true, results, images }
    } catch (e) {
      return { ok: false, configured: true, error: String(e?.message || e) }
    }
  },
})
