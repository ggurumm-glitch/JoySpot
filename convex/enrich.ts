import { action } from './_generated/server'
import { v } from 'convex/values'
import { getAuthUserId } from '@convex-dev/auth/server'

// 로그인 사용자만 enrich 사용(익명 호출로 서버 리소스·Serper 유료 크레딧 소진 방지)
async function requireAuth(ctx) {
  const userId = await getAuthUserId(ctx)
  if (!userId) throw new Error('로그인이 필요합니다')
  return userId
}

// SSRF 방지: 사설/로컬/링크로컬 IP·내부 호스트로의 fetch 차단
function isBlockedHost(hostname) {
  const h = (hostname || '').toLowerCase()
  if (h === 'localhost' || h === '::1' || h.endsWith('.local') || h.endsWith('.internal')) return true
  const m = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
  if (m) {
    const [a, b] = [Number(m[1]), Number(m[2])]
    if (a === 127 || a === 10 || a === 0) return true
    if (a === 169 && b === 254) return true // 링크로컬(클라우드 메타데이터 169.254.169.254 포함)
    if (a === 172 && b >= 16 && b <= 31) return true
    if (a === 192 && b === 168) return true
  }
  return false
}

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
  handler: async (ctx, { url }) => {
    await requireAuth(ctx)
    let u
    try {
      u = new URL(url)
    } catch {
      return { ok: false, error: '유효하지 않은 URL' }
    }
    if (u.protocol !== 'http:' && u.protocol !== 'https:') {
      return { ok: false, error: 'http/https만 지원' }
    }
    if (isBlockedHost(u.hostname)) {
      return { ok: false, error: '허용되지 않은 주소' }
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
  handler: async (ctx, { q }) => {
    await requireAuth(ctx)
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
