/** POST /api/auth/login 요청 바디 */
export interface LoginRequest {
  userId: string
  password: string
}

/** POST /api/auth/login 성공 응답 (200) */
export interface LoginResponse {
  accessToken: string
  refreshToken: string
}

/** POST /api/auth/login 실패 응답 (401) */
export interface LoginErrorResponse {
  message: string
}
