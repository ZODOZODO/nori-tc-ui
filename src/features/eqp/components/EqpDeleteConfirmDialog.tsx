import { ConfirmDialog } from '@/components/ui/confirm-dialog'

interface EqpDeleteConfirmDialogProps {
  open: boolean
  eqpId: string | null
  isPending: boolean
  errorMessage: string | null
  onOpenChange: (open: boolean) => void
  onConfirm: () => void | Promise<void>
}

/**
 * EQP 삭제 전 최종 확인을 받는 다이얼로그입니다.
 * 백엔드는 END 선행과 rollback을 수행하므로, UI에서는 의도를 명확히 확인하는 역할만 담당합니다.
 */
export function EqpDeleteConfirmDialog({
  open,
  eqpId,
  isPending,
  errorMessage,
  onOpenChange,
  onConfirm,
}: EqpDeleteConfirmDialogProps) {
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!isPending) {
          onOpenChange(nextOpen)
        }
      }}
      title="Eqp Delete"
      description={
        eqpId
          ? `${eqpId} 설비를 삭제하시겠습니까? 삭제 전에 runtime 종료를 시도하며, 실패하면 삭제가 중단됩니다.`
          : '선택한 설비를 삭제하시겠습니까?'
      }
      confirmText="Delete"
      cancelText="Cancel"
      confirmVariant="destructive"
      isConfirming={isPending}
      onConfirm={() => {
        void onConfirm()
      }}
    >
      {errorMessage ? (
        <p className="rounded-xl border border-[#F0D2D0] bg-[#FFF7F7] px-3 py-2 text-sm text-[#B4483F]">
          {errorMessage}
        </p>
      ) : null}
    </ConfirmDialog>
  )
}
