import { useMutation, useQueryClient } from '@tanstack/react-query'
import { modelApi } from '../api/model.api'
import { modelQueryKeys } from '../lib/model-query-keys'
import type { ModelDetailNode, ModelDetailRow } from '../types/model.types'

interface SaveDetailRowsVariables {
  modelVersionKey: number
  detailNode: ModelDetailNode
  rows: ModelDetailRow[]
}

interface UploadMdfVariables {
  modelVersionKey: number
  file: File
  mdfName?: string
}

/**
 * Model 상세 편집용 mutation 훅 모음입니다.
 *
 * - saveDetailRowsMutation: 일반 상세 테이블 row를 현재 EDIT version에 저장합니다.
 * - uploadMdfMutation: MDF XML 파일을 업로드합니다.
 */
export function useModelDetailMutations() {
  const queryClient = useQueryClient()

  const saveDetailRowsMutation = useMutation({
    mutationFn: ({ modelVersionKey, detailNode, rows }: SaveDetailRowsVariables) =>
      modelApi.saveModelNodeDetailRows(modelVersionKey, detailNode, rows),
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({
        queryKey: modelQueryKeys.detailNode(variables.modelVersionKey, variables.detailNode),
      })
    },
  })

  const uploadMdfMutation = useMutation({
    mutationFn: ({ modelVersionKey, file, mdfName }: UploadMdfVariables) =>
      modelApi.uploadModelMdf(modelVersionKey, file, mdfName),
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({
        queryKey: modelQueryKeys.detailNode(variables.modelVersionKey, 'mdf'),
      })
    },
  })

  return {
    saveDetailRowsMutation,
    uploadMdfMutation,
  }
}
