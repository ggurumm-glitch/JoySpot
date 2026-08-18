import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'

// public/videos 폴더의 영상을 목록/스트리밍으로 제공(개발용).
// 파일명을 base64url ID로 감싸 특수문자(#·공백·이모지)에 안전, HTTP range 지원.
// (enrich/serper는 Convex action으로 이전됨: convex/enrich.ts)

const VIDEO_DIR = path.resolve(import.meta.dirname, 'public/videos')
const VIDEO_EXT = /\.(mp4|webm|ogg|m4v|mov)$/i
const MIME = {
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.ogg': 'video/ogg',
  '.m4v': 'video/x-m4v',
  '.mov': 'video/quicktime',
}

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

function videoApi() {
  const setup = (server) => {
    // 영상 목록
    server.middlewares.use('/api/videos', (req, res) => {
      const list = listVideos().map((name) => ({ name, url: '/api/video/' + encodeId(name) }))
      res.setHeader('Content-Type', 'application/json; charset=utf-8')
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
  }
  return {
    name: 'joyspot-video-api',
    configureServer: (s) => setup(s),
    configurePreviewServer: (s) => setup(s),
  }
}

export default defineConfig({
  plugins: [react(), videoApi()],
  server: { host: true }, // 같은 네트워크 모바일 기기에서 실기기 터치 테스트 가능
})
