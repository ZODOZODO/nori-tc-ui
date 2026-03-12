import { useMemo, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import type { ModelInfo } from '../types/model.types'

const MAX_MODEL_NAME_LENGTH = 1000

interface BranchModelCreateModalProps {
  open: boolean
  parentModel: ModelInfo | null
  currentUserId: string | null
  isPending: boolean
  errorMessage: string | null
  onOpenChange: (open: boolean) => void
  onSubmit: (request: { suffix: string }) => void | Promise<void>
}

/**
 * root model 기준 branch 생성 모달입니다.
 * 실제 최종 model name은 suffix와 현재 로그인 userId를 조합해 미리 보여 줍니다.
 */
export function BranchModelCreateModal({
  open,
  parentModel,
  currentUserId,
  isPending,
  errorMessage,
  onOpenChange,
  onSubmit,
}: BranchModelCreateModalProps) {
  const [suffix, setSuffix] = useState('')
  const [formErrorMessage, setFormErrorMessage] = useState<string | null>(null)
  const normalizedParentModelName = parentModel?.modelName ?? '-'
  const normalizedCurrentUserId = currentUserId?.trim() ?? ''
  const normalizedSuffix = suffix.trim()

  const previewModelName = useMemo(() => {
    const normalizedUserId = normalizedCurrentUserId || '{userId}'

    if (!normalizedSuffix) {
      return `${normalizedParentModelName}_{suffix}_${normalizedUserId}`
    }

    return `${normalizedParentModelName}_${normalizedSuffix}_${normalizedUserId}`
  }, [normalizedCurrentUserId, normalizedParentModelName, normalizedSuffix])

  const finalModelName = useMemo(() => {
    if (!normalizedCurrentUserId || !parentModel?.modelName) {
      return null
    }

    return `${parentModel.modelName}_${normalizedSuffix}_${normalizedCurrentUserId}`
  }, [normalizedCurrentUserId, normalizedSuffix, parentModel])

  const remainingModelNameLength =
    finalModelName === null ? null : MAX_MODEL_NAME_LENGTH - finalModelName.length
  const isModelNameTooLong =
    remainingModelNameLength !== null && remainingModelNameLength < 0

  const handleSubmit = async () => {
    if (!normalizedSuffix) {
      setFormErrorMessage('suffix를 입력해 주세요.')
      return
    }

    if (!normalizedCurrentUserId) {
      setFormErrorMessage('현재 사용자 정보를 확인한 뒤 다시 시도해 주세요.')
      return
    }

    if (isModelNameTooLong) {
      setFormErrorMessage('최종 Model Name이 1000자를 초과했습니다. suffix를 줄여 주세요.')
      return
    }

    setFormErrorMessage(null)
    await onSubmit({ suffix: normalizedSuffix })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!isPending) {
          onOpenChange(nextOpen)
        }
      }}
    >
      <DialogContent className="max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Branch Model Create</DialogTitle>
          <DialogDescription>
            선택한 root model의 최신 버전을 복제해 branch `EDIT/DEVELOP` 모델을 생성합니다.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <section className="rounded-2xl border border-[#E4EAE6] bg-[#FAFCFB] p-4">
            <div className="grid gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-[#1E3D33]">Parent Model</label>
                  <div className="flex h-11 items-center rounded-xl border border-[#E4EAE6] bg-[#F4F7F5] px-3 text-sm text-[#51605A]">
                    {parentModel?.modelName ?? '-'}
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-[#1E3D33]">Current User</label>
                  <div className="flex h-11 items-center rounded-xl border border-[#E4EAE6] bg-[#F4F7F5] px-3 text-sm text-[#51605A]">
                    {currentUserId ?? '사용자 정보 확인 중'}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[#1E3D33]">
                  suffix
                  <span className="ml-1 text-[#C5534B]">*</span>
                </label>
                <Input
                  value={suffix}
                  onChange={(event) => setSuffix(event.target.value)}
                  placeholder="예: hotfix"
                />
                <p className="text-[11px] text-[#738078]">
                  최종 모델명은 `parent + suffix + userId` 규칙으로 생성되며 최대 1000자까지 허용됩니다.
                </p>
              </div>

              <div className="rounded-xl border border-[#DCE5E0] bg-white px-3 py-3">
                <p className="text-[11px] font-semibold text-[#738078]">최종 Model Name Preview</p>
                <p className="mt-1 break-all text-sm font-semibold text-[#22322B]">{previewModelName}</p>
                <p
                  className={`mt-2 text-[11px] ${
                    isModelNameTooLong ? 'text-[#C5534B]' : 'text-[#738078]'
                  }`}
                >
                  {remainingModelNameLength === null
                    ? '현재 사용자 정보를 확인한 뒤 길이를 계산합니다.'
                    : isModelNameTooLong
                      ? `${Math.abs(remainingModelNameLength)}자 초과`
                      : `남은 길이 ${remainingModelNameLength}자`}
                </p>
              </div>
            </div>
          </section>

          {formErrorMessage ? (
            <p className="rounded-xl border border-[#F0D2D0] bg-[#FFF7F7] px-3 py-2 text-sm text-[#B4483F]">
              {formErrorMessage}
            </p>
          ) : null}

          {errorMessage ? (
            <p className="rounded-xl border border-[#F0D2D0] bg-[#FFF7F7] px-3 py-2 text-sm text-[#B4483F]">
              {errorMessage}
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button
            onClick={() => void handleSubmit()}
            disabled={isPending || !normalizedCurrentUserId || isModelNameTooLong}
          >
            {isPending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
