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
  onSave: () => void
  onUndo: () => void
  onCancel: () => void
}

/**
 * Check In 동작을 확인하는 모달입니다.
 * Save/Undo/Cancel 시나리오를 분리해 편집 상태 전환을 명확히 제어합니다.
 */
export function CheckInModal({
  open,
  isPending,
  errorMessage,
  onOpenChange,
  onSave,
  onUndo,
  onCancel,
}: CheckInModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="z-[60] max-w-[460px] rounded-2xl" showCloseButton={!isPending}>
        <DialogHeader>
          <DialogTitle>변경 내용을 저장하시겠습니까?</DialogTitle>
          <DialogDescription>
            Save는 변경값을 서버로 저장하고 읽기 모드로 전환합니다. Undo는 변경을 되돌립니다.
          </DialogDescription>
        </DialogHeader>

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
            variant="outline"
            className="h-9 rounded-full border-[#D7E1DB] px-4 text-xs font-semibold"
            onClick={onUndo}
            disabled={isPending}
          >
            Undo
          </Button>
          <Button
            type="button"
            className="h-9 rounded-full bg-[#1C7F59] px-4 text-xs font-semibold text-white hover:bg-[#166749]"
            onClick={onSave}
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
