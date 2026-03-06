import axios from 'axios'

/**
 * Spring Boot 백엔드와 통신하는 axios 인스턴스
 * - /api 로 시작하는 요청은 vite proxy 를 통해 localhost:8080 으로 전달
 * - JWT 토큰 자동 삽입
 */
export const apiClient = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10_000,
})

// 요청 인터셉터 — JWT 토큰 자동 삽입
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// 응답 인터셉터 — 401 시 로그인 페이지로 이동
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)