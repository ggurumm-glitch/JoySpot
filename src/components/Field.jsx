import { useState, useRef, useEffect } from 'react'

// 로컬 버퍼 입력: 타이핑은 로컬 상태로(한글 IME 정상), 포커스 아웃(blur) 시 저장.
// 서버(Convex) 값이 바뀌어도 편집 중이 아니면 동기화.
export function Field({ value, onCommit, number = false, textarea = false, className = 'fld-input', ...rest }) {
  const [local, setLocal] = useState(value ?? '')
  const focused = useRef(false)

  useEffect(() => {
    if (!focused.current) setLocal(value ?? '')
  }, [value])

  const commit = () => {
    focused.current = false
    const out = number ? Number(local) : local
    if (out !== value) onCommit(out)
  }

  const common = {
    value: local,
    className,
    onChange: (e) => setLocal(e.target.value),
    onFocus: () => {
      focused.current = true
    },
    onBlur: commit,
    ...rest,
  }

  if (textarea) return <textarea {...common} />
  return <input {...(number ? { type: 'number' } : {})} {...common} />
}
