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
  onSave: (description: string) => void
  onCancel: () => void
}

/**
 * Check In 동작을 확인하는 모달입니다.
 * 버전은 서버가 자동 생성하고, 사용자는 변경 설명만 입력합니다.
 */
export function CheckInModal({
  open,
  isPending,
  errorMessage,
  onOpenChange,
  onSave,
  onCancel,
}: CheckInModalProps) {
  const [description, setDescription] = useState('')

  const handleOpenChange = (nextOpen: boolean) => {
    if (!isPending) {
      // 모달이 닫힐 때 입력값 초기화
      if (!nextOpen) {
        setDescription('')
      }
      onOpenChange(nextOpen)
    }
  }

  const handleSave = () => {
    onSave(description.trim())
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="z-[60] max-w-[460px] rounded-2xl" showCloseButton={!isPending}>
        <DialogHeader>
          <DialogTitle>Check In</DialogTitle>
          <DialogDescription>
            버전은 서버가 `YY.MM.DD.0000` 형식으로 자동 생성합니다.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[#1E3D33]">
              Version
            </label>
            <div className="rounded-lg border border-[#D7E1DB] bg-[#F5F8F6] px-3 py-2 text-xs text-[#51605A]">
              저장 시 자동 생성됩니다. 예: 25.03.12.0000
            </div>
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
            disabled={isPending}
          >
            {isPending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
