import { Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  MODEL_DETAIL_NODE_LABELS,
  SECS_DETAIL_NODES,
  SOCKET_DETAIL_NODES,
  type ModelDetailNode,
  type ModelDetailRow,
  type ModelMdfContent,
  type ModelInfo,
  type ModelOpenedTab,
} from '../types/model.types'

interface ModelDetailPanelProps {
  openedTabs: ModelOpenedTab[]
  activeTab: number | null
  activeModel: ModelInfo | null
  detailNode: ModelDetailNode | null
  detailColumns: string[]
  detailRows: ModelDetailRow[]
  mdfContents: ModelMdfContent[]
  isDetailLoading: boolean
  detailErrorMessage: string | null
  isEditMode: boolean
  isLockedByOtherUser: boolean
  lockOwner: string | null
  isCheckoutPending: boolean
  isCheckinPending: boolean
  actionErrorMessage: string | null
  onSelectTab: (modelVersionKey: number) => void
  onCloseTab: (modelVersionKey: number) => void
  onSelectDetailNode: (node: ModelDetailNode) => void
  onChangeDetailValue: (rowId: string, columnIndex: number, nextValue: string) => void
  onCheckOut: () => void
  onRequestCheckIn: () => void
}

/**
 * 통신 인터페이스에 맞는 상세 노드 집합을 반환합니다.
 */
const resolveDetailNodes = (model: ModelInfo | null): ModelDetailNode[] => {
  if (!model) {
    return []
  }

  const normalizedInterface = model.commInterface.toUpperCase()
  return normalizedInterface === 'SOCKET' ? SOCKET_DETAIL_NODES : SECS_DETAIL_NODES
}

/**
 * Model Version 상세 패널입니다.
 * - 탭 전환
 * - DetailSidebar 노드 전환
 * - Check Out / Check In 전환
 * - 임시 상세 데이터 테이블(잠금/편집 모드 반영)
 */
