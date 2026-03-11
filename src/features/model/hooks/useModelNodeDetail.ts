import { useQuery } from '@tanstack/react-query'
import { modelApi } from '../api/model.api'
import { modelQueryKeys } from '../lib/model-query-keys'
import type { ModelDetailNode } from '../types/model.types'

/**
 * 활성 탭의 상세 노드 데이터를 조회하는 훅입니다.
 * modelVersionKey와 detailNode가 모두 있을 때만 API를 호출합니다.
 */
export function useModelNodeDetail(modelVersionKey: number | null, detailNode: ModelDetailNode | null) {
  return useQuery({
    queryKey: modelQueryKeys.detailNode(modelVersionKey, detailNode),
    queryFn: () => modelApi.getModelNodeDetail(modelVersionKey as number, detailNode as ModelDetailNode),
    enabled: modelVersionKey !== null && detailNode !== null,
    staleTime: 0,
  })
}
