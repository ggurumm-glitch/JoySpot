import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'
import { authTables } from '@convex-dev/auth/server'

// 핫스팟 안에 들어가는 제품(다중 링크)
const product = v.object({
  pid: v.string(),
  name: v.string(),
  url: v.string(),
  image: v.string(),
  description: v.string(),
  price: v.string(),
  linkType: v.string(),
  commission: v.object({ type: v.string(), value: v.number() }),
  memberName: v.string(), // 표시용(쇼핑몰 관계자 displayName 비정규화)
  // 제품(Tab) 당 쇼핑몰 관계자 참조 (선택)
  mallMemberId: v.optional(v.union(v.id('users'), v.null())),
})

export default defineSchema({
  // Convex Auth 기본 테이블(users, authAccounts, authSessions 등)
  ...authTables,

  // 회원 프로필/역할 (users 1:1)
  members: defineTable({
    userId: v.id('users'),
    role: v.string(), // 'operator' | 'uploader' | 'mall'
    displayName: v.string(),
  }).index('by_user', ['userId']),

  // 영상 소유(업로더). videoKey 단위로 업로더 1명.
  videos: defineTable({
    videoKey: v.string(),
    uploaderId: v.id('users'),
    title: v.string(),
  }).index('by_key', ['videoKey']),

  hotspots: defineTable({
    videoKey: v.string(),
    label: v.string(),
    x: v.number(),
    y: v.number(),
    start: v.number(),
    end: v.number(),
    pauseOnClick: v.boolean(),
    style: v.object({ size: v.number(), color: v.string() }),
    products: v.array(product),
  }).index('by_video', ['videoKey']),

  catalog: defineTable({
    name: v.string(),
    url: v.string(),
    image: v.string(),
    description: v.string(),
    price: v.string(),
    linkType: v.string(),
    commission: v.object({ type: v.string(), value: v.number() }),
    memberName: v.string(),
  }),

  // 클릭 이벤트 (시청자 익명). 구매 대사용 clickId(subId) 포함.
  clicks: defineTable({
    videoKey: v.string(),
    hotspotId: v.optional(v.id('hotspots')),
    pid: v.string(),
    productName: v.string(),
    productUrl: v.string(),
    mallMemberId: v.optional(v.union(v.id('users'), v.null())),
    memberName: v.string(),
    clickId: v.string(), // 제휴 네트워크 리포트와 대사할 고유 추적 id
    source: v.optional(v.string()), // 'view'(영상클릭) | 'qr'(QR 스캔)
    device: v.optional(v.string()), // iOS/Android/Windows/Mac/…
    region: v.optional(v.string()), // 시청=타임존(Asia/Seoul), QR=국가코드(가능시)
  })
    .index('by_video', ['videoKey'])
    .index('by_click', ['clickId']),

  // 구매 전환 (제휴 리포트를 subId=clickId로 대사해 생성)
  conversions: defineTable({
    clickId: v.string(),
    orderAmount: v.number(),
    commissionAmount: v.number(),
    mallMemberId: v.optional(v.union(v.id('users'), v.null())),
    memberName: v.string(),
    productName: v.string(),
    videoKey: v.string(),
  })
    .index('by_click', ['clickId'])
    .index('by_video', ['videoKey']),
})
