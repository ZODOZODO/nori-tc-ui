import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

// TanStack Query 클라이언트 설정
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5분간 캐시 유지
      retry: 1,                  // 실패 시 1회 재시도
      // 창 포커스 전환 시 자동 refetch 비활성화
      // staleTime=0 쿼리가 많아 포커스마다 401이 발생하면 /login 리다이렉트로 선택 상태가 초기화됨
      refetchOnWindowFocus: false,
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