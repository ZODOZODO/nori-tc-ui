import { apiClient } from '@/shared/lib/api-client'
import type { LoginRequest, LoginResponse } from '../types/auth.types'

export const authApi = {
  /**
   * 로그인 API 호출
   * POST /api/auth/login
   */
  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    const response = await apiClient.post<LoginResponse>('/auth/login', credentials)
    return response.data
  },
}
