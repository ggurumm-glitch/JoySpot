import { convexAuth } from '@convex-dev/auth/server'
import { Password } from '@convex-dev/auth/providers/Password'
import Google from '@auth/core/providers/google'
import Kakao from '@auth/core/providers/kakao'
import Naver from '@auth/core/providers/naver'
import Line from '@auth/core/providers/line'
import Facebook from '@auth/core/providers/facebook'
import GitHub from '@auth/core/providers/github'

// 이메일+비밀번호 + 구글 + 카카오 + 네이버 + 라인 + Meta + GitHub 로그인
export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password,
    Google({
      authorization: { params: { prompt: 'select_account' } },
    }),
    Kakao,
    Naver,
    Line,
    Facebook,
    GitHub,
  ],
})
