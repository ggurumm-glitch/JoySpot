import { useEffect, useState } from 'react'
import { useQuery, Authenticated, Unauthenticated, AuthLoading } from 'convex/react'
import { useAuthActions } from '@convex-dev/auth/react'
import { api } from '../convex/_generated/api'
import { Viewer } from './components/Viewer.jsx'
import { VideoList } from './components/VideoList.jsx'
import { Editor } from './components/Editor.jsx'
import { AuthScreen } from './components/AuthScreen.jsx'
import { ProfileSetup } from './components/ProfileSetup.jsx'
import { PublicViewer } from './components/PublicViewer.jsx'
import { Dashboard } from './components/Dashboard.jsx'
import { useStore, activeHotspotsAt, EMPTY_HOTSPOTS } from './store/useStore.js'
import { fetchVideoList, VIDEO_FOLDER } from './lib/videoList.js'

const ROLE_LABEL = {
  operator: '운영자',
  uploader: '업로더',
  mall: '쇼핑몰 관계자',
}

export default function App() {
  const params = new URLSearchParams(window.location.search)
  const watch = params.get('watch')
  const wantLogin = params.get('login') === '1'

  // 공유 링크(?watch=)는 로그인 없이 바로 시청
  if (watch) return <PublicViewer videoKey={watch} />

  return (
    <>
      <AuthLoading>
        <div className="empty-state">
          <div className="empty-icon">⏳</div>
          <p>불러오는 중…</p>
        </div>
      </AuthLoading>
      <Unauthenticated>
        {/* 익명: 기본은 공개 뷰어, "제작자 로그인"을 누르면(?login=1) 로그인 화면 */}
        {wantLogin ? <AuthScreen /> : <PublicViewer />}
      </Unauthenticated>
      <Authenticated>
        <AuthedApp />
      </Authenticated>
    </>
  )
}

function AuthedApp() {
  const me = useQuery(api.users.getMe)
  if (me === undefined) {
    return (
      <div className="empty-state">
        <div className="empty-icon">⏳</div>
        <p>프로필 확인 중…</p>
      </div>
    )
  }
  if (!me?.member) return <ProfileSetup />
  return <MainApp me={me} />
}

function MainApp({ me }) {
  const { signOut } = useAuthActions()
  const [showStats, setShowStats] = useState(false)
  const videos = useStore((s) => s.videos)
  const videosLoaded = useStore((s) => s.videosLoaded)
  const setVideos = useStore((s) => s.setVideos)
  const mode = useStore((s) => s.mode)
  const setMode = useStore((s) => s.setMode)
  const selectedVideoUrl = useStore((s) => s.selectedVideoUrl)
  const currentTime = useStore((s) => s.currentTime)

  const hotspots =
    useQuery(api.hotspots.listByVideo, selectedVideoUrl ? { videoKey: selectedVideoUrl } : 'skip') ??
    EMPTY_HOTSPOTS
  const active = activeHotspotsAt(hotspots, currentTime)

  const videoMeta = useQuery(
    api.videos.getForKey,
    selectedVideoUrl ? { videoKey: selectedVideoUrl } : 'skip',
  )
  const canEdit = videoMeta ? videoMeta.canEdit : true

  const shareLink = () => {
    if (!selectedVideoUrl) return
    const url = `${window.location.origin}${window.location.pathname}?watch=${encodeURIComponent(selectedVideoUrl)}`
    if (navigator.clipboard) navigator.clipboard.writeText(url)
    alert('시청 공유 링크가 복사되었습니다(로그인 없이 시청 가능):\n' + url)
  }

  useEffect(() => {
    fetchVideoList().then(setVideos)
  }, [setVideos])

  // 편집 권한 없는 영상은 자동으로 시청 모드로
  useEffect(() => {
    if (videoMeta && !videoMeta.canEdit && mode === 'edit') setMode('view')
  }, [videoMeta, mode, setMode])

  const isEmpty = videosLoaded && videos.length === 0

  return (
    <div className="app">
      <header className="app-header">
        <div className="head-row">
          <h1>
            JoySpot <span className="badge">2차 · 플랫폼</span>
          </h1>
          <div className="head-actions">
            <button className={'btn' + (showStats ? ' primary' : '')} onClick={() => setShowStats((v) => !v)}>
              📊 실적
            </button>
            <button className="btn" onClick={shareLink} disabled={!selectedVideoUrl} title="시청 공유 링크 복사">
              🔗 공유
            </button>
            <div className="mode-toggle">
              <button className={mode === 'view' ? 'on' : ''} onClick={() => setMode('view')}>
                시청
              </button>
              <button
                className={mode === 'edit' ? 'on' : ''}
                onClick={() => canEdit && setMode('edit')}
                disabled={!canEdit}
                title={canEdit ? '' : '이 영상은 편집 권한이 없습니다'}
              >
                편집
              </button>
            </div>
            <div className="user-chip">
              <span className="user-name">{me.member.displayName}</span>
              <span className="user-role">{ROLE_LABEL[me.member.role] || me.member.role}</span>
              <button className="logout" onClick={() => signOut()} title="로그아웃">
                로그아웃
              </button>
            </div>
          </div>
        </div>
        <p className="sub">
          <code className="folder-path-inline">{VIDEO_FOLDER}</code> 폴더의 영상을 골라
          {mode === 'edit'
            ? ' 핫스팟을 드래그로 찍고 제품·링크를 입력하세요.'
            : ' 재생하고 핫스팟을 클릭하면 지정 링크로 이동합니다.'}
        </p>
        {videoMeta && selectedVideoUrl && (
          <p className="owner-line">
            영상 소유자: <b>{videoMeta.owner || (videoMeta.claimed ? '알 수 없음' : '미지정(편집 시 내 소유)')}</b>
            {!canEdit && <span className="ro-badge">읽기 전용</span>}
          </p>
        )}
      </header>

      {showStats ? (
        <Dashboard onClose={() => setShowStats(false)} />
      ) : !videosLoaded ? (
        <div className="empty-state">
          <div className="empty-icon">⏳</div>
          <p>영상 목록을 불러오는 중…</p>
        </div>
      ) : isEmpty ? (
        <div className="empty-state">
          <div className="empty-icon">📁</div>
          <h2>영상 폴더가 비어 있습니다</h2>
          <p>아래 폴더에 영상 파일(mp4 등)을 넣은 뒤, 이 페이지를 새로고침(F5) 하세요.</p>
          <code className="folder-path">{VIDEO_FOLDER}</code>
          <p className="empty-hint">지원 형식: mp4(권장) · webm · ogg · m4v · mov</p>
        </div>
      ) : (
        <div className="layout">
          <VideoList />
          <div className="main">
            <Viewer />
            <footer className="hud">
              <span>재생시간 {currentTime.toFixed(1)}s</span>
              <span className="dot-sep">·</span>
              <span>핫스팟 {hotspots.length}개</span>
              <span className="dot-sep">·</span>
              <span>표시중 {active.length}개</span>
              {mode === 'edit' && <span className="mode-hint"> · 편집 모드: 점을 드래그해 위치를 잡으세요</span>}
            </footer>
            {mode === 'edit' && <Editor />}
          </div>
        </div>
      )}
    </div>
  )
}
