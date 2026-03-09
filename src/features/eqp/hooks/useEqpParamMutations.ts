import { useMutation, useQueryClient } from '@tanstack/react-query'
import { eqpApi } from '../api/eqp.api'
import type { EqpCheckoutRequest, EqpCheckinRequest, EqpParamSaveItem } from '../types/eqp.types'

interface CheckoutVariables {
  eqpId: string
  request: EqpCheckoutRequest
}

interface SaveEditParamsVariables {
  eqpId: string
  params: EqpParamSaveItem[]
}

interface CheckinVariables {
  eqpId: string
  request: EqpCheckinRequest
}

/**
 * EQP 파라미터 체크아웃 / 저장 / 체크인 mutation 훅 모음입니다.
 *
 * - checkoutMutation: 성공 시 checkoutStatus, params(EDIT) 캐시 무효화
 * - saveEditParamsMutation: 성공 시 EDIT 파라미터 캐시 무효화
 * - checkinMutation: 성공 시 paramVersions, checkoutStatus, params 캐시 전체 무효화
 */
export function useEqpParamMutations() {
  const queryClient = useQueryClient()

  const checkoutMutation = useMutation({
    mutationFn: ({ eqpId, request }: CheckoutVariables) => eqpApi.checkoutEqp(eqpId, request),
    onSuccess: async (_, variables) => {
      // 체크아웃 상태와 EDIT 파라미터 캐시를 무효화해 최신 상태를 반영한다.
      await queryClient.invalidateQueries({ queryKey: ['eqp', 'checkoutStatus', variables.eqpId] })
      await queryClient.invalidateQueries({ queryKey: ['eqp', 'params', variables.eqpId, 'EDIT'] })
    },
  })

  const saveEditParamsMutation = useMutation({
    mutationFn: ({ eqpId, params }: SaveEditParamsVariables) => eqpApi.saveEqpEditParams(eqpId, params),
    onSuccess: async (_, variables) => {
      // 저장 후 EDIT 파라미터 캐시를 무효화해 최신 편집값을 반영한다.
      await queryClient.invalidateQueries({ queryKey: ['eqp', 'params', variables.eqpId, 'EDIT'] })
    },
  })

  const checkinMutation = useMutation({
    mutationFn: ({ eqpId, request }: CheckinVariables) => eqpApi.checkinEqp(eqpId, request),
    onSuccess: async (_, variables) => {
      // 체크인 후 버전 목록, 체크아웃 상태, 모든 파라미터 캐시를 무효화한다.
      await queryClient.invalidateQueries({ queryKey: ['eqp', 'paramVersions', variables.eqpId] })
      await queryClient.invalidateQueries({ queryKey: ['eqp', 'checkoutStatus', variables.eqpId] })
      await queryClient.invalidateQueries({ queryKey: ['eqp', 'params', variables.eqpId] })
    },
  })

  return {
    checkoutMutation,
    saveEditParamsMutation,
    checkinMutation,
  }
}
