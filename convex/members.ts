import { query } from './_generated/server'

// 등록된 쇼핑몰 관계자(mall) 목록 — 제품 매핑 드롭다운용
export const listMalls = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query('members').collect()
    return rows
      .filter((m) => m.role === 'mall')
      .map((m) => ({ userId: m.userId, displayName: m.displayName }))
  },
})
