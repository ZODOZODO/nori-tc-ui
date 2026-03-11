import { useQuery } from '@tanstack/react-query'
import { eqpApi } from '../api/eqp.api'

/**
 * EQP 목록 조회 훅입니다.
 * 요구사항에 맞춰 offset=0, limit=500으로 전체 목록을 가져옵니다.
 */
export function useEqpList() {
  return useQuery({
    queryKey: ['eqp', 'list'],
    queryFn: () => eqpApi.getEqpList(0, 500),
    // 다른 사용자의 EQP 추가/수정 반영을 위해 60초로 단축 (기존 5분)
    staleTime: 60_000,
  })
}
