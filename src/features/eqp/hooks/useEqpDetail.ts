import { useQuery } from '@tanstack/react-query'
import { eqpApi } from '../api/eqp.api'
import { eqpQueryKeys } from '../lib/eqp-query-keys'

/**
 * 선택된 EQP 상세 조회 훅입니다.
 * eqpId가 없으면 API 호출을 하지 않습니다.
 */
export function useEqpDetail(eqpId: string | null) {
  return useQuery({
    queryKey: eqpQueryKeys.detail(eqpId),
    queryFn: () => eqpApi.getEqpDetail(eqpId as string),
    enabled: Boolean(eqpId),
    // 선택 시 항상 최신 데이터 (IP/포트/모델 변경 가능)
    staleTime: 0,
  })
}
