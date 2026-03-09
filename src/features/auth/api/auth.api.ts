import { isAxiosError } from 'axios'
import { apiClient } from '@/shared/lib/api-client'
import {
  AuthApiError,
  createLoginFailResponse,
  isLoginSuccessResponse,
  type LoginRequest,
  type LoginResponse,
  type LoginSuccessResponse,
} from '../types/auth.types'

const CSRF_COOKIE_NAME = 'XSRF-TOKEN'
const CSRF_HEADER_NAME = 'X-XSRF-TOKEN'

/**
 * document.cookie에서 쿠키 값을 읽어 옵니다.
 */
const getCookieValue = (name: string): string | null => {
  if (typeof document === 'undefined' || !document.cookie) {
    return null
  }

  const encodedName = `${encodeURIComponent(name)}=`
  const targetCookie = document.cookie
    .split('; ')
    .find((cookieEntry) => cookieEntry.startsWith(encodedName))

  if (!targetCookie) {
    return null
  }

  return decodeURIComponent(targetCookie.substring(encodedName.length))
}

/**
 * 로그인 전 CSRF 쿠키를 발급받고, 헤더에 사용할 토큰 값을 반환합니다.
 */
const issueCsrfToken = async (): Promise<string> => {
  await apiClient.get('/auth/csrf', {
    withCredentials: true,
  })

  const csrfToken = getCookieValue(CSRF_COOKIE_NAME)

  if (!csrfToken) {
    throw new AuthApiError(
      createLoginFailResponse({
        success: false,
        data: null,
        errorCode: 'CSRF_TOKEN_MISSING',
        errorMsg: 'CSRF 토큰을 확인할 수 없습니다. 페이지를 새로고침한 뒤 다시 시도해 주세요.',
      })
    )
  }

  return csrfToken
}

/**
 * 알 수 없는 예외를 AuthApiError로 정규화합니다.
 */
const normalizeAuthError = (error: unknown): AuthApiError => {
  if (error instanceof AuthApiError) {
    return error
  }

  if (isAxiosError(error)) {
    return new AuthApiError(createLoginFailResponse(error.response?.data), error.response?.status)
  }

  return new AuthApiError(createLoginFailResponse(error))
}

export const authApi = {
  /**
   * 로그인 요청에서 사용할 CSRF 토큰을 미리 확보합니다.
   * 이후 다른 상태 변경 API(POST/PUT/PATCH/DELETE)에서도 같은 규칙으로 재사용할 수 있습니다.
   */
  prepareCsrfToken: issueCsrfToken,

  /**
   * 로그인 API를 호출합니다.
   * - GET /api/auth/csrf 선호출
   * - POST /api/auth/login 호출 시 withCredentials + X-XSRF-TOKEN 헤더 포함
   * - token 본문 의존 없이 쿠키 기반 인증만 사용
   */
  login: async (credentials: LoginRequest): Promise<LoginSuccessResponse> => {
    const csrfToken = await issueCsrfToken()

    try {
      const response = await apiClient.post<LoginResponse>('/auth/login', credentials, {
        withCredentials: true,
        headers: {
          [CSRF_HEADER_NAME]: csrfToken,
        },
        // 로그인 실패(400/401)는 폼 하단에 서버 메시지를 노출해야 하므로
        // axios 전역 401 인터셉터 리다이렉트를 우회하기 위해 정상 응답으로 처리합니다.
        validateStatus: (status) => status >= 200 && status < 500,
      })

      const parsedResponse = response.data

      if (isLoginSuccessResponse(parsedResponse)) {
        console.info('[authApi] login success', {
          userPk: parsedResponse.data.userPk,
        })
        return parsedResponse
      }

      throw new AuthApiError(createLoginFailResponse(parsedResponse), response.status)
    } catch (error) {
      const normalizedError = normalizeAuthError(error)
      console.warn('[authApi] login failed', {
        status: normalizedError.status,
        errorCode: normalizedError.payload.errorCode,
      })
      throw normalizedError
    }
  },
}
