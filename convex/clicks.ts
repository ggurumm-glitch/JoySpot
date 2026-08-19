import { query, mutation } from './_generated/server'
import { v } from 'convex/values'

function genClickId() {
  try {
    if (crypto?.randomUUID) return crypto.randomUUID()
  } catch {
    /* noop */
  }
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10)
}

// 클릭 기록 (익명 시청자·QR 모두 호출). 귀속 조작 방지를 위해
// 제품/몰/회원명 등 정산에 쓰이는 값은 클라이언트를 믿지 않고 서버가
// hotspotId+pid로 직접 조회해 채운다. clickId(subId)는 링크에 부착돼야 하므로
// 클라이언트가 넘긴 값을 쓰되 없으면 서버가 생성해 반환한다.
export const logClick = mutation({
  args: {
    hotspotId: v.id('hotspots'),
    pid: v.string(),
    clickId: v.optional(v.string()),
    source: v.optional(v.string()), // 'view' | 'qr'
    device: v.optional(v.string()),
    region: v.optional(v.string()),
  },
  handler: async (ctx, { hotspotId, pid, clickId, source, device, region }) => {
    const h = await ctx.db.get(hotspotId)
    if (!h) throw new Error('핫스팟을 찾을 수 없습니다')
    const prod = (h.products || []).find((p) => p.pid === pid)
    if (!prod) throw new Error('제품을 찾을 수 없습니다')

    const id = clickId || genClickId()
    await ctx.db.insert('clicks', {
      videoKey: h.videoKey,
      hotspotId,
      pid,
      productName: prod.name || '',
      productUrl: prod.url || '',
      mallMemberId: prod.mallMemberId ?? null,
      memberName: prod.memberName || '',
      clickId: id,
      source: source === 'qr' ? 'qr' : 'view',
      device: device || '기타',
      region: region || 'unknown',
    })
    return { clickId: id }
  },
})

// 영상별 클릭 집계 (총합 + 제품(pid)별)
export const statsByVideo = query({
  args: { videoKey: v.string() },
  handler: async (ctx, { videoKey }) => {
    const rows = await ctx.db
      .query('clicks')
      .withIndex('by_video', (q) => q.eq('videoKey', videoKey))
      .collect()
    const byPid = {}
    for (const r of rows) byPid[r.pid] = (byPid[r.pid] || 0) + 1
    return { total: rows.length, byPid }
  },
})
