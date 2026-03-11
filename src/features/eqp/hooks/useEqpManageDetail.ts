import { useQuery } from '@tanstack/react-query'
import { eqpApi } from '../api/eqp.api'
import { eqpQueryKeys } from '../lib/eqp-query-keys'

/**
 * EQP 관리 상세 조회 훅입니다.
 * 관리 모달이 열릴 때만 호출하도록 상위에서 enabled를 제어할 수 있게 분리했습니다.
 */
export function useEqpManageDetail(eqpId: string | null, enabled = true) {
  return useQuery({
    queryKey: eqpQueryKeys.manage(eqpId),
    queryFn: () => eqpApi.getEqpManageDetail(eqpId as string),
    enabled: enabled && Boolean(eqpId),
    staleTime: 0,
  })
}
