import { Navigate, Route, Routes } from 'react-router-dom'
import { LoginPage } from '@/features/auth/components/LoginPage'

export function Router() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
    </Routes>
  )
}
