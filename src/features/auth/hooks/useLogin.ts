import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { apiClient } from '@/shared/lib/api-client'
import { authApi } from '../api/auth.api'
import { AuthApiError, type LoginRequest, type LoginSuccessResponse } from '../types/auth.types'

/**
 * 로그인 폼 유효성 스키마입니다.
 * - userId: 필수, 최소 2자
 * - password: 필수, 최소 8자
 */
export const loginSchema = z.object({
  userId: z
    .string()
    .trim()
    .min(1, '아이디를 입력해 주세요.')
    .min(2, '아이디는 최소 2자 이상이어야 합니다.'),
  password: z
    .string()
    .min(1, '비밀번호를 입력해 주세요.')
    .min(8, '비밀번호는 최소 8자 이상이어야 합니다.'),
})

export type LoginFormValues = z.infer<typeof loginSchema>

/**
 * 로그인 성공 후 이동할 EqpInfo 기본 진입 경로입니다.
 * 기존 프로젝트 경로 체계를 기준으로 사용합니다.
 */
const EQP_INFO_ENTRY_ROUTE = '/eqp'

/**
 * 로그인 직후 보호 API 호출로 쿠키 기반 인증 상태를 확인합니다.
 */
const verifyEqpAccess = async () => {
  await apiClient.get('/eqp', {
    withCredentials: true,
  })
}

export function useLogin() {
  const navigate = useNavigate()

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      userId: '',
      password: '',
    },
  })

  const loginMutation = useMutation<LoginSuccessResponse, AuthApiError, LoginRequest>({
    mutationFn: async (credentials) => {
      const loginResult = await authApi.login(credentials)
      await verifyEqpAccess()
      return loginResult
    },
    onSuccess: (result) => {
      console.info('[useLogin] login flow completed', {
        userPk: result.data.userPk,
      })
      navigate(EQP_INFO_ENTRY_ROUTE, { replace: true })
    },
    onError: (error) => {
      console.error('[useLogin] login flow failed', {
        status: error.status,
        errorCode: error.payload.errorCode,
      })
    },
  })

  /**
   * submit 시 직전 서버 에러 상태를 초기화하고 최신 요청만 반영합니다.
   */
  const onSubmit = form.handleSubmit(async (formValues) => {
    loginMutation.reset()
    await loginMutation.mutateAsync(formValues)
  })

  /**
   * 사용자가 입력을 수정할 때 서버 에러 메시지를 정리합니다.
   */
  const resetServerError = () => {
    if (loginMutation.isError) {
      loginMutation.reset()
    }
  }

  return {
    form,
    onSubmit,
    mutate: loginMutation.mutate,
    mutateAsync: loginMutation.mutateAsync,
    isPending: loginMutation.isPending,
    error: loginMutation.error,
    serverErrorMessage: loginMutation.error?.payload.errorMsg ?? null,
    resetServerError,
  }
}
