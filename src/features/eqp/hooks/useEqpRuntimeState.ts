import { useQuery } from '@tanstack/react-query'
import { eqpApi } from '../api/eqp.api'

/**
 * 선택된 EQP의 런타임 상태(control/eqp/connection)를 조회합니다.
 * eqpId가 없으면 요청하지 않습니다.
 */
export function useEqpRuntimeState(eqpId: string | null) {
  return useQuery({
    queryKey: ['eqp', 'runtimeState', eqpId],
    queryFn: () => eqpApi.getEqpRuntimeState(eqpId as string),
    enabled: Boolean(eqpId),
  })
}
