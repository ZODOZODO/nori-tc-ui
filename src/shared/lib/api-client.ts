import axios from 'axios'

/**
 * Spring Boot 백엔드와 통신하는 axios 인스턴스
 * - /api 로 시작하는 요청은 vite proxy 를 통해 localhost:8080 으로 전달
 * - 쿠키 기반 인증(HttpOnly Cookie) 사용을 위해 withCredentials 기본 활성화
 */
export const apiClient = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10_000,
})

// 응답 인터셉터 — 401 시 로그인 페이지로 이동
// NOTE: 이미 /login 에 있을 때 다시 리다이렉트하면 전체 페이지가 무한 reload됩니다.
//       만료 쿠키가 남아 있는 상태에서 CSRF 요청이 실패하는 경우가 대표적인 사례입니다.
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && window.location.pathname !== '/login') {
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)
