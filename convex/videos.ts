import { query } from './_generated/server'
import { v } from 'convex/values'
import { getAuthUserId } from '@convex-dev/auth/server'

// 영상 소유자 + 현재 사용자의 편집 가능 여부
export const getForKey = query({
  args: { videoKey: v.string() },
  handler: async (ctx, { videoKey }) => {
    const userId = await getAuthUserId(ctx)
    const video = await ctx.db
      .query('videos')
      .withIndex('by_key', (q) => q.eq('videoKey', videoKey))
      .unique()

    let ownerName = null
    if (video) {
      const om = await ctx.db
        .query('members')
        .withIndex('by_user', (q) => q.eq('userId', video.uploaderId))
        .unique()
      ownerName = om?.displayName ?? null
    }

    let role = null
    if (userId) {
      const m = await ctx.db
        .query('members')
        .withIndex('by_user', (q) => q.eq('userId', userId))
        .unique()
      role = m?.role ?? null
    }

    const canEdit =
      role === 'operator' ||
      (!video && role === 'uploader') ||
      (!!video && !!userId && video.uploaderId === userId)

    return {
      owner: ownerName,
      ownerId: video?.uploaderId ?? null,
      claimed: !!video,
      canEdit: !!canEdit,
    }
  },
})
