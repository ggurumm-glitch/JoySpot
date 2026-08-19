import { query, mutation } from './_generated/server'
import { v } from 'convex/values'
import { getAuthUserId } from '@convex-dev/auth/server'

// 운영자 권한을 가질 수 있는 지정 계정(조이텍). 이 목록에 없으면 operator 선택 불가.
const OPERATOR_EMAILS = new Set([
  'joytec@naver.com',
  'ggurumm@gmail.com',
  'sky4mania@gmail.com',
])
const VALID_ROLES = new Set(['operator', 'uploader', 'mall'])

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

// 첫 로그인 후 프로필(역할·표시이름) 설정/수정.
// 역할 자기승격 방지: operator는 지정 이메일만, 나머지는 uploader/mall만.
// 지정 이메일이면 무엇을 고르든 operator로 자동 승격.
export const upsertProfile = mutation({
  args: { role: v.string(), displayName: v.string() },
  handler: async (ctx, { role, displayName }) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error('로그인이 필요합니다')
    if (!VALID_ROLES.has(role)) throw new Error('유효하지 않은 역할입니다')

    const user = await ctx.db.get(userId)
    const email = (user?.email || '').toLowerCase()
    const isOperatorEmail = OPERATOR_EMAILS.has(email)

    let finalRole = role
    if (isOperatorEmail) {
      finalRole = 'operator' // 지정 계정은 항상 운영자
    } else if (role === 'operator') {
      throw new Error('운영자 권한은 지정된 조이텍 계정만 사용할 수 있습니다')
    }

    const existing = await ctx.db
      .query('members')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .unique()
    if (existing) {
      await ctx.db.patch(existing._id, { role: finalRole, displayName })
      return existing._id
    }
    return await ctx.db.insert('members', { userId, role: finalRole, displayName })
  },
})
