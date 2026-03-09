import { Navigate, Route, Routes } from 'react-router-dom'
import { LoginPage } from '@/features/auth/components/LoginPage'
import { EqpPage } from '@/features/eqp/components/EqpPage'

export function Router() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/eqp" element={<EqpPage />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}
