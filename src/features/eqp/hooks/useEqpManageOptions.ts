import { useQuery } from '@tanstack/react-query'
import { eqpApi } from '../api/eqp.api'
import { eqpQueryKeys } from '../lib/eqp-query-keys'

/**
 * EQP 관리 화면 옵션 조회 훅입니다.
 * dropdown 데이터는 여러 모달에서 재사용되므로 공통 캐시를 사용합니다.
 */
export function useEqpManageOptions(enabled = true) {
  return useQuery({
    queryKey: eqpQueryKeys.manageOptions(),
    queryFn: () => eqpApi.getEqpManageOptions(),
    enabled,
    staleTime: 60_000,
  })
}
