import { useQuery } from '@tanstack/react-query'
import { modelApi } from '../api/model.api'
import { modelQueryKeys } from '../lib/model-query-keys'

/**
 * 선택된 모델 상세 조회 훅입니다.
 * modelVersionKey가 없으면 API 호출을 하지 않습니다.
 */
export function useModelDetail(modelVersionKey: number | null) {
  return useQuery({
    queryKey: modelQueryKeys.detail(modelVersionKey),
    queryFn: () => modelApi.getModelDetail(modelVersionKey as number),
    enabled: modelVersionKey !== null,
    // 선택 모델 상세는 항상 최신 상태를 우선합니다.
    staleTime: 0,
  })
}
