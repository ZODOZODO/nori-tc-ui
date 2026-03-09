import { useQuery } from '@tanstack/react-query'
import { eqpApi } from '../api/eqp.api'

/**
 * 선택된 EQP 상세 조회 훅입니다.
 * eqpId가 없으면 API 호출을 하지 않습니다.
 */
export function useEqpDetail(eqpId: string | null) {
  return useQuery({
    queryKey: ['eqp', 'detail', eqpId],
    queryFn: () => eqpApi.getEqpDetail(eqpId as string),
    enabled: Boolean(eqpId),
  })
}
