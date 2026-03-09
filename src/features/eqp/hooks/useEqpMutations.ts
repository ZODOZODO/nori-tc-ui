import { useMutation, useQueryClient } from '@tanstack/react-query'
import { eqpApi } from '../api/eqp.api'
import type { EqpCreateRequest, EqpLifecycleRequest, EqpUpdateRequest } from '../types/eqp.types'

interface UpdateEqpVariables {
  eqpId: string
  request: EqpUpdateRequest
}

interface DeleteEqpVariables {
  eqpId: string
  interfaceType: string
  uiMessage?: string | null
}

interface LifecycleVariables {
  eqpId: string
  request: EqpLifecycleRequest
}

/**
 * EQP 관련 mutation 훅 모음입니다.
 * 성공 시 목록 캐시를 무효화하여 사이드바 목록/상세를 최신 상태로 맞춥니다.
 */
export function useEqpMutations() {
  const queryClient = useQueryClient()

  const invalidateEqpList = async () => {
    await queryClient.invalidateQueries({ queryKey: ['eqp', 'list'] })
  }

  const createEqpMutation = useMutation({
    mutationFn: (request: EqpCreateRequest) => eqpApi.createEqp(request),
    onSuccess: invalidateEqpList,
  })

  const updateEqpMutation = useMutation({
    mutationFn: ({ eqpId, request }: UpdateEqpVariables) => eqpApi.updateEqp(eqpId, request),
    onSuccess: async (_, variables) => {
      await invalidateEqpList()
      await queryClient.invalidateQueries({ queryKey: ['eqp', 'detail', variables.eqpId] })
    },
  })

  const deleteEqpMutation = useMutation({
    mutationFn: ({ eqpId, interfaceType, uiMessage }: DeleteEqpVariables) =>
      eqpApi.deleteEqp(eqpId, interfaceType, uiMessage),
    onSuccess: async (_, variables) => {
      await invalidateEqpList()
      await queryClient.removeQueries({ queryKey: ['eqp', 'detail', variables.eqpId] })
    },
  })

  const startEqpMutation = useMutation({
    mutationFn: ({ eqpId, request }: LifecycleVariables) => eqpApi.startEqp(eqpId, request),
    onSuccess: invalidateEqpList,
  })

  const endEqpMutation = useMutation({
    mutationFn: ({ eqpId, request }: LifecycleVariables) => eqpApi.endEqp(eqpId, request),
    onSuccess: invalidateEqpList,
  })

  return {
    createEqpMutation,
    updateEqpMutation,
    deleteEqpMutation,
    startEqpMutation,
    endEqpMutation,
  }
}
