import { mutation } from './_generated/server'
import { v } from 'convex/values'
import { getAuthUserId } from '@convex-dev/auth/server'

async function requireOperator(ctx) {
  const userId = await getAuthUserId(ctx)
  if (!userId) throw new Error('로그인이 필요합니다')
  const member = await ctx.db
    .query('members')
    .withIndex('by_user', (q) => q.eq('userId', userId))
    .unique()
  if (member?.role !== 'operator') throw new Error('운영자만 제휴 리포트를 대사할 수 있습니다')
  return userId
}

// 제휴 리포트 대사: rows=[{subId, orderAmount, commissionAmount?}]
// 각 subId(=clickId)를 clicks에서 찾아 전환(conversion) 생성. 중복(clickId) 방지.
// 매출·수수료가 직접 걸리므로 운영자 전용.
export const importReport = mutation({
  args: {
    rows: v.array(
      v.object({
        subId: v.string(),
        orderAmount: v.number(),
        commissionAmount: v.optional(v.number()),
      }),
    ),
  },
  handler: async (ctx, { rows }) => {
    await requireOperator(ctx)

    let matched = 0
    let unmatched = 0
    let duplicate = 0
    for (const row of rows) {
      const click = await ctx.db
        .query('clicks')
        .withIndex('by_click', (q) => q.eq('clickId', row.subId))
        .first()
      if (!click) {
        unmatched++
        continue
      }
      const exists = await ctx.db
        .query('conversions')
        .withIndex('by_click', (q) => q.eq('clickId', row.subId))
        .first()
      if (exists) {
        duplicate++
        continue
      }
      await ctx.db.insert('conversions', {
        clickId: row.subId,
        orderAmount: row.orderAmount,
        commissionAmount: row.commissionAmount ?? 0,
        mallMemberId: click.mallMemberId ?? null,
        memberName: click.memberName ?? '',
        productName: click.productName ?? '',
        videoKey: click.videoKey,
      })
      matched++
    }
    return { matched, unmatched, duplicate }
  },
})
