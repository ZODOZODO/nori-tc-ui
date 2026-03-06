import { Loader2 } from 'lucide-react'
import { useLogin } from '../hooks/useLogin'

export function LoginPage() {
  const { form, serverError, onSubmit, isSubmitting } = useLogin()
  const {
    register,
    formState: { errors },
  } = form

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center bg-[#FAF8F5]">
      {/* 좌측 상단 로고 */}
      <div className="absolute left-5 top-5 flex items-center gap-2.5 md:left-20 md:top-[38px]">
        <div className="flex h-7 w-7 items-center justify-center rounded-full border border-[#d95d39]">
          <span className="font-fraunces text-xs text-[#d95d39]">N</span>
        </div>
        <span className="font-fraunces text-lg tracking-[3px] text-[#2D2D2D]">NORI</span>
      </div>

      {/* 로그인 카드 */}
      <div className="mx-4 w-full rounded-[20px] border border-[#E8E4DF] bg-white p-8 md:w-[480px] md:p-12 lg:w-[400px]">
        <form onSubmit={onSubmit} noValidate>
          <div className="flex flex-col gap-7">
            {/* 타이틀 */}
            <h1 className="text-center font-fraunces text-[32px] tracking-[-1px] text-[#2D2D2D]">
              Nori-TC
            </h1>

            {/* 아이디 입력 섹션 */}
            <div className="flex flex-col gap-2">
              <label
                htmlFor="userId"
                className="text-[13px] font-medium text-[#5A5A5A]"
              >
                ID
              </label>
              <input
                id="userId"
                type="text"
                placeholder="아이디를 입력하세요"
                aria-invalid={!!errors.userId}
                className="h-12 w-full rounded-xl border border-[#E8E4DF] bg-[#F5F3EF] px-4 text-[13px] text-[#2D2D2D] placeholder:text-[#ADADAD] focus:border-[#d95d39] focus:outline-none aria-[invalid=true]:border-red-400"
                {...register('userId')}
              />
              {errors.userId && (
                <p role="alert" className="text-xs text-red-500">
                  {errors.userId.message}
                </p>
              )}
            </div>

            {/* 비밀번호 입력 섹션 */}
            <div className="flex flex-col gap-2">
              <label
                htmlFor="password"
                className="text-[13px] font-medium text-[#5A5A5A]"
              >
                비밀번호
              </label>
              <input
                id="password"
                type="password"
                placeholder="비밀번호를 입력하세요"
                aria-invalid={!!errors.password}
                className="h-12 w-full rounded-xl border border-[#E8E4DF] bg-[#F5F3EF] px-4 text-[13px] text-[#2D2D2D] placeholder:text-[#ADADAD] focus:border-[#d95d39] focus:outline-none aria-[invalid=true]:border-red-400"
                {...register('password')}
              />
              {errors.password && (
                <p role="alert" className="text-xs text-red-500">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* 서버 에러 메시지 */}
            {serverError && (
              <p role="alert" className="-mt-3 text-center text-sm text-red-500">
                {serverError}
              </p>
            )}

            {/* 로그인 버튼 */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#d95d39] text-[13px] font-medium text-white transition-colors hover:bg-[#c44e2d] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting && <Loader2 className="size-4 animate-spin" />}
              로그인
            </button>

            {/* 비밀번호 찾기 */}
            <div className="text-center">
              <button
                type="button"
                className="text-[13px] text-[#8A8A8A] transition-colors hover:text-[#5A5A5A]"
              >
                비밀번호를 잊으셨나요?
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
