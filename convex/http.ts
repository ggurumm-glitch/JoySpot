import { httpRouter } from 'convex/server'
import { httpAction } from './_generated/server'
import { api, internal } from './_generated/api'
import { auth } from './auth'

function deviceOf(ua) {
  const u = (ua || '').toLowerCase()
  if (/iphone|ipad|ipod/.test(u)) return 'iOS'
  if (/android/.test(u)) return 'Android'
  if (/windows/.test(u)) return 'Windows'
  if (/macintosh|mac os/.test(u)) return 'Mac'
  if (/linux/.test(u)) return 'Linux'
  return '기타'
}

const http = httpRouter()
auth.addHttpRoutes(http)

// QR 제품 직행 리다이렉트: /r?h=<hotspotId>&p=<pid>
// 스캔마다 clickId 생성 → 클릭 로그(source=qr) → 제품 URL로 subId 붙여 302 이동
http.route({
  path: '/r',
  method: 'GET',
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url)
    const h = url.searchParams.get('h')
    const p = url.searchParams.get('p')
    if (!h || !p) return new Response('bad request', { status: 400 })

    let prod = null
    try {
      prod = await ctx.runQuery(internal.hotspots.getProductInternal, { hotspotId: h, pid: p })
    } catch {
      prod = null
    }
    if (!prod || !prod.url) {
      return new Response('상품을 찾을 수 없습니다.', { status: 404 })
    }

    let clickId
    try {
      clickId = crypto.randomUUID()
    } catch {
      clickId = Date.now().toString(36) + Math.random().toString(36).slice(2, 10)
    }

    const region =
      request.headers.get('cf-ipcountry') ||
      request.headers.get('x-vercel-ip-country') ||
      request.headers.get('x-country') ||
      'unknown'
    try {
      await ctx.runMutation(api.clicks.logClick, {
        hotspotId: h,
        pid: p,
        clickId,
        source: 'qr',
        device: deviceOf(request.headers.get('user-agent') || ''),
        region,
      })
    } catch {
      /* 로깅 실패해도 이동은 진행 */
    }

    const target = prod.url + (prod.url.includes('?') ? '&' : '?') + 'subId=' + encodeURIComponent(clickId)
    return new Response(null, { status: 302, headers: { Location: target } })
  }),
})

export default http
