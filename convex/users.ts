import { query, mutation } from './_generated/server'
import { v } from 'convex/values'
import { getAuthUserId } from '@convex-dev/auth/server'

// 현재 로그인 사용자 + 프로필(역할)
export const getMe = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return null
    const user = await ctx.db.get(userId)
    const member = await ctx.db
      .query('members')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .unique()
    return { userId, email: user?.email ?? null, member }
  },
})

// 첫 로그인 후 프로필(역할·표시이름) 설정/수정
export const upsertProfile = mutation({
  args: { role: v.string(), displayName: v.string() },
  handler: async (ctx, { role, displayName }) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error('로그인이 필요합니다')
    const existing = await ctx.db
      .query('members')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .unique()
    if (existing) {
      await ctx.db.patch(existing._id, { role, displayName })
      return existing._id
    }
    return await ctx.db.insert('members', { userId, role, displayName })
  },
})
