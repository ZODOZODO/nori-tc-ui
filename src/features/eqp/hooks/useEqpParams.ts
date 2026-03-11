import { useQuery } from '@tanstack/react-query'
import { eqpApi } from '../api/eqp.api'

/**
 * 선택된 EQP의 특정 버전 파라미터 목록을 조회합니다.
 *
 * eqpId 또는 version이 없으면 요청하지 않습니다.
 */
export function useEqpParams(eqpId: string | null, version: string | null) {
  return useQuery({
    queryKey: ['eqp', 'params', eqpId, version],
    queryFn: () => eqpApi.getEqpParams(eqpId as string, version as string),
    enabled: Boolean(eqpId) && Boolean(version),
    // EDIT 버전: 편집 데이터는 항상 최신 필요 → staleTime: 0
    // 특정 버전: 불변 데이터이므로 기본 캐시(5분) 유지 → staleTime: undefined
    staleTime: version === 'EDIT' ? 0 : undefined,
  })
}
