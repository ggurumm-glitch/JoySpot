import { query } from './_generated/server'
import { getAuthUserId } from '@convex-dev/auth/server'

// 역할별 실적: 운영자=전체 / 업로더=내 영상 / mall=내 제품
export const dashboard = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return null
    const member = await ctx.db
      .query('members')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .unique()
    const role = member?.role ?? 'uploader'

    let clicks = await ctx.db.query('clicks').collect()
    let conversions = await ctx.db.query('conversions').collect()

    if (role === 'uploader') {
      const videos = await ctx.db.query('videos').collect()
      const myKeys = new Set(videos.filter((v) => v.uploaderId === userId).map((v) => v.videoKey))
      clicks = clicks.filter((c) => myKeys.has(c.videoKey))
      conversions = conversions.filter((c) => myKeys.has(c.videoKey))
    } else if (role === 'mall') {
      clicks = clicks.filter((c) => c.mallMemberId === userId)
      conversions = conversions.filter((c) => c.mallMemberId === userId)
    }

    const byProduct = {}
    const byMall = {}
    const bySource = { view: 0, qr: 0 }
    const byDevice = {}
    const byRegion = {}
    const byHour = new Array(24).fill(0)
    for (const c of clicks) {
      byProduct[c.productName || '(제목 없음)'] = (byProduct[c.productName || '(제목 없음)'] || 0) + 1
      byMall[c.memberName || '(미지정)'] = (byMall[c.memberName || '(미지정)'] || 0) + 1
      bySource[c.source === 'qr' ? 'qr' : 'view'] += 1
      byDevice[c.device || '기타'] = (byDevice[c.device || '기타'] || 0) + 1
      byRegion[c.region || 'unknown'] = (byRegion[c.region || 'unknown'] || 0) + 1
      const kst = (c._creationTime || 0) + 9 * 3600 * 1000
      byHour[Math.floor(kst / 3600000) % 24] += 1
    }
    const sorted = (obj) =>
      Object.entries(obj)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)

    const recent = [...clicks]
      .sort((a, b) => b._creationTime - a._creationTime)
      .slice(0, 15)
      .map((c) => ({ productName: c.productName, memberName: c.memberName, ts: c._creationTime }))

    // 전환/정산 집계
    const totalSales = conversions.reduce((s, c) => s + (c.orderAmount || 0), 0)
    const totalCommission = conversions.reduce((s, c) => s + (c.commissionAmount || 0), 0)
    const commByMall = {}
    for (const c of conversions) {
      const k = c.memberName || '(미지정)'
      commByMall[k] = (commByMall[k] || 0) + (c.commissionAmount || 0)
    }
    const convRate = clicks.length ? Math.round((conversions.length / clicks.length) * 1000) / 10 : 0

    return {
      role,
      total: clicks.length,
      byProduct: sorted(byProduct),
      byMall: sorted(byMall),
      recent,
      source: bySource,
      device: sorted(byDevice),
      region: sorted(byRegion),
      hour: byHour,
      conv: {
        count: conversions.length,
        totalSales,
        totalCommission,
        convRate,
        byMall: Object.entries(commByMall)
          .map(([name, commission]) => ({ name, commission }))
          .sort((a, b) => b.commission - a.commission),
      },
    }
  },
})
