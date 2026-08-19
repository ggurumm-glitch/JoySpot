import { query, mutation, internalQuery } from './_generated/server'
import { v } from 'convex/values'
import { getAuthUserId } from '@convex-dev/auth/server'

// QR 리다이렉트용: 핫스팟+pid로 제품 정보 조회 (서버 내부 전용)
export const getProductInternal = internalQuery({
  args: { hotspotId: v.id('hotspots'), pid: v.string() },
  handler: async (ctx, { hotspotId, pid }) => {
    const h = await ctx.db.get(hotspotId)
    if (!h) return null
    const prod = (h.products || []).find((p) => p.pid === pid)
    if (!prod) return null
    return {
      url: prod.url,
      name: prod.name,
      mallMemberId: prod.mallMemberId ?? null,
      memberName: prod.memberName,
      videoKey: h.videoKey,
    }
  },
})

async function getRole(ctx, userId) {
  const m = await ctx.db
    .query('members')
    .withIndex('by_user', (q) => q.eq('userId', userId))
    .unique()
  return m?.role ?? null
}

// 편집 권한 검사. 운영자=전체, 미소유 영상=업로더가 클레임, 소유 영상=소유자만.
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

// 읽기 전용 편집권한 판단(클레임 같은 쓰기 없음). 쿼리에서 사용.
async function canEditVideoRO(ctx, userId, videoKey) {
  if (!userId) return false
  const role = await getRole(ctx, userId)
  if (role === 'operator') return true
  const video = await ctx.db
    .query('videos')
    .withIndex('by_key', (q) => q.eq('videoKey', videoKey))
    .unique()
  if (!video) return role === 'uploader' // 미소유 영상은 업로더가 편집 가능
  return video.uploaderId === userId
}

async function videoKeyOfHotspot(ctx, id) {
  const h = await ctx.db.get(id)
  if (!h) throw new Error('핫스팟을 찾을 수 없습니다')
  return { hotspot: h, videoKey: h.videoKey }
}

// 시청자에게 노출해도 되는 공개 필드만 남긴다(수수료·회원명·몰 참조 등 내부필드 제거).
function toPublic(h) {
  return {
    _id: h._id,
    videoKey: h.videoKey,
    label: h.label,
    x: h.x,
    y: h.y,
    start: h.start,
    end: h.end,
    pauseOnClick: h.pauseOnClick,
    style: h.style,
    products: (h.products || []).map((p) => ({
      pid: p.pid,
      name: p.name,
      url: p.url,
      image: p.image,
      description: p.description,
      price: p.price,
    })),
  }
}

// 편집앱용: 인증 필수. 편집권한자에겐 전체(내부필드 포함), 그 외 인증 사용자에겐 공개필드만.
export const listByVideo = query({
  args: { videoKey: v.string() },
  handler: async (ctx, { videoKey }) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return []
    const rows = await ctx.db
      .query('hotspots')
      .withIndex('by_video', (q) => q.eq('videoKey', videoKey))
      .collect()
    const canEdit = await canEditVideoRO(ctx, userId, videoKey)
    return canEdit ? rows : rows.map(toPublic)
  },
})

// 익명 공개 뷰어용: 인증 없이 호출, 공개 필드만 반환(내부필드 절대 노출 안 함).
export const listPublic = query({
  args: { videoKey: v.string() },
  handler: async (ctx, { videoKey }) => {
    const rows = await ctx.db
      .query('hotspots')
      .withIndex('by_video', (q) => q.eq('videoKey', videoKey))
      .collect()
    return rows.map(toPublic)
  },
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
