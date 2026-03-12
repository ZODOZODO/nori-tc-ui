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
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useEqpParams } from '../hooks/useEqpParams'
import { buildEqpUpdateRequest } from '../lib/eqp-management.util'
import { EqpApiError, type EqpManageDetail, type EqpUpdateRequest } from '../types/eqp.types'

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

const resolveErrorMessage = (error: unknown, fallbackMessage: string): string => {
  if (error instanceof EqpApiError) {
    return error.payload.errorMsg
  }

  return fallbackMessage
}

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

  const selectableParamVersions = useMemo(() => {
    const uniqueVersions = new Set<string>()

    return (detail?.paramVersions ?? []).filter((option) => {
      const normalizedVersion = option.paramVersion.trim()
      if (!normalizedVersion || normalizedVersion === 'EDIT' || uniqueVersions.has(normalizedVersion)) {
        return false
      }

      uniqueVersions.add(normalizedVersion)
      return true
    })
  }, [detail])

  const selectedVersionParamsQuery = useEqpParams(
    open ? detail?.eqpId ?? null : null,
    open && selectedParamVersion ? selectedParamVersion : null,
  )

  useEffect(() => {
    if (!open) {
      return
    }

    const nextSelectedVersion =
      selectableParamVersions.find((option) => option.paramVersion === detail?.appliedParamVersion)
        ?.paramVersion ??
      selectableParamVersions[0]?.paramVersion ??
      ''

    setSelectedParamVersion(nextSelectedVersion)
    setLocalErrorMessage(null)
  }, [open, detail, selectableParamVersions])

  const selectedParamOption = useMemo(
    () =>
      selectableParamVersions.find((option) => option.paramVersion === selectedParamVersion) ?? null,
    [selectableParamVersions, selectedParamVersion],
  )

  const selectedVersionDescription = useMemo(() => {
    const summaryDescription = selectedParamOption?.description?.trim()
    if (summaryDescription) {
      return summaryDescription
    }

    const detailDescription = selectedVersionParamsQuery.data?.[0]?.description?.trim()
    return detailDescription ?? ''
  }, [selectedParamOption, selectedVersionParamsQuery.data])

  const selectedVersionParamRows = useMemo(
    () =>
      (selectedVersionParamsQuery.data ?? []).map((param) => ({
        paramName: param.paramName,
        paramValue: param.paramValue ?? '',
      })),
    [selectedVersionParamsQuery.data],
  )

  const mergedErrorMessage = localErrorMessage ?? errorMessage
  const selectedVersionErrorMessage = selectedVersionParamsQuery.error
    ? resolveErrorMessage(selectedVersionParamsQuery.error, '선택 버전의 파라미터를 조회하지 못했습니다.')
    : null

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
      <DialogContent
        className="z-[60] max-h-[85vh] max-w-[760px] overflow-hidden rounded-2xl p-0"
        showCloseButton={!isPending}
      >
        <div className="flex max-h-[85vh] min-h-0 flex-col">
          <DialogHeader className="shrink-0 border-b border-[#E4EAE6] px-6 py-5">
            <DialogTitle>Eqp Parameter Update</DialogTitle>
            <DialogDescription>
              현재 EQP에 적용 중인 parameter version을 다른 버전으로 교체합니다.
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            {isLoading && !detail ? (
              <div className="flex min-h-40 items-center justify-center text-sm text-[#65726B]">
                <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
                설비 관리 정보를 불러오는 중입니다.
              </div>
            ) : (
              <div className="space-y-4">
                <section className="grid gap-4 rounded-2xl border border-[#E4EAE6] bg-[#FAFCFB] p-4 md:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold text-[#1E3D33]">현재 적용 Version</p>
                    <Input
                      readOnly
                      value={detail?.appliedParamVersion ?? ''}
                      placeholder="-"
                      className="mt-1 h-11 border-[#E4EAE6] bg-[#F4F7F5] text-[#51605A]"
                    />
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-[#1E3D33]">현재 Description</p>
                    <Input
                      readOnly
                      value={detail?.appliedParamDescription ?? ''}
                      placeholder="설명이 없습니다."
                      className="mt-1 h-11 border-[#E4EAE6] bg-[#F4F7F5] text-[#51605A]"
                    />
                  </div>
                </section>

                <section className="space-y-3 rounded-2xl border border-[#E4EAE6] bg-[#FAFCFB] p-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-[#1E3D33]">변경 대상 Param Version</label>
                    <Select
                      value={toSelectValue(selectedParamVersion)}
                      onValueChange={setSelectedParamVersion}
                      disabled={isPending || selectableParamVersions.length === 0}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Param Version을 선택해 주세요." />
                      </SelectTrigger>
                      <SelectContent>
                        {selectableParamVersions.map((option) => (
                          <SelectItem key={option.paramVersion} value={option.paramVersion}>
                            {option.paramVersion}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-[#1E3D33]">선택 Version Description</p>
                    <Input
                      readOnly
                      value={selectedVersionDescription}
                      placeholder="설명이 없습니다."
                      className="mt-1 h-11 border-[#D7E1DB] bg-white text-[#243129]"
                    />
                  </div>
                </section>

                <section className="space-y-3 rounded-2xl border border-[#E4EAE6] bg-white p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-semibold text-[#1F2D26]">선택 Version 상세</h3>
                      <p className="mt-1 text-xs text-[#65726B]">
                        선택한 버전의 param name / param value를 읽기 전용으로 확인합니다.
                      </p>
                    </div>
                    {selectedVersionParamsQuery.isFetching ? (
                      <span className="inline-flex items-center gap-1 text-xs text-[#65726B]">
                        <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                        조회 중
                      </span>
                    ) : null}
                  </div>

                  <div className="min-h-0 overflow-auto rounded-xl border border-[#DCE5DB]">
                    <Table className="min-w-[520px]">
                      <TableHeader>
                        <TableRow className="bg-[#66706B] [&>th]:text-[#F5F7F4]">
                          <TableHead>Param Name</TableHead>
                          <TableHead>Param Value</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedVersionParamsQuery.isLoading ? (
                          <TableRow>
                            <TableCell colSpan={2} className="py-10 text-center text-sm text-[#647169]">
                              <span className="inline-flex items-center gap-2">
                                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                                버전 상세를 불러오는 중입니다.
                              </span>
                            </TableCell>
                          </TableRow>
                        ) : selectedVersionParamRows.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={2} className="py-10 text-center text-sm text-[#647169]">
                              설정된 파라미터가 없습니다.
                            </TableCell>
                          </TableRow>
                        ) : (
                          selectedVersionParamRows.map((row) => (
                            <TableRow key={row.paramName}>
                              <TableCell>{row.paramName}</TableCell>
                              <TableCell>{row.paramValue || '-'}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {selectedVersionErrorMessage ? (
                    <p className="rounded-xl border border-[#F0D2D0] bg-[#FFF7F7] px-3 py-2 text-sm text-[#B4483F]">
                      {selectedVersionErrorMessage}
                    </p>
                  ) : null}
                </section>

                {selectableParamVersions.length === 0 ? (
                  <p className="rounded-xl border border-[#F0D9C7] bg-[#FFF7F1] px-3 py-2 text-sm text-[#A7662B]">
                    변경 가능한 Param Version이 없습니다.
                  </p>
                ) : null}

                {mergedErrorMessage ? (
                  <p className="rounded-xl border border-[#F0D2D0] bg-[#FFF7F7] px-3 py-2 text-sm text-[#B4483F]">
                    {mergedErrorMessage}
                  </p>
                ) : null}
              </div>
            )}
          </div>

          <DialogFooter className="shrink-0 border-t border-[#E4EAE6] px-6 py-4 sm:justify-end">
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
              disabled={isPending || isLoading || !detail || selectableParamVersions.length === 0}
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
