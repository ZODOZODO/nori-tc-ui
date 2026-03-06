import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

// TanStack Query 클라이언트 설정
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5분간 캐시 유지
      retry: 1,                  // 실패 시 1회 재시도
    },
  },
})

interface AppProviderProps {
  children: React.ReactNode
}

export function AppProvider({ children }: AppProviderProps) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* 개발 환경에서만 쿼리 상태 확인 패널 표시 */}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}