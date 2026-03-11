import { useEffect, useMemo, useState } from 'react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { buildEqpUpdateRequest } from '../lib/eqp-management.util'
import type { EqpManageDetail, EqpUpdateRequest } from '../types/eqp.types'

interface EqpParamVersionModalProps {
  open: boolean
  detail: EqpManageDetail | null
  isLoading: boolean
  isPending: boolean
  errorMessage: string | null
  onOpenChange: (open: boolean) => void
  onSubmit: (request: EqpUpdateRequest) => void | Promise<void>
}

const toSelectValue = (value: string): string | undefined => (value ? value : undefined)

/**
 * EQP에 적용할 param version을 변경하는 모달입니다.
 */
export function EqpParamVersionModal({
  open,
  detail,
  isLoading,
  isPending,
  errorMessage,
  onOpenChange,
  onSubmit,
}: EqpParamVersionModalProps) {
  const [selectedParamVersion, setSelectedParamVersion] = useState('')
  const [localErrorMessage, setLocalErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      return
    }

    setSelectedParamVersion(detail?.appliedParamVersion ?? detail?.paramVersions[0]?.paramVersion ?? '')
    setLocalErrorMessage(null)
  }, [open, detail])

  const selectedParamOption = useMemo(
    () =>
      detail?.paramVersions.find((option) => option.paramVersion === selectedParamVersion) ?? null,
    [detail, selectedParamVersion],
  )

  const mergedErrorMessage = localErrorMessage ?? errorMessage

  const handleOpenChange = (nextOpen: boolean) => {
    if (!isPending) {
      onOpenChange(nextOpen)
    }
  }

  const handleSave = async () => {
    try {
      setLocalErrorMessage(null)

      if (!detail) {
        throw new Error('설비 관리 상세 정보를 불러오지 못했습니다.')
      }

      if (!selectedParamVersion) {
        throw new Error('변경할 Param Version을 선택해 주세요.')
      }

      const request = buildEqpUpdateRequest(detail, {
        appliedParamVersion: selectedParamVersion,
      })

      await onSubmit(request)
    } catch (error) {
      setLocalErrorMessage(error instanceof Error ? error.message : '입력값을 다시 확인해 주세요.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="z-[60] max-w-[640px] rounded-2xl p-0" showCloseButton={!isPending}>
        <div className="flex flex-col">
          <DialogHeader className="border-b border-[#E4EAE6] px-6 py-5">
            <DialogTitle>Eqp Parameter Update</DialogTitle>
            <DialogDescription>
              현재 EQP에 적용 중인 parameter version을 다른 버전으로 교체합니다.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 px-6 py-5">
            {isLoading && !detail ? (
              <div className="flex min-h-40 items-center justify-center text-sm text-[#65726B]">
                <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
                설비 관리 정보를 불러오는 중입니다.
              </div>
            ) : (
              <>
                <section className="grid gap-4 rounded-2xl border border-[#E4EAE6] bg-[#FAFCFB] p-4 md:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold text-[#1E3D33]">현재 적용 Version</p>
                    <div className="mt-1 flex h-11 items-center rounded-xl border border-[#E4EAE6] bg-[#F4F7F5] px-3 text-sm text-[#51605A]">
                      {detail?.appliedParamVersion ?? '-'}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-[#1E3D33]">현재 Description</p>
                    <div className="mt-1 min-h-11 rounded-xl border border-[#E4EAE6] bg-[#F4F7F5] px-3 py-3 text-sm text-[#51605A]">
                      {detail?.appliedParamDescription ?? '-'}
                    </div>
                  </div>
                </section>

                <section className="space-y-3 rounded-2xl border border-[#E4EAE6] bg-[#FAFCFB] p-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-[#1E3D33]">변경 대상 Param Version</label>
                    <Select
                      value={toSelectValue(selectedParamVersion)}
                      onValueChange={setSelectedParamVersion}
                      disabled={isPending || (detail?.paramVersions.length ?? 0) === 0}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Param Version을 선택해 주세요." />
                      </SelectTrigger>
                      <SelectContent>
                        {(detail?.paramVersions ?? []).map((option) => (
                          <SelectItem key={option.paramVersion} value={option.paramVersion}>
                            {option.paramVersion}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-[#1E3D33]">선택 Version Description</p>
                    <div className="mt-1 min-h-20 rounded-xl border border-[#E4EAE6] bg-white px-3 py-3 text-sm text-[#243129]">
                      {selectedParamOption?.description ?? '설명이 없습니다.'}
                    </div>
                  </div>
                </section>

                {(detail?.paramVersions.length ?? 0) === 0 ? (
                  <p className="rounded-xl border border-[#F0D9C7] bg-[#FFF7F1] px-3 py-2 text-sm text-[#A7662B]">
                    변경 가능한 Param Version이 없습니다.
                  </p>
                ) : null}

                {mergedErrorMessage ? (
                  <p className="rounded-xl border border-[#F0D2D0] bg-[#FFF7F7] px-3 py-2 text-sm text-[#B4483F]">
                    {mergedErrorMessage}
                  </p>
                ) : null}
              </>
            )}
          </div>

          <DialogFooter className="border-t border-[#E4EAE6] px-6 py-4 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-full border-[#D7E1DB] px-4 text-xs font-semibold"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="h-10 rounded-full bg-[#1C7F59] px-4 text-xs font-semibold text-white hover:bg-[#166749]"
              onClick={() => void handleSave()}
              disabled={isPending || isLoading || !detail || (detail.paramVersions.length ?? 0) === 0}
            >
              {isPending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
              Save
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
