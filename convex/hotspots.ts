import { query, mutation } from './_generated/server'
import { v } from 'convex/values'
import { getAuthUserId } from '@convex-dev/auth/server'

async function getRole(ctx, userId) {
  const m = await ctx.db
    .query('members')
    .withIndex('by_user', (q) => q.eq('userId', userId))
    .unique()
  return m?.role ?? null
}

// 영상 편집 권한 검사. 운영자=전체, 미소유 영상=업로더가 클레임, 소유 영상=소유자만.
async function assertCanEditVideo(ctx, videoKey) {
  const userId = await getAuthUserId(ctx)
  if (!userId) throw new Error('로그인이 필요합니다')
  const role = await getRole(ctx, userId)
  if (role === 'operator') return userId
  const video = await ctx.db
    .query('videos')
    .withIndex('by_key', (q) => q.eq('videoKey', videoKey))
    .unique()
  if (!video) {
    if (role !== 'uploader') throw new Error('영상 편집 권한이 없습니다(업로더 전용)')
    await ctx.db.insert('videos', { videoKey, uploaderId: userId, title: videoKey })
    return userId
  }
  if (video.uploaderId !== userId) throw new Error('다른 업로더가 소유한 영상입니다')
  return userId
}

async function videoKeyOfHotspot(ctx, id) {
  const h = await ctx.db.get(id)
  if (!h) throw new Error('핫스팟을 찾을 수 없습니다')
  return { hotspot: h, videoKey: h.videoKey }
}

export const listByVideo = query({
  args: { videoKey: v.string() },
  handler: async (ctx, { videoKey }) =>
    ctx.db
      .query('hotspots')
      .withIndex('by_video', (q) => q.eq('videoKey', videoKey))
      .collect(),
})

export const create = mutation({
  args: { videoKey: v.string(), hotspot: v.any() },
  handler: async (ctx, { videoKey, hotspot }) => {
    await assertCanEditVideo(ctx, videoKey)
    const { _id, _creationTime, id, videoKey: _vk, ...clean } = hotspot || {}
    return await ctx.db.insert('hotspots', { videoKey, ...clean })
  },
})

export const update = mutation({
  args: { id: v.id('hotspots'), patch: v.any() },
  handler: async (ctx, { id, patch }) => {
    const { videoKey } = await videoKeyOfHotspot(ctx, id)
    await assertCanEditVideo(ctx, videoKey)
    const { _id, _creationTime, videoKey: _vk, ...clean } = patch || {}
    await ctx.db.patch(id, clean)
  },
})

export const remove = mutation({
  args: { id: v.id('hotspots') },
  handler: async (ctx, { id }) => {
    const { videoKey } = await videoKeyOfHotspot(ctx, id)
    await assertCanEditVideo(ctx, videoKey)
    await ctx.db.delete(id)
  },
})

export const addProduct = mutation({
  args: { id: v.id('hotspots'), product: v.any() },
  handler: async (ctx, { id, product }) => {
    const { hotspot, videoKey } = await videoKeyOfHotspot(ctx, id)
    await assertCanEditVideo(ctx, videoKey)
    await ctx.db.patch(id, { products: [...(hotspot.products || []), product] })
  },
})

export const updateProduct = mutation({
  args: { id: v.id('hotspots'), pid: v.string(), patch: v.any() },
  handler: async (ctx, { id, pid, patch }) => {
    const { hotspot, videoKey } = await videoKeyOfHotspot(ctx, id)
    await assertCanEditVideo(ctx, videoKey)
    await ctx.db.patch(id, {
      products: (hotspot.products || []).map((p) => (p.pid === pid ? { ...p, ...patch } : p)),
    })
  },
})

export const removeProduct = mutation({
  args: { id: v.id('hotspots'), pid: v.string() },
  handler: async (ctx, { id, pid }) => {
    const { hotspot, videoKey } = await videoKeyOfHotspot(ctx, id)
    await assertCanEditVideo(ctx, videoKey)
    await ctx.db.patch(id, { products: (hotspot.products || []).filter((p) => p.pid !== pid) })
  },
})
