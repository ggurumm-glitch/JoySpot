import { query, mutation } from './_generated/server'
import { v } from 'convex/values'

// 제품 라이브러리(재사용) 목록
export const list = query({
  args: {},
  handler: async (ctx) => ctx.db.query('catalog').order('desc').collect(),
})

// 라이브러리에 추가 (item = {name,url,image,description,price,linkType,commission,memberName})
export const add = mutation({
  args: { item: v.any() },
  handler: async (ctx, { item }) => {
    const { _id, _creationTime, cid, pid, ...clean } = item || {}
    // 같은 URL+이름 중복 방지
    const existing = await ctx.db.query('catalog').collect()
    if (existing.some((c) => c.url === clean.url && c.name === clean.name)) return null
    return await ctx.db.insert('catalog', clean)
  },
})

export const remove = mutation({
  args: { id: v.id('catalog') },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id)
  },
})