export function ModelDetailPanel({
  openedTabs,
  activeTab,
  activeModel,
  detailNode,
  detailColumns,
  detailRows,
  mdfContents,
  isDetailLoading,
  detailErrorMessage,
  isEditMode,
  isLockedByOtherUser,
  lockOwner,
  isCheckoutPending,
  isCheckinPending,
  actionErrorMessage,
  onSelectTab,
  onCloseTab,
  onSelectDetailNode,
  onChangeDetailValue,
  onCheckOut,
  onRequestCheckIn,
}: ModelDetailPanelProps) {
  const detailNodes = resolveDetailNodes(activeModel)
  const normalizedDetailNode = detailNode ?? detailNodes[0] ?? null
  const normalizedDetailColumns = detailColumns.length > 0 ? detailColumns : ['Value']
  const isMdfNode = normalizedDetailNode === 'mdf'
  const isBranchModel = Boolean(activeModel?.parentModel?.trim())
  const isDeprecatedBranch =
    isBranchModel && activeModel?.status.trim().toUpperCase() === 'DEPRECATED'
  const isReadOnly = !isEditMode || isLockedByOtherUser

  const hintText = !activeModel
    ? '모델을 선택해 주세요.'
    : !isBranchModel
      ? 'Root model은 항상 읽기 전용입니다.'
      : isDeprecatedBranch
        ? 'DEPRECATED branch는 읽기 전용입니다.'
        : isReadOnly
          ? 'Read-only (Check Out): explicit checkout required'
          : 'Editable (Check In): table unlocked'

  const checkoutDisabled =
    !activeModel ||
    !isBranchModel ||
    isDeprecatedBranch ||
    isCheckoutPending ||
    isLockedByOtherUser
  const checkinDisabled =
    !activeModel ||
    !isBranchModel ||
    isCheckinPending ||
    !isEditMode ||
    isLockedByOtherUser

  return (
    <section
      className={cn(
        'flex h-full min-h-0 flex-col rounded-2xl border border-[#E4EAE6] bg-white p-4',
        isEditMode && !isLockedByOtherUser ? 'border-[#7C9082]' : null,
      )}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto pb-1">
          {openedTabs.length === 0 ? (
            <span className="text-xs text-[#8A8A8A]">더블 클릭으로 열린 모델 탭이 없습니다.</span>
          ) : (
            openedTabs.map((tab) => (
              <div
                key={tab.modelVersionKey}
                className={cn(
                  'flex shrink-0 items-center rounded-lg border',
                  activeTab === tab.modelVersionKey
                    ? 'border-[#7C9082] bg-[#EEF4F0] text-[#1E3D33]'
                    : 'border-[#DCE5E0] bg-white text-[#5B6962] hover:bg-[#F3F7F5]',
                )}
              >
                <button
                  type="button"
                  onClick={() => onSelectTab(tab.modelVersionKey)}
                  className="px-3 py-1.5 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1C7F59]/30"
                >
                  {tab.modelName} / {tab.modelVersion}
                </button>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation()
                    onCloseTab(tab.modelVersionKey)
                  }}
                  className={cn(
                    'mr-1 inline-flex size-6 items-center justify-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1C7F59]/30',
                    activeTab === tab.modelVersionKey
                      ? 'text-[#365447] hover:bg-[#DCE9E2]'
                      : 'text-[#7B8882] hover:bg-[#E8EFEB]',
                  )}
                  aria-label={`${tab.modelName} ${tab.modelVersion} 탭 닫기`}
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

        {isBranchModel && isEditMode ? (
          <Button
            type="button"
            variant="outline"
            className="h-8 rounded-[10px] border-[#B8C9C1] bg-[#F3F7F5] px-3 text-xs font-semibold text-[#1E3D33]"
            onClick={onRequestCheckIn}
            disabled={checkinDisabled}
          >
            {isCheckinPending ? <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> : null}
            Check In
          </Button>
        ) : isBranchModel ? (
          <Button
            type="button"
            variant="outline"
            className="h-8 rounded-[10px] border-[#B8C9C1] bg-[#F3F7F5] px-3 text-xs font-semibold text-[#1E3D33]"
            onClick={onCheckOut}
            disabled={checkoutDisabled}
          >
            {isCheckoutPending ? <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> : null}
            Check Out
          </Button>
        ) : null}
      </div>

      <div className="mb-3 text-xs">
        <span className={cn(isReadOnly ? 'text-[#8A8A8A]' : 'font-medium text-[#7C9082]')}>{hintText}</span>
      </div>

      {isBranchModel && isLockedByOtherUser ? (
        <p className="mb-3 text-xs text-[#C5534B]">
          {lockOwner
            ? `${lockOwner}님이 EDIT 모델을 점유하고 있어 수정할 수 없습니다.`
            : '다른 사용자가 EDIT 모델을 점유하고 있어 수정할 수 없습니다.'}
        </p>
      ) : null}

      {actionErrorMessage ? <p className="mb-3 text-xs text-[#C5534B]">{actionErrorMessage}</p> : null}

      <div className="flex min-h-0 flex-1 overflow-hidden rounded-xl border border-[#E4EAE6]">
        <aside className="flex w-[220px] shrink-0 flex-col border-r border-[#E4EAE6] bg-[#FAFCFB] p-2">
          {detailNodes.map((node) => (
            <button
              key={node}
              type="button"
              onClick={() => onSelectDetailNode(node)}
              className={cn(
                'rounded-md px-3 py-2 text-left text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1C7F59]/30',
                normalizedDetailNode === node
                  ? 'bg-[#EAF5EE] font-semibold text-[#1F2D26]'
                  : 'text-[#51605A] hover:bg-[#F1F6F3]',
              )}
            >
              {MODEL_DETAIL_NODE_LABELS[node]}
            </button>
          ))}
        </aside>

        <div className="min-h-0 flex-1 overflow-auto p-3">
          {isMdfNode ? (
            <div className="flex min-h-full flex-col space-y-3">
              {isDetailLoading ? (
                <p className="text-sm text-[#647169]">MDF 데이터를 불러오는 중입니다.</p>
              ) : null}

              {detailErrorMessage ? <p className="text-sm text-[#C5534B]">{detailErrorMessage}</p> : null}

              {!isDetailLoading && !detailErrorMessage && mdfContents.length === 0 ? (
                <p className="text-sm text-[#647169]">표시할 MDF 데이터가 없습니다.</p>
              ) : null}

              {mdfContents.map((content) => (
                <div key={content.id} className="flex min-h-[340px] flex-1 flex-col space-y-1">
                  <p className="text-xs font-medium text-[#44544D]">{`DEFAULT: ${content.name || 'MDF'}`}</p>
                  <textarea
                    readOnly
                    value={content.xml}
                    className="min-h-[320px] w-full flex-1 resize-none rounded-lg border border-[#DCE5E0] bg-[#FAFCFB] p-3 font-mono text-xs text-[#22322B] focus-visible:outline-none"
                  />
                </div>
              ))}
            </div>
          ) : (
            <Table className="min-w-[760px]">
              <TableHeader>
                <TableRow className="bg-[#F6F9F7]">
                  {normalizedDetailColumns.map((columnName) => (
                    <TableHead key={columnName}>{columnName}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isDetailLoading ? (
                  <TableRow>
                    <TableCell colSpan={normalizedDetailColumns.length} className="py-10 text-center text-sm text-[#647169]">
                      상세 데이터를 불러오는 중입니다.
                    </TableCell>
                  </TableRow>
                ) : detailErrorMessage ? (
                  <TableRow>
                    <TableCell colSpan={normalizedDetailColumns.length} className="py-10 text-center text-sm text-[#C5534B]">
                      {detailErrorMessage}
                    </TableCell>
                  </TableRow>
                ) : detailRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={normalizedDetailColumns.length} className="py-10 text-center text-sm text-[#647169]">
                      표시할 상세 데이터가 없습니다.
                    </TableCell>
                  </TableRow>
                ) : (
                  detailRows.map((row) => (
                    <TableRow key={row.id}>
                      {normalizedDetailColumns.map((_, columnIndex) => (
                        <TableCell key={`${row.id}-${columnIndex}`}>
                          {isReadOnly ? (
                            row.values[columnIndex] || '—'
                          ) : (
                            <Input
                              value={row.values[columnIndex] ?? ''}
                              onChange={(event) =>
                                onChangeDetailValue(row.id, columnIndex, event.target.value)
                              }
                              className="h-8"
                            />
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </section>
  )
}
