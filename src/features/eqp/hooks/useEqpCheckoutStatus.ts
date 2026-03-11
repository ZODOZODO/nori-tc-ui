import { useQuery } from '@tanstack/react-query'
import { eqpApi } from '../api/eqp.api'
import { eqpQueryKeys } from '../lib/eqp-query-keys'

/**
 * 선택된 EQP의 체크아웃 상태를 조회합니다.
 *
 * staleTime=0으로 설정해 항상 최신 상태를 확인합니다.
 * 다른 사용자가 체크아웃/체크인했을 때 즉시 반영하기 위함입니다.
 */
export function useEqpCheckoutStatus(eqpId: string | null) {
  return useQuery({
    queryKey: eqpQueryKeys.checkoutStatus(eqpId),
    queryFn: () => eqpApi.getEqpCheckoutStatus(eqpId as string),
    enabled: Boolean(eqpId),
    staleTime: 0,
  })
}
