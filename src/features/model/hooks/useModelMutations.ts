import { useMutation, useQueryClient } from '@tanstack/react-query'
import { modelApi } from '../api/model.api'
import {
  invalidateModelTreeQueries,
  invalidateModelVersionQueries,
  modelQueryKeys,
  removeModelVersionQueries,
} from '../lib/model-query-keys'
import {
  createModelFailResponse,
  ModelApiError,
  type ModelInfo,
  type ModelPageResponse,
  type ModelUpsertRequest,
} from '../types/model.types'

const EDIT_MODEL_VERSION = 'EDIT'

interface UpdateModelVariables {
  modelVersionKey: number
  request: ModelUpsertRequest
}

interface DeleteModelVariables {
  modelVersionKey: number
}

interface CheckoutModelVariables {
  model: ModelInfo
  currentUserId: string | null
}

interface CheckinModelVariables {
  editModel: ModelInfo
  newVersion: string
  description: string
  currentUserId: string | null
}

/**
 * 모델 버전 문자열이 EDIT 잠금 버전인지 확인합니다.
 */
const isEditVersion = (modelVersion: string): boolean =>
  modelVersion.trim().toUpperCase() === EDIT_MODEL_VERSION

/**
 * 체크아웃 소유자 표시에 사용할 사용자 ID를 추출합니다.
 */
const resolveLockOwner = (model: ModelInfo): string | null => {
  const normalizedUpdatedBy = model.updatedBy.trim()
  if (normalizedUpdatedBy.length > 0) {
    return normalizedUpdatedBy
  }

  const normalizedCreatedBy = model.createdBy.trim()
  if (normalizedCreatedBy.length > 0) {
    return normalizedCreatedBy
  }

  return null
}

/**
 * 저장/수정 요청에 사용할 감사 사용자 ID를 정규화합니다.
 */
const resolveAuditUser = (currentUserId: string | null, fallbackUser: string | null | undefined): string => {
  if (currentUserId && currentUserId.trim().length > 0) {
    return currentUserId.trim()
  }

  if (fallbackUser && fallbackUser.trim().length > 0) {
    return fallbackUser.trim()
  }

  return 'SYSTEM'
}

/**
 * 다른 사용자가 EDIT 잠금을 점유한 경우를 표현하는 전용 에러를 생성합니다.
 */
const createCheckoutConflictError = (owner: string | null): ModelApiError =>
  new ModelApiError(
    createModelFailResponse({
      success: false,
      data: null,
      errorCode: 'CHECKOUT_CONFLICT',
      errorMsg: owner
        ? `${owner}님이 체크아웃한 모델이라 수정할 수 없습니다.`
        : '다른 사용자가 체크아웃한 모델이라 수정할 수 없습니다.',
    }),
    409,
  )

/**
 * Model 관련 mutation 훅 모음입니다.
 *
 * 체크아웃/체크인은 현재 백엔드 CRUD 계약을 조합해 동작합니다.
 * - checkout: 동일 modelKey의 EDIT 버전이 없으면 EDIT 버전을 생성
 * - checkin: 신규 버전 생성 후 EDIT 버전을 삭제
 */
