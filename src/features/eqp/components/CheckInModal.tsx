import { useState } from 'react'
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

interface CheckInModalProps {
  open: boolean
  isPending: boolean
  errorMessage: string | null
  onOpenChange: (open: boolean) => void
  onSave: (version: string, description: string) => void
  onCancel: () => void
}

/**
 * Check In 동작을 확인하는 모달입니다.
 * 버전명(필수)과 변경 설명(선택)을 입력하고 저장합니다.
 */
export function CheckInModal({
  open,
  isPending,
  errorMessage,
  onOpenChange,
  onSave,
  onCancel,
}: CheckInModalProps) {
  const [version, setVersion] = useState('')
  const [description, setDescription] = useState('')

  const handleOpenChange = (nextOpen: boolean) => {
    if (!isPending) {
      // 모달이 닫힐 때 입력값 초기화
      if (!nextOpen) {
        setVersion('')
        setDescription('')
      }
      onOpenChange(nextOpen)
    }
  }

  const handleSave = () => {
    if (!version.trim()) {
      return
    }
    onSave(version.trim(), description.trim())
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="z-[60] max-w-[460px] rounded-2xl" showCloseButton={!isPending}>
        <DialogHeader>
          <DialogTitle>Check In</DialogTitle>
          <DialogDescription>
            새 버전명을 입력하고 Save를 누르면 편집 내용이 저장됩니다.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="checkin-version" className="text-xs font-semibold text-[#1E3D33]">
              Version <span className="text-[#C5534B]">*</span>
            </label>
            <input
              id="checkin-version"
              type="text"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              placeholder="예: v1.2.3"
              disabled={isPending}
              className="h-9 rounded-lg border border-[#97A8A1] bg-white px-3 text-xs text-[#1E3D33] placeholder-[#8A8A8A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1C7F59]/30 disabled:cursor-not-allowed disabled:bg-[#F5F8F6]"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="checkin-description" className="text-xs font-semibold text-[#1E3D33]">
              Description
            </label>
            <textarea
              id="checkin-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="변경 내용 설명 (선택)"
              disabled={isPending}
              rows={3}
              className="rounded-lg border border-[#97A8A1] bg-white px-3 py-2 text-xs text-[#1E3D33] placeholder-[#8A8A8A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1C7F59]/30 disabled:cursor-not-allowed disabled:bg-[#F5F8F6] resize-none"
            />
          </div>
        </div>

        {errorMessage ? (
          <p className="rounded-md border border-[#F0D2D0] bg-[#FFF7F7] px-3 py-2 text-sm text-[#B4483F]">
            {errorMessage}
          </p>
        ) : null}

        <DialogFooter className="gap-2 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            className="h-9 rounded-full border-[#D7E1DB] px-4 text-xs font-semibold"
            onClick={onCancel}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="h-9 rounded-full bg-[#1C7F59] px-4 text-xs font-semibold text-white hover:bg-[#166749]"
            onClick={handleSave}
            disabled={isPending || !version.trim()}
          >
            {isPending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
