import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'

// public/videos 폴더의 영상을 목록/스트리밍으로 제공 + 제품정보 enrich API.
// 영상 서빙: 파일명을 base64url ID로 감싸 특수문자(#·공백·이모지)에 안전, HTTP range 지원.
// enrich: (1) 링크 OG 메타 추출 (키 불필요)  (2) Serper 검색 (SERPER_API_KEY 필요, 서버측 사용)

const VIDEO_DIR = path.resolve(import.meta.dirname, 'public/videos')
const VIDEO_EXT = /\.(mp4|webm|ogg|m4v|mov)$/i
const MIME = {
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.ogg': 'video/ogg',
  '.m4v': 'video/x-m4v',
  '.mov': 'video/quicktime',
}
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'

function listVideos() {
  try {
    return fs
      .readdirSync(VIDEO_DIR)
      .filter((f) => VIDEO_EXT.test(f))
      .sort((a, b) => a.localeCompare(b, 'ko'))
  } catch {
    return []
  }
}
const encodeId = (name) => Buffer.from(name, 'utf8').toString('base64url')
const decodeId = (id) => Buffer.from(id, 'base64url').toString('utf8')

function streamVideo(req, res, filePath) {
  let stat
  try {
    stat = fs.statSync(filePath)
  } catch {
    res.statusCode = 404
    return res.end('Not found')
  }
  const total = stat.size
  const type = MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream'
  const range = req.headers.range
  if (range) {
    const m = /bytes=(\d*)-(\d*)/.exec(range)
    let start = m && m[1] ? parseInt(m[1], 10) : 0
    let end = m && m[2] ? parseInt(m[2], 10) : total - 1
    if (Number.isNaN(start)) start = 0
    if (Number.isNaN(end) || end >= total) end = total - 1
    if (start > end || start >= total) {
      res.statusCode = 416
      res.setHeader('Content-Range', `bytes */${total}`)
      return res.end()
    }
    res.statusCode = 206
    res.setHeader('Content-Range', `bytes ${start}-${end}/${total}`)
    res.setHeader('Accept-Ranges', 'bytes')
    res.setHeader('Content-Length', end - start + 1)
    res.setHeader('Content-Type', type)
    fs.createReadStream(filePath, { start, end }).pipe(res)
  } else {
    res.statusCode = 200
    res.setHeader('Content-Length', total)
    res.setHeader('Accept-Ranges', 'bytes')
    res.setHeader('Content-Type', type)
    fs.createReadStream(filePath).pipe(res)
  }
}

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

// HTML에서 og:/twitter:/기본 메타 추출
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
      /* keep as-is */
    }
  }
  return {
    title: get(['og:title', 'twitter:title']) || decodeEntities(titleTag).trim(),
    image,
    description: get(['og:description', 'twitter:description', 'description']),
  }
}

const readJson = (res) => res.setHeader('Content-Type', 'application/json; charset=utf-8')
const query = (req, key) => {
  try {
    return new URL(req.url, 'http://x').searchParams.get(key)
  } catch {
    return null
  }
}

function joyspotApi(serperKey) {
  const setup = (server) => {
    // 영상 목록
    server.middlewares.use('/api/videos', (req, res) => {
      const list = listVideos().map((name) => ({ name, url: '/api/video/' + encodeId(name) }))
      readJson(res)
      res.end(JSON.stringify(list))
    })

    // 영상 스트리밍
    server.middlewares.use('/api/video', (req, res, next) => {
      const id = decodeURIComponent((req.url || '').replace(/^\//, '').split('?')[0])
      if (!id) return next()
      let name
      try {
        name = decodeId(id)
      } catch {
        res.statusCode = 400
        return res.end('Bad id')
      }
      if (!listVideos().includes(name)) {
        res.statusCode = 404
        return res.end('Not found')
      }
      streamVideo(req, res, path.join(VIDEO_DIR, name))
    })

    // enrich #1: 링크 OG 메타
    server.middlewares.use('/api/enrich', async (req, res) => {
      readJson(res)
      const url = query(req, 'url')
      if (!url) {
        res.statusCode = 400
        return res.end(JSON.stringify({ ok: false, error: 'url required' }))
      }
      try {
        const r = await fetch(url, {
          headers: {
            'User-Agent': UA,
            Accept:
              'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
          },
          signal: AbortSignal.timeout(8000),
          redirect: 'follow',
        })
        const html = await r.text()
        const meta = extractMeta(html, url)
        res.end(JSON.stringify({ ok: true, ...meta }))
      } catch (e) {
        res.end(JSON.stringify({ ok: false, error: String(e?.message || e) }))
      }
    })

    // enrich #2: Serper 검색
    server.middlewares.use('/api/serper', async (req, res) => {
      readJson(res)
      if (!serperKey) return res.end(JSON.stringify({ ok: false, configured: false }))
      const q = query(req, 'q')
      if (!q) {
        res.statusCode = 400
        return res.end(JSON.stringify({ ok: false, configured: true, error: 'q required' }))
      }
      try {
        const call = (endpoint) =>
          fetch('https://google.serper.dev/' + endpoint, {
            method: 'POST',
            headers: { 'X-API-KEY': serperKey, 'Content-Type': 'application/json' },
            body: JSON.stringify({ q, gl: 'kr', hl: 'ko', num: 6 }),
            signal: AbortSignal.timeout(10000),
          }).then((r) => r.json())

        // 검색결과(/search)와 이미지(/images)를 병렬 호출해 합침
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
        res.end(JSON.stringify({ ok: true, configured: true, results, images }))
      } catch (e) {
        res.end(JSON.stringify({ ok: false, configured: true, error: String(e?.message || e) }))
      }
    })
  }
  return {
    name: 'joyspot-api',
    configureServer: (s) => setup(s),
    configurePreviewServer: (s) => setup(s),
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '') // VITE_ 접두사 없는 서버 전용 키까지 로드
  return {
    plugins: [react(), joyspotApi(env.SERPER_API_KEY)],
    server: { host: true }, // 같은 네트워크 모바일 기기에서 실기기 터치 테스트 가능
  }
})
