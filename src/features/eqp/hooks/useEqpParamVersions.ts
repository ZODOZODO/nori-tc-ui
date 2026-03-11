import { useQuery } from '@tanstack/react-query'
import { eqpApi } from '../api/eqp.api'
import { eqpQueryKeys } from '../lib/eqp-query-keys'

/**
 * 선택된 EQP의 파라미터 버전 목록을 조회합니다.
 * eqpId가 없으면 요청하지 않습니다.
 */
export function useEqpParamVersions(eqpId: string | null) {
  return useQuery({
    queryKey: eqpQueryKeys.paramVersions(eqpId),
    queryFn: () => eqpApi.getEqpParamVersions(eqpId as string),
    enabled: Boolean(eqpId),
    // 다른 사용자의 체크인으로 버전이 추가될 수 있으므로 항상 최신 필요
    staleTime: 0,
  })
}