export function useModelMutations() {
  const queryClient = useQueryClient()

  const getModelItems = async (): Promise<ModelInfo[]> => {
    const cachedPage = queryClient.getQueryData<ModelPageResponse>(modelQueryKeys.list())
    if (cachedPage && Array.isArray(cachedPage.items)) {
      return cachedPage.items
    }

    const remotePage = await modelApi.getModelList(0, 500)
    return remotePage.items
  }

  const createModelMutation = useMutation({
    mutationFn: (request: ModelUpsertRequest) => modelApi.createModel(request),
    onSuccess: async (createdModel) => {
      await invalidateModelTreeQueries(queryClient)
      await invalidateModelVersionQueries(queryClient, createdModel.modelVersionKey)
    },
  })

  const updateModelMutation = useMutation({
    mutationFn: ({ modelVersionKey, request }: UpdateModelVariables) =>
      modelApi.updateModel(modelVersionKey, request),
    onSuccess: async (_, variables) => {
      await invalidateModelTreeQueries(queryClient)
      await invalidateModelVersionQueries(queryClient, variables.modelVersionKey)
    },
  })

  const deleteModelMutation = useMutation({
    mutationFn: ({ modelVersionKey }: DeleteModelVariables) => modelApi.deleteModel(modelVersionKey),
    onSuccess: async (_, variables) => {
      await invalidateModelTreeQueries(queryClient)
      removeModelVersionQueries(queryClient, variables.modelVersionKey)
    },
  })

  const checkoutModelMutation = useMutation({
    mutationFn: async ({ model, currentUserId }: CheckoutModelVariables) => {
      const modelItems = await getModelItems()
      const existingEditModel = modelItems.find(
        (item) => item.modelKey === model.modelKey && isEditVersion(item.modelVersion),
      )

      if (existingEditModel) {
        const lockOwner = resolveLockOwner(existingEditModel)
        if (lockOwner && currentUserId && lockOwner !== currentUserId) {
          throw createCheckoutConflictError(lockOwner)
        }
        if (lockOwner && !currentUserId) {
          throw createCheckoutConflictError(lockOwner)
        }
        return existingEditModel
      }

      const auditUser = resolveAuditUser(currentUserId, model.updatedBy)

      return modelApi.createModel({
        modelName: model.modelName,
        modelVersion: EDIT_MODEL_VERSION,
        commInterface: model.commInterface,
        status: model.status,
        description: model.description,
        maker: model.maker,
        createdBy: auditUser,
        updatedBy: auditUser,
      })
    },
    onSuccess: async (checkedOutModel, variables) => {
      await invalidateModelTreeQueries(queryClient)
      await invalidateModelVersionQueries(queryClient, variables.model.modelVersionKey)
      await invalidateModelVersionQueries(queryClient, checkedOutModel.modelVersionKey)
    },
  })

  const checkinModelMutation = useMutation({
    mutationFn: async ({ editModel, newVersion, description, currentUserId }: CheckinModelVariables) => {
      const normalizedVersion = newVersion.trim()
      if (!normalizedVersion) {
        throw new ModelApiError(
          createModelFailResponse({
            success: false,
            data: null,
            errorCode: 'INVALID_REQUEST',
            errorMsg: '저장할 버전을 입력해 주세요.',
          }),
          400,
        )
      }

      const lockOwner = resolveLockOwner(editModel)
      if (
        isEditVersion(editModel.modelVersion) &&
        lockOwner &&
        (!currentUserId || lockOwner !== currentUserId)
      ) {
        throw createCheckoutConflictError(lockOwner)
      }

      const auditUser = resolveAuditUser(currentUserId, editModel.updatedBy)

      const createdModel = await modelApi.createModel({
        modelName: editModel.modelName,
        modelVersion: normalizedVersion,
        commInterface: editModel.commInterface,
        status: editModel.status,
        description: description.trim(),
        maker: editModel.maker,
        createdBy: auditUser,
        updatedBy: auditUser,
      })

      // 체크인 완료 후 EDIT 버전을 삭제해 잠금을 해제합니다.
      if (isEditVersion(editModel.modelVersion)) {
        await modelApi.deleteModel(editModel.modelVersionKey)
      }

      return createdModel
    },
    onSuccess: async (createdModel, variables) => {
      await invalidateModelTreeQueries(queryClient)
      await invalidateModelVersionQueries(queryClient, createdModel.modelVersionKey)
      removeModelVersionQueries(queryClient, variables.editModel.modelVersionKey)
    },
  })

  return {
    createModelMutation,
    updateModelMutation,
    deleteModelMutation,
    checkoutModelMutation,
    checkinModelMutation,
  }
}
