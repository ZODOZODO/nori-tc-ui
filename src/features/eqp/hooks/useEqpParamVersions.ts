import { useQuery } from '@tanstack/react-query'
import { eqpApi } from '../api/eqp.api'

/**
 * 선택된 EQP의 파라미터 버전 목록을 조회합니다.
 * eqpId가 없으면 요청하지 않습니다.
 */
export function useEqpParamVersions(eqpId: string | null) {
  return useQuery({
    queryKey: ['eqp', 'paramVersions', eqpId],
    queryFn: () => eqpApi.getEqpParamVersions(eqpId as string),
    enabled: Boolean(eqpId),
  })
}
