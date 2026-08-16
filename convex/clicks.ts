import { query, mutation } from './_generated/server'
import { v } from 'convex/values'

// 클릭 기록 (익명 시청자도 호출). clickId는 클라이언트가 생성해 링크에도 부착.
export const logClick = mutation({
  args: {
    videoKey: v.string(),
    hotspotId: v.optional(v.id('hotspots')),
    pid: v.string(),
    productName: v.string(),
    productUrl: v.string(),
    mallMemberId: v.optional(v.union(v.id('users'), v.null())),
    memberName: v.string(),
    clickId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert('clicks', args)
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
