// 샘플 데이터 — 플랫폼-레디 구조 (구현2에서 편집기가 이 구조를 그대로 생성/수정)
// 영상: 공개 CORS 허용 mp4 (Big Buck Bunny 10초 클립). 타이밍은 0~10초 안에서 설정.
// 수수료/회원명은 "회원 내부 관리용" 필드 — 시청자 화면에는 노출하지 않는다.

export const sampleData = {
  videoId: 'vid_sample',
  videoUrl:
    'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/720/Big_Buck_Bunny_720_10s_1MB.mp4',
  ownerMember: 'joytec',
  hotspots: [
    {
      id: 'hs_001',
      label: '빨간 가방',
      x: 50,
      y: 45,
      start: 1,
      end: 6,
      productUrl: 'https://joy.it.kr/',
      linkType: 'affiliate',
      description: '가을 신상 크로스백 (샘플 A)',
      commission: { type: 'percent', value: 10 },
      memberName: '홍길동',
      pauseOnClick: true,
      style: { size: 34, color: 'rgba(255,80,80,0.78)' },
    },
    {
      id: 'hs_002',
      label: '운동화',
      x: 27,
      y: 62,
      start: 3,
      end: 8,
      productUrl: 'https://joy.it.kr/',
      linkType: 'direct',
      description: '경량 러닝화 (샘플 B)',
      commission: { type: 'amount', value: 3000 },
      memberName: '김철수',
      pauseOnClick: true,
      style: { size: 34, color: 'rgba(80,150,255,0.78)' },
    },
    {
      id: 'hs_003',
      label: '모자',
      x: 72,
      y: 28,
      start: 5,
      end: 10,
      productUrl: 'https://joy.it.kr/',
      linkType: 'affiliate',
      description: '와이드 브림 햇 (샘플 C)',
      commission: { type: 'percent', value: 8 },
      memberName: '이영희',
      pauseOnClick: false,
      style: { size: 34, color: 'rgba(90,210,120,0.80)' },
    },
  ],
}
