import { useMutation, useQueryClient } from '@tanstack/react-query'
import { modelApi } from '../api/model.api'
import {
  invalidateModelTreeQueries,
  invalidateModelVersionQueries,
  modelQueryKeys,
} from '../lib/model-query-keys'
import { useModelUiStore } from '../stores/model-ui.store'
import type {
  ModelBranchCreateRequest,
  ModelInfoUpdateRequest,
  ModelParentCommitRequest,
  ModelRootCreateRequest,
} from '../types/model.types'

interface UpdateRootModelInfoVariables {
  modelKey: number
  request: ModelInfoUpdateRequest
}

interface CreateBranchVariables {
  modelKey: number
  request: ModelBranchCreateRequest
}

interface CommitParentVariables {
  modelKey: number
  request: ModelParentCommitRequest
}

interface DeleteModelByKeyVariables {
  modelKey: number
}

/**
 * Model 관리 화면 전용 mutation 훅 모음입니다.
 * root/branch 관리와 parent commit 성공 시 tree/detail 캐시와 탭 상태를 함께 정리합니다.
 */
export function useModelManagementMutations() {
  const queryClient = useQueryClient()
  const handleBranchCommitSuccess = useModelUiStore((state) => state.handleBranchCommitSuccess)

  const createRootModelMutation = useMutation({
    mutationFn: (request: ModelRootCreateRequest) => modelApi.createRootModel(request),
    onSuccess: async (createdModel) => {
      await invalidateModelTreeQueries(queryClient)
      await invalidateModelVersionQueries(queryClient, createdModel.modelVersionKey)
    },
  })

  const updateRootModelInfoMutation = useMutation({
    mutationFn: ({ modelKey, request }: UpdateRootModelInfoVariables) =>
      modelApi.updateRootModelInfo(modelKey, request),
    onSuccess: async (updatedModel) => {
      await invalidateModelTreeQueries(queryClient)
      await invalidateModelVersionQueries(queryClient, updatedModel.modelVersionKey)
    },
  })

  const createBranchModelMutation = useMutation({
    mutationFn: ({ modelKey, request }: CreateBranchVariables) =>
      modelApi.createBranchModel(modelKey, request),
    onSuccess: async (createdBranch) => {
      await invalidateModelTreeQueries(queryClient)
      await invalidateModelVersionQueries(queryClient, createdBranch.modelVersionKey)
    },
  })

  const previewParentCommitMutation = useMutation({
    mutationFn: (modelKey: number) => modelApi.previewParentCommit(modelKey),
    onSuccess: (result, modelKey) => {
      queryClient.setQueryData(modelQueryKeys.parentCommit(modelKey), result)
    },
  })

  const commitParentModelMutation = useMutation({
    mutationFn: ({ modelKey, request }: CommitParentVariables) =>
      modelApi.commitParentModel(modelKey, request),
    onSuccess: async (result, variables) => {
      queryClient.setQueryData(modelQueryKeys.parentCommit(variables.modelKey), result)
      await invalidateModelTreeQueries(queryClient)

      if (result.committedParentModelVersionKey !== null) {
        await invalidateModelVersionQueries(queryClient, result.committedParentModelVersionKey)
      }

      handleBranchCommitSuccess(result.branchModelKey, result.committedParentModelVersionKey)
    },
  })

  const deleteDeprecatedBranchesMutation = useMutation({
    mutationFn: (modelKey: number) => modelApi.deleteDeprecatedBranches(modelKey),
    onSuccess: async () => {
      await invalidateModelTreeQueries(queryClient)
    },
  })

  const deleteModelByKeyMutation = useMutation({
    mutationFn: ({ modelKey }: DeleteModelByKeyVariables) => modelApi.deleteModelByKey(modelKey),
    onSuccess: async () => {
      await invalidateModelTreeQueries(queryClient)
    },
  })

  return {
    createRootModelMutation,
    updateRootModelInfoMutation,
    createBranchModelMutation,
    previewParentCommitMutation,
    commitParentModelMutation,
    deleteDeprecatedBranchesMutation,
    deleteModelByKeyMutation,
  }
}
