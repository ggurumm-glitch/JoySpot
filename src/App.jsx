import { useEffect } from 'react'
import { Viewer } from './components/Viewer.jsx'
import { VideoList } from './components/VideoList.jsx'
import { Editor } from './components/Editor.jsx'
import { useStore, activeHotspotsAt, EMPTY_HOTSPOTS } from './store/useStore.js'
import { fetchVideoList, VIDEO_FOLDER } from './lib/videoList.js'

export default function App() {
  const videos = useStore((s) => s.videos)
  const videosLoaded = useStore((s) => s.videosLoaded)
  const setVideos = useStore((s) => s.setVideos)
  const mode = useStore((s) => s.mode)
  const setMode = useStore((s) => s.setMode)
  const selectedVideoUrl = useStore((s) => s.selectedVideoUrl)
  const hotspotsByVideo = useStore((s) => s.hotspotsByVideo)
  const currentTime = useStore((s) => s.currentTime)

  const hotspots = hotspotsByVideo[selectedVideoUrl] || EMPTY_HOTSPOTS
  const active = activeHotspotsAt(hotspots, currentTime)

  useEffect(() => {
    fetchVideoList().then(setVideos)
  }, [setVideos])

  const isEmpty = videosLoaded && videos.length === 0

  return (
    <div className="app">
      <header className="app-header">
        <div className="head-row">
          <h1>
            JoySpot <span className="badge">구현2 · 편집기</span>
          </h1>
          <div className="mode-toggle">
            <button
              className={mode === 'view' ? 'on' : ''}
              onClick={() => setMode('view')}
            >
              시청
            </button>
            <button
              className={mode === 'edit' ? 'on' : ''}
              onClick={() => setMode('edit')}
            >
              편집
            </button>
          </div>
        </div>
        <p className="sub">
          <code className="folder-path-inline">{VIDEO_FOLDER}</code> 폴더의 영상을 골라
          {mode === 'edit' ? ' 핫스팟을 드래그로 찍고 링크·설명·수수료·회원명을 입력하세요.' : ' 재생하고 핫스팟을 클릭하면 지정 링크로 이동합니다.'}
        </p>
      </header>

      {!videosLoaded ? (
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
