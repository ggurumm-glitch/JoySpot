import { convexAuth } from '@convex-dev/auth/server'
import { Password } from '@convex-dev/auth/providers/Password'

// 이메일+비밀번호 로그인. (구글 OAuth는 사용자 클라이언트ID/시크릿 발급 후 추가)
export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Password],
})
