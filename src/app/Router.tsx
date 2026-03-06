import { Routes, Route, Navigate } from 'react-router-dom'
import { LoginPage } from '@/features/auth/components/LoginPage'

export function Router() {
  return (
    <Routes>
      {/* / 접근 시 /login 으로 리다이렉트 */}
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* 인증 라우트 */}
      <Route path="/login" element={<LoginPage />} />

      {/* 페이지 추가 시 여기에 Route 를 추가 */}
      <Route path="/dashboard" element={<div>대시보드</div>} />
    </Routes>
  )
}
