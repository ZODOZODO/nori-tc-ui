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
  })
}
