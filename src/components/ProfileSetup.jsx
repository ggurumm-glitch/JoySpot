import { useState } from 'react'
import { useMutation } from 'convex/react'
import { useAuthActions } from '@convex-dev/auth/react'
import { api } from '../../convex/_generated/api'

// 첫 로그인 후 역할·표시이름 설정
export function ProfileSetup() {
  const upsert = useMutation(api.users.upsertProfile)
  const { signOut } = useAuthActions()
  const [role, setRole] = useState('uploader')
  const [displayName, setDisplayName] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      await upsert({ role, displayName: displayName.trim() || '회원' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <h1>프로필 설정</h1>
        <p className="auth-sub">역할과 표시 이름을 정해주세요</p>
        <form onSubmit={submit}>
          <label className="fld">
            <span>표시 이름</span>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="예: 조이텍 / 홍길동 상점"
            />
          </label>
          <label className="fld">
            <span>역할</span>
            <select value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="uploader">회원 업로더 (영상 등록·편집)</option>
              <option value="mall">쇼핑몰 관계자 (제품 매핑·실적)</option>
              <option value="operator">플랫폼 운영자 (조이텍)</option>
            </select>
          </label>
          <button className="btn primary" type="submit" disabled={busy}>
            {busy ? '저장 중…' : '시작하기'}
          </button>
        </form>
        <button className="auth-switch" onClick={() => signOut()}>
          로그아웃
        </button>
      </div>
    </div>
  )
}
