import { useQuery } from '@tanstack/react-query'
import { modelApi } from '../api/model.api'
import { modelQueryKeys } from '../lib/model-query-keys'

/**
 * 모델 목록 조회 훅입니다.
 * 요구사항에 맞춰 offset=0, limit=500으로 전체 목록을 조회합니다.
 */
export function useModelList() {
  return useQuery({
    queryKey: modelQueryKeys.list(),
    queryFn: () => modelApi.getModelList(0, 500),
    // 다른 사용자의 체크아웃/체크인 변경 반영을 위해 짧은 staleTime 사용
    staleTime: 60_000,
  })
}
