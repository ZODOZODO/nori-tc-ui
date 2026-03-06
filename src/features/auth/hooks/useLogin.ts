import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { AxiosError } from 'axios'
import { authApi } from '../api/auth.api'
import type { LoginErrorResponse } from '../types/auth.types'

const loginSchema = z.object({
  userId: z.string().min(2, '아이디는 최소 2자 이상이어야 합니다.'),
  password: z.string().min(8, '비밀번호는 최소 8자 이상이어야 합니다.'),
})

export type LoginFormValues = z.infer<typeof loginSchema>

export function useLogin() {
  const navigate = useNavigate()
  const [serverError, setServerError] = useState<string | null>(null)

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      userId: '',
      password: '',
    },
  })

  const onSubmit = form.handleSubmit(async (data) => {
    try {
      setServerError(null)
      const response = await authApi.login(data)
      // 로그인 성공: accessToken 저장 후 대시보드로 이동
      localStorage.setItem('accessToken', response.accessToken)
      navigate('/dashboard')
    } catch (error) {
      const axiosError = error as AxiosError<LoginErrorResponse>
      const message =
        axiosError.response?.data?.message ??
        '로그인 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
      setServerError(message)
    }
  })

  return {
    form,
    serverError,
    onSubmit,
    isSubmitting: form.formState.isSubmitting,
  }
}
