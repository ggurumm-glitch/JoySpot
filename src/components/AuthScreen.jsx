import { useState } from 'react'
import { useAuthActions } from '@convex-dev/auth/react'

// 이메일+비밀번호 로그인/회원가입
export function AuthScreen() {
  const { signIn } = useAuthActions()
  const [flow, setFlow] = useState('signIn') // 'signIn' | 'signUp'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await signIn('password', { email, password, flow })
    } catch {
      setError(
        flow === 'signUp'
          ? '가입 실패: 이미 사용 중인 이메일이거나 비밀번호가 너무 짧습니다(8자 이상).'
          : '로그인 실패: 이메일/비밀번호를 확인하세요.',
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <h1>
          JoySpot <span className="badge">쇼퍼블 영상</span>
        </h1>
        <p className="auth-sub">{flow === 'signIn' ? '로그인' : '회원가입'}</p>
        <form onSubmit={submit}>
          <input
            type="email"
            placeholder="이메일"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          <input
            type="password"
            placeholder="비밀번호 (8자 이상)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete={flow === 'signIn' ? 'current-password' : 'new-password'}
          />
          {error && <div className="auth-error">{error}</div>}
          <button className="btn primary" type="submit" disabled={busy}>
            {busy ? '처리 중…' : flow === 'signIn' ? '로그인' : '가입하기'}
          </button>
        </form>
        <button
          className="auth-switch"
          onClick={() => {
            setFlow(flow === 'signIn' ? 'signUp' : 'signIn')
            setError('')
          }}
        >
          {flow === 'signIn' ? '계정이 없으신가요? 회원가입' : '이미 계정이 있으신가요? 로그인'}
        </button>
        <p className="auth-note">구글 로그인은 곧 추가됩니다.</p>
      </div>
    </div>
  )
}
