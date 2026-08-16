import { query } from './_generated/server'

// 연결 확인용 최소 쿼리
export const get = query({
  args: {},
  handler: async () => ({ ok: true, service: 'joyspot', at: Date.now() }),
})
