import { useRef, useEffect, useState } from 'react'
import { useStore, EMPTY_HOTSPOTS } from '../store/useStore.js'
import { Hotspot } from './Hotspot.jsx'
import { EditableHotspot } from './EditableHotspot.jsx'

// 시청(뷰어) 화면: <video> + 오버레이 + 시간동기화된 핫스팟.
export function Viewer() {
  const videoRef = useRef(null)
  const wrapRef = useRef(null)

  const mode = useStore((s) => s.mode)
  const selectedVideoUrl = useStore((s) => s.selectedVideoUrl)
  const hotspotsByVideo = useStore((s) => s.hotspotsByVideo)
  const selectedHotspotId = useStore((s) => s.selectedHotspotId)
  const hotspots = hotspotsByVideo[selectedVideoUrl] || EMPTY_HOTSPOTS
  const currentTime = useStore((s) => s.currentTime)
  const setCurrentTime = useStore((s) => s.setCurrentTime)
  const setDuration = useStore((s) => s.setDuration)
  const setPaused = useStore((s) => s.setPaused)

  // 영상 로드 실패 표시 (무음 실패 방지)
  const [loadError, setLoadError] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  // 리사이즈/메타로드/전체화면 전환 시 핫스팟 위치 재계산을 위한 강제 리렌더 트리거
  const [, forceTick] = useState(0)
  useEffect(() => {
    const el = videoRef.current
    if (!el) return
    const ro = new ResizeObserver(() => forceTick((x) => x + 1))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // 전체화면 변화 감지 → 위치 재계산 + 버튼 라벨 갱신
  useEffect(() => {
    const onFs = () => {
      setIsFullscreen(!!document.fullscreenElement)
      forceTick((x) => x + 1)
    }
    document.addEventListener('fullscreenchange', onFs)
    return () => document.removeEventListener('fullscreenchange', onFs)
  }, [])

  // 핵심: 영상 요소가 아니라 "오버레이를 포함한 컨테이너"를 전체화면으로 만든다.
  // (영상만 전체화면하면 오버레이 핫스팟이 사라짐)
  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen?.()
    } else {
      wrapRef.current?.requestFullscreen?.()
    }
  }

  // 시청 모드: 현재 시간대(start~end)만 표시.
  // 편집 모드: 시간대 표시 + 선택된 핫스팟은 시간과 무관하게 항상 표시(위치 편집용).
  const active = hotspots.filter((h) => {
    const inTime = currentTime >= h.start && currentTime <= h.end
    return inTime || (mode === 'edit' && h.id === selectedHotspotId)
  })

  return (
    <div className={'video-wrap' + (isFullscreen ? ' is-fullscreen' : '')} ref={wrapRef}>
      <video
        ref={videoRef}
        key={selectedVideoUrl}
        src={selectedVideoUrl}
        controls
        controlsList="nofullscreen"
        playsInline
        preload="metadata"
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => {
          setDuration(e.currentTarget.duration)
          setLoadError(false)
          forceTick((x) => x + 1)
        }}
        onError={() => setLoadError(true)}
        onPlay={() => setPaused(false)}
        onPause={() => setPaused(true)}
      />

      {/* 자체 전체화면 버튼: 컨테이너를 전체화면 → 핫스팟이 함께 표시됨 */}
      <button
        type="button"
        className="fs-btn"
        onClick={toggleFullscreen}
        aria-label={isFullscreen ? '전체화면 종료' : '전체화면'}
        title={isFullscreen ? '전체화면 종료' : '전체화면'}
      >
        {isFullscreen ? '⤢ 창모드' : '⛶ 전체화면'}
      </button>

      {/* 오버레이는 pointer-events:none → 네이티브 컨트롤 클릭 통과, 핫스팟만 클릭 가능 */}
      <div className="overlay">
        {active.map((h) =>
          mode === 'edit' ? (
            <EditableHotspot key={h.id} hotspot={h} videoEl={videoRef.current} />
          ) : (
            <Hotspot key={h.id} hotspot={h} videoEl={videoRef.current} />
          ),
        )}
      </div>

      {loadError && (
        <div className="video-error">
          ⚠️ 영상을 불러오지 못했습니다. URL이 차단되었거나 네트워크 문제일 수 있습니다.
        </div>
      )}
    </div>
  )
}
