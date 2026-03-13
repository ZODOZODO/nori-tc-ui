import { useMemo, useRef, useState, type ChangeEvent } from 'react'
import { Loader2, MoreHorizontal, Plus, RotateCcw, Trash2, Upload, X } from 'lucide-react'
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
import { cn } from '@/lib/utils'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  buildActionDataIndexValue,
  buildWorkflowFilterValue,
  createEmptyActionDataIndexField,
  createEmptyWorkflowFilterCondition,
  parseActionDataIndexEditor,
  parseWorkflowFilterEditor,
  summarizeActionDataIndexValue,
  summarizeWorkflowFilterValue,
  type ActionDataIndexEditorDraft,
  type ActionDataIndexFieldDraft,
  type ModelVariableSource,
  type WorkflowFilterConditionDraft,
  type WorkflowFilterEditorDraft,
  type WorkflowFilterOperator,
} from '../lib/model-detail-editor'
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

const WORKFLOW_MODAL_EDITABLE_COLUMNS = new Set(['filter', 'data index'])
const VARIABLE_SOURCE_OPTIONS: ModelVariableSource[] = ['AUTO', 'MSG', 'CTX']
const FILTER_OPERATOR_OPTIONS: WorkflowFilterOperator[] = [
  'eq',
  'ne',
  'gt',
  'gte',
  'lt',
  'lte',
  'contains',
  'in',
]

interface WorkflowTextEditorState {
  rowId: string
  rowLabel: string
  columnIndex: number
  columnName: string
}

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
  isDetailSavePending: boolean
  isMdfUploadPending: boolean
  actionErrorMessage: string | null
  onSelectTab: (modelVersionKey: number) => void
  onCloseTab: (modelVersionKey: number) => void
  onSelectDetailNode: (node: ModelDetailNode) => void
  onChangeDetailValue: (rowId: string, columnIndex: number, nextValue: string) => void
  onAddDetailRow: () => void
  onDeleteDetailRow: (rowId: string) => void
  onSaveDetailRows: () => void
  onUndo: () => void
  onUploadMdf: (file: File) => void
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
 * workflow의 Filter/Data Index 컬럼은 구조화 편집 대상으로 분기합니다.
 */
const isWorkflowModalEditableColumn = (
  detailNode: ModelDetailNode | null,
  columnName: string | undefined,
): boolean => {
  if (detailNode !== 'workflow' || !columnName) {
    return false
  }

  return WORKFLOW_MODAL_EDITABLE_COLUMNS.has(columnName.trim().toLowerCase())
}

const isFilterColumn = (columnName: string | undefined): boolean =>
  (columnName ?? '').trim().toLowerCase() === 'filter'

const isDataIndexColumn = (columnName: string | undefined): boolean =>
  (columnName ?? '').trim().toLowerCase() === 'data index'

const resolveWorkflowPreviewValue = (row: ModelDetailRow, columnIndex: number, columnName: string): string => {
  const storedPreview = row.previewValues[columnIndex]?.trim()
  if (storedPreview) {
    return storedPreview
  }

  const rawValue = row.values[columnIndex] ?? ''
  if (isFilterColumn(columnName)) {
    return summarizeWorkflowFilterValue(rawValue)
  }

  if (isDataIndexColumn(columnName)) {
    return summarizeActionDataIndexValue(rawValue)
  }

  return rawValue
}

const updateWorkflowFilterDraftRow = (
  rows: WorkflowFilterConditionDraft[],
  targetId: string,
  patch: Partial<WorkflowFilterConditionDraft>,
): WorkflowFilterConditionDraft[] =>
  rows.map((row) => (row.id === targetId ? { ...row, ...patch } : row))

const updateActionDataIndexDraftRow = (
  rows: ActionDataIndexFieldDraft[],
  targetId: string,
  patch: Partial<ActionDataIndexFieldDraft>,
): ActionDataIndexFieldDraft[] =>
  rows.map((row) => (row.id === targetId ? { ...row, ...patch } : row))

/**
 * Model Version 상세 패널입니다.
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
  isDetailSavePending,
  isMdfUploadPending,
  actionErrorMessage,
  onSelectTab,
  onCloseTab,
  onSelectDetailNode,
  onChangeDetailValue,
  onAddDetailRow,
  onDeleteDetailRow,
  onSaveDetailRows,
  onUndo,
  onUploadMdf,
  onCheckOut,
  onRequestCheckIn,
}: ModelDetailPanelProps) {
  const [workflowTextEditor, setWorkflowTextEditor] = useState<WorkflowTextEditorState | null>(null)
  const [workflowFilterDraft, setWorkflowFilterDraft] = useState<WorkflowFilterEditorDraft>(() =>
    parseWorkflowFilterEditor(''),
  )
  const [actionDataIndexDraft, setActionDataIndexDraft] = useState<ActionDataIndexEditorDraft>(() =>
    parseActionDataIndexEditor(''),
  )
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const detailNodes = resolveDetailNodes(activeModel)
  const normalizedDetailNode = detailNode ?? detailNodes[0] ?? null
  const normalizedDetailColumns = detailColumns.length > 0 ? detailColumns : ['Value']
  const isMdfNode = normalizedDetailNode === 'mdf'
  const isBranchModel = Boolean(activeModel?.parentModel?.trim())
  const isDeprecatedBranch =
    isBranchModel && activeModel?.status.trim().toUpperCase() === 'DEPRECATED'
  const isReadOnly = !isEditMode || isLockedByOtherUser
  const isWorkflowEditorOpen =
    workflowTextEditor !== null && !isReadOnly && normalizedDetailNode === 'workflow'
  const canEditTableRows = !isReadOnly && !isMdfNode

  const hintText = !activeModel
    ? '모델을 선택해 주세요.'
    : !isBranchModel
      ? 'Root model은 항상 읽기 전용입니다.'
      : isDeprecatedBranch
        ? 'DEPRECATED branch는 읽기 전용입니다.'
        : isReadOnly
          ? '읽기 전용입니다. 수정하려면 Check Out이 필요합니다.'
          : '편집 중입니다. Save로 저장하고 Check In으로 확정할 수 있습니다.'

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
  const saveDisabled =
    isDetailLoading || isDetailSavePending || !isEditMode || isLockedByOtherUser || isMdfNode

  const workflowEditorTitle = useMemo(() => {
    if (!workflowTextEditor) {
      return ''
    }

    if (!workflowTextEditor.rowLabel) {
      return workflowTextEditor.columnName
    }

    return `${workflowTextEditor.rowLabel} / ${workflowTextEditor.columnName}`
  }, [workflowTextEditor])

  const handleOpenWorkflowTextEditor = (row: ModelDetailRow, columnIndex: number) => {
    const columnName = normalizedDetailColumns[columnIndex]
    if (!isWorkflowModalEditableColumn(normalizedDetailNode, columnName) || isReadOnly) {
      return
    }

    const value = row.values[columnIndex] ?? ''
    setWorkflowTextEditor({
      rowId: row.id,
      rowLabel: row.values[0] ?? '',
      columnIndex,
      columnName,
    })

    if (isFilterColumn(columnName)) {
      setWorkflowFilterDraft(parseWorkflowFilterEditor(value))
    } else {
      setActionDataIndexDraft(parseActionDataIndexEditor(value))
    }
  }

  const handleCloseWorkflowTextEditor = () => {
    setWorkflowTextEditor(null)
  }

  const handleSaveWorkflowTextEditor = () => {
    if (!workflowTextEditor) {
      return
    }

    const nextValue = isFilterColumn(workflowTextEditor.columnName)
      ? buildWorkflowFilterValue(workflowFilterDraft)
      : buildActionDataIndexValue(actionDataIndexDraft)

    onChangeDetailValue(workflowTextEditor.rowId, workflowTextEditor.columnIndex, nextValue)
    handleCloseWorkflowTextEditor()
  }

  const handleTriggerUpload = () => {
    if (isReadOnly || !isMdfNode) {
      return
    }
    fileInputRef.current?.click()
  }

  const handleUploadFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (selectedFile) {
      onUploadMdf(selectedFile)
    }
    event.target.value = ''
  }

  return (
    <>
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
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-8 rounded-[10px] border-[#B8C9C1] bg-[#F3F7F5] px-3 text-xs font-semibold text-[#1E3D33]"
                onClick={onUndo}
                disabled={isDetailSavePending || isCheckinPending || isMdfUploadPending}
              >
                <RotateCcw className="size-3.5" aria-hidden="true" />
                Undo
              </Button>
              {isMdfNode ? (
                <Button
                  type="button"
                  variant="outline"
                  className="h-8 rounded-[10px] border-[#B8C9C1] bg-[#F3F7F5] px-3 text-xs font-semibold text-[#1E3D33]"
                  onClick={handleTriggerUpload}
                  disabled={isMdfUploadPending || isLockedByOtherUser}
                >
                  {isMdfUploadPending ? (
                    <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                  ) : (
                    <Upload className="size-3.5" aria-hidden="true" />
                  )}
                  Upload
                </Button>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-8 rounded-[10px] border-[#B8C9C1] bg-[#F3F7F5] px-3 text-xs font-semibold text-[#1E3D33]"
                    onClick={onSaveDetailRows}
                    disabled={saveDisabled}
                  >
                    {isDetailSavePending ? (
                      <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                    ) : null}
                    Save
                  </Button>
                </>
              )}
              <Button
                type="button"
                variant="outline"
                className="h-8 rounded-[10px] border-[#B8C9C1] bg-[#F3F7F5] px-3 text-xs font-semibold text-[#1E3D33]"
                onClick={onRequestCheckIn}
                disabled={checkinDisabled}
              >
                {isCheckinPending ? (
                  <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                ) : null}
                Check In
              </Button>
            </div>
          ) : isBranchModel ? (
            <Button
              type="button"
              variant="outline"
              className="h-8 rounded-[10px] border-[#B8C9C1] bg-[#F3F7F5] px-3 text-xs font-semibold text-[#1E3D33]"
              onClick={onCheckOut}
              disabled={checkoutDisabled}
            >
              {isCheckoutPending ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
              ) : null}
              Check Out
            </Button>
          ) : null}
        </div>

        <div className="mb-3 text-xs">
          <span className={cn(isReadOnly ? 'text-[#8A8A8A]' : 'font-medium text-[#7C9082]')}>
            {hintText}
          </span>
        </div>

        {isBranchModel && isLockedByOtherUser ? (
          <p className="mb-3 text-xs text-[#C5534B]">
            {lockOwner
              ? `${lockOwner}님이 EDIT 모델을 점유하고 있어 수정할 수 없습니다.`
              : '다른 사용자가 EDIT 모델을 점유하고 있어 수정할 수 없습니다.'}
          </p>
        ) : null}

        {actionErrorMessage ? (
          <p className="mb-3 text-xs text-[#C5534B]">{actionErrorMessage}</p>
        ) : null}

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
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xml,text/xml,application/xml"
                  className="hidden"
                  onChange={handleUploadFileChange}
                />

                {isDetailLoading ? (
                  <p className="text-sm text-[#647169]">MDF 데이터를 불러오는 중입니다.</p>
                ) : null}

                {detailErrorMessage ? (
                  <p className="text-sm text-[#C5534B]">{detailErrorMessage}</p>
                ) : null}

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
              <div className="flex h-full min-h-0 flex-col">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-base font-semibold text-[#213028]">
                    {MODEL_DETAIL_NODE_LABELS[normalizedDetailNode ?? 'model-parameter']}
                  </h2>

                  {canEditTableRows ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="h-8 rounded-[10px] border-[#B8C9C1] bg-[#F3F7F5] px-3 text-xs font-semibold text-[#1E3D33]"
                      onClick={onAddDetailRow}
                    >
                      <Plus className="size-3.5" aria-hidden="true" />
                      행 추가
                    </Button>
                  ) : null}
                </div>

                <div className="min-h-0 flex-1 overflow-auto">
                  <Table className="min-w-[760px]">
                    <TableHeader>
                      <TableRow className="bg-[#F6F9F7]">
                        {normalizedDetailColumns.map((columnName) => (
                          <TableHead key={columnName}>{columnName}</TableHead>
                        ))}
                        {canEditTableRows ? <TableHead className="w-[92px]">작업</TableHead> : null}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isDetailLoading ? (
                        <TableRow>
                          <TableCell
                            colSpan={normalizedDetailColumns.length + (canEditTableRows ? 1 : 0)}
                            className="py-10 text-center text-sm text-[#647169]"
                          >
                            상세 데이터를 불러오는 중입니다.
                          </TableCell>
                        </TableRow>
                      ) : detailErrorMessage ? (
                        <TableRow>
                          <TableCell
                            colSpan={normalizedDetailColumns.length + (canEditTableRows ? 1 : 0)}
                            className="py-10 text-center text-sm text-[#C5534B]"
                          >
                            {detailErrorMessage}
                          </TableCell>
                        </TableRow>
                      ) : detailRows.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={normalizedDetailColumns.length + (canEditTableRows ? 1 : 0)}
                            className="py-10 text-center text-sm text-[#647169]"
                          >
                            {canEditTableRows
                              ? '편집 중인 상세 데이터가 없습니다. 행 추가로 row를 추가하거나 Undo로 체크아웃을 취소해 주세요.'
                              : '표시할 상세 데이터가 없습니다.'}
                          </TableCell>
                        </TableRow>
                      ) : (
                        detailRows.map((row) => (
                          <TableRow key={row.id}>
                            {normalizedDetailColumns.map((columnName, columnIndex) => {
                              const rawValue = row.values[columnIndex] ?? ''
                              const displayValue = isWorkflowModalEditableColumn(
                                normalizedDetailNode,
                                columnName,
                              )
                                ? resolveWorkflowPreviewValue(row, columnIndex, columnName)
                                : rawValue

                              return (
                                <TableCell key={`${row.id}-${columnIndex}`}>
                                  {isReadOnly ? (
                                    <span
                                      className={cn(
                                        'block max-w-[320px] truncate text-sm text-[#22322B]',
                                        displayValue ? null : 'text-[#8A8A8A]',
                                      )}
                                      title={displayValue || rawValue}
                                    >
                                      {displayValue || '—'}
                                    </span>
                                  ) : isWorkflowModalEditableColumn(
                                      normalizedDetailNode,
                                      columnName,
                                    ) ? (
                                    <div
                                      className="group flex min-h-8 items-center gap-2 rounded-md border border-[#DCE5E0] bg-white px-2 py-1.5"
                                      onDoubleClick={() =>
                                        handleOpenWorkflowTextEditor(row, columnIndex)
                                      }
                                    >
                                      <span
                                        className={cn(
                                          'min-w-0 flex-1 text-sm text-[#22322B]',
                                          displayValue ? 'truncate' : 'text-[#8A8A8A]',
                                        )}
                                        title={displayValue || rawValue}
                                      >
                                        {displayValue || '—'}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleOpenWorkflowTextEditor(row, columnIndex)
                                        }
                                        className="inline-flex size-7 shrink-0 items-center justify-center rounded-md border border-transparent text-[#5B6962] transition hover:border-[#DCE5E0] hover:bg-[#F3F7F5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1C7F59]/30"
                                        aria-label={`${row.values[0] ?? 'workflow'} ${columnName} 편집`}
                                      >
                                        <MoreHorizontal className="size-3.5" />
                                      </button>
                                    </div>
                                  ) : (
                                    <Input
                                      value={rawValue}
                                      onChange={(event) =>
                                        onChangeDetailValue(row.id, columnIndex, event.target.value)
                                      }
                                      className="h-8"
                                    />
                                  )}
                                </TableCell>
                              )
                            })}

                            {canEditTableRows ? (
                              <TableCell>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon-sm"
                                  className="size-8 rounded-lg text-[#6A7971] hover:bg-[#F3F7F5] hover:text-[#C5534B]"
                                  onClick={() => onDeleteDetailRow(row.id)}
                                  aria-label={`${row.values[0] || '새 row'} 삭제`}
                                >
                                  <Trash2 className="size-4" aria-hidden="true" />
                                </Button>
                              </TableCell>
                            ) : null}
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <Dialog
        open={isWorkflowEditorOpen}
        onOpenChange={(open) => {
          if (!open) {
            handleCloseWorkflowTextEditor()
          }
        }}
      >
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>{workflowEditorTitle || 'Workflow 편집'}</DialogTitle>
            <DialogDescription>
              {isFilterColumn(workflowTextEditor?.columnName)
                ? 'workflow_filter JSON 구조를 보기 쉬운 조건 목록으로 편집합니다.'
                : 'action_data_index를 메시지/필드 매핑 기준으로 편집합니다.'}
            </DialogDescription>
          </DialogHeader>

          {isFilterColumn(workflowTextEditor?.columnName) ? (
            workflowFilterDraft.mode === 'raw' ? (
              <div className="space-y-3">
                <p className="text-sm text-[#C5534B]">
                  기존 값이 구조화 편집 규칙과 맞지 않아 raw 모드로 표시합니다.
                </p>
                <textarea
                  value={workflowFilterDraft.rawValue}
                  onChange={(event) =>
                    setWorkflowFilterDraft((previousDraft) => ({
                      ...previousDraft,
                      rawValue: event.target.value,
                    }))
                  }
                  className="min-h-[320px] w-full resize-y rounded-xl border border-[#DCE5E0] bg-[#FAFCFB] p-3 font-mono text-sm text-[#22322B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1C7F59]/30"
                />
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-[#647169]">조건은 위에서 아래로 AND로 평가됩니다.</p>
                  <Button type="button" variant="outline" onClick={() => setWorkflowFilterDraft((previousDraft) => ({
                    ...previousDraft,
                    rows: [...previousDraft.rows, createEmptyWorkflowFilterCondition()],
                  }))}>
                    <Plus className="size-3.5" aria-hidden="true" />
                    조건 추가
                  </Button>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow className="bg-[#F6F9F7]">
                      <TableHead>Var</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Xform</TableHead>
                      <TableHead>Operator</TableHead>
                      <TableHead>Right</TableHead>
                      <TableHead className="w-[72px]">작업</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {workflowFilterDraft.rows.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>
                          <Input
                            value={row.variableName}
                            onChange={(event) =>
                              setWorkflowFilterDraft((previousDraft) => ({
                                ...previousDraft,
                                rows: updateWorkflowFilterDraftRow(previousDraft.rows, row.id, {
                                  variableName: event.target.value,
                                }),
                              }))
                            }
                            placeholder="status"
                          />
                        </TableCell>
                        <TableCell>
                          <select
                            value={row.source}
                            onChange={(event) =>
                              setWorkflowFilterDraft((previousDraft) => ({
                                ...previousDraft,
                                rows: updateWorkflowFilterDraftRow(previousDraft.rows, row.id, {
                                  source: event.target.value as ModelVariableSource,
                                }),
                              }))
                            }
                            className="h-9 w-full rounded-md border border-[#DCE5E0] bg-white px-2 text-sm text-[#22322B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1C7F59]/30"
                          >
                            {VARIABLE_SOURCE_OPTIONS.map((source) => (
                              <option key={source} value={source}>
                                {source}
                              </option>
                            ))}
                          </select>
                        </TableCell>
                        <TableCell>
                          <Input
                            value={row.transformsText}
                            onChange={(event) =>
                              setWorkflowFilterDraft((previousDraft) => ({
                                ...previousDraft,
                                rows: updateWorkflowFilterDraftRow(previousDraft.rows, row.id, {
                                  transformsText: event.target.value,
                                }),
                              }))
                            }
                            placeholder="trim, lower"
                          />
                        </TableCell>
                        <TableCell>
                          <select
                            value={row.operator}
                            onChange={(event) =>
                              setWorkflowFilterDraft((previousDraft) => ({
                                ...previousDraft,
                                rows: updateWorkflowFilterDraftRow(previousDraft.rows, row.id, {
                                  operator: event.target.value as WorkflowFilterOperator,
                                }),
                              }))
                            }
                            className="h-9 w-full rounded-md border border-[#DCE5E0] bg-white px-2 text-sm text-[#22322B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1C7F59]/30"
                          >
                            {FILTER_OPERATOR_OPTIONS.map((operator) => (
                              <option key={operator} value={operator}>
                                {operator}
                              </option>
                            ))}
                          </select>
                        </TableCell>
                        <TableCell>
                          <Input
                            value={row.rightValue}
                            onChange={(event) =>
                              setWorkflowFilterDraft((previousDraft) => ({
                                ...previousDraft,
                                rows: updateWorkflowFilterDraftRow(previousDraft.rows, row.id, {
                                  rightValue: event.target.value,
                                }),
                              }))
                            }
                            placeholder={row.operator === 'in' ? 'A, B, C' : 'ok'}
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            className="size-8 rounded-lg text-[#6A7971] hover:bg-[#F3F7F5] hover:text-[#C5534B]"
                            onClick={() =>
                              setWorkflowFilterDraft((previousDraft) => ({
                                ...previousDraft,
                                rows:
                                  previousDraft.rows.length > 1
                                    ? previousDraft.rows.filter((item) => item.id !== row.id)
                                    : [createEmptyWorkflowFilterCondition()],
                              }))
                            }
                          >
                            <Trash2 className="size-4" aria-hidden="true" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )
          ) : actionDataIndexDraft.mode === 'raw' ? (
            <div className="space-y-3">
              <p className="text-sm text-[#C5534B]">
                기존 값이 구조화 편집 규칙과 맞지 않아 raw 모드로 표시합니다.
              </p>
              <textarea
                value={actionDataIndexDraft.rawValue}
                onChange={(event) =>
                  setActionDataIndexDraft((previousDraft) => ({
                    ...previousDraft,
                    rawValue: event.target.value,
                  }))
                }
                className="min-h-[320px] w-full resize-y rounded-xl border border-[#DCE5E0] bg-[#FAFCFB] p-3 font-mono text-sm text-[#22322B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1C7F59]/30"
              />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid gap-3 md:grid-cols-[minmax(0,320px)_auto] md:items-end">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#1E3D33]">MDF Message</label>
                  <Input
                    value={actionDataIndexDraft.messageName}
                    onChange={(event) =>
                      setActionDataIndexDraft((previousDraft) => ({
                        ...previousDraft,
                        messageName: event.target.value,
                      }))
                    }
                    placeholder="TOOL_CONDITION_REPLY_MES"
                  />
                </div>
                <div className="flex justify-start md:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      setActionDataIndexDraft((previousDraft) => ({
                        ...previousDraft,
                        fields: [...previousDraft.fields, createEmptyActionDataIndexField()],
                      }))
                    }
                  >
                    <Plus className="size-3.5" aria-hidden="true" />
                    필드 추가
                  </Button>
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow className="bg-[#F6F9F7]">
                    <TableHead>Field</TableHead>
                    <TableHead>Fixed</TableHead>
                    <TableHead>Var</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Xform</TableHead>
                    <TableHead className="w-[92px]">Required</TableHead>
                    <TableHead className="w-[72px]">작업</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {actionDataIndexDraft.fields.map((field) => (
                    <TableRow key={field.id}>
                      <TableCell>
                        <Input
                          value={field.fieldName}
                          onChange={(event) =>
                            setActionDataIndexDraft((previousDraft) => ({
                              ...previousDraft,
                              fields: updateActionDataIndexDraftRow(previousDraft.fields, field.id, {
                                fieldName: event.target.value,
                              }),
                            }))
                          }
                          placeholder="EQPID"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={field.fixedValue}
                          onChange={(event) =>
                            setActionDataIndexDraft((previousDraft) => ({
                              ...previousDraft,
                              fields: updateActionDataIndexDraftRow(previousDraft.fields, field.id, {
                                fixedValue: event.target.value,
                              }),
                            }))
                          }
                          placeholder="E000"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={field.variableName}
                          onChange={(event) =>
                            setActionDataIndexDraft((previousDraft) => ({
                              ...previousDraft,
                              fields: updateActionDataIndexDraftRow(previousDraft.fields, field.id, {
                                variableName: event.target.value,
                              }),
                            }))
                          }
                          placeholder="eqpId"
                        />
                      </TableCell>
                      <TableCell>
                        <select
                          value={field.source}
                          onChange={(event) =>
                            setActionDataIndexDraft((previousDraft) => ({
                              ...previousDraft,
                              fields: updateActionDataIndexDraftRow(previousDraft.fields, field.id, {
                                source: event.target.value as ModelVariableSource,
                              }),
                            }))
                          }
                          className="h-9 w-full rounded-md border border-[#DCE5E0] bg-white px-2 text-sm text-[#22322B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1C7F59]/30"
                        >
                          {VARIABLE_SOURCE_OPTIONS.map((source) => (
                            <option key={source} value={source}>
                              {source}
                            </option>
                          ))}
                        </select>
                      </TableCell>
                      <TableCell>
                        <Input
                          value={field.transformsText}
                          onChange={(event) =>
                            setActionDataIndexDraft((previousDraft) => ({
                              ...previousDraft,
                              fields: updateActionDataIndexDraftRow(previousDraft.fields, field.id, {
                                transformsText: event.target.value,
                              }),
                            }))
                          }
                          placeholder="trim, upper"
                        />
                      </TableCell>
                      <TableCell>
                        <label className="inline-flex h-9 items-center gap-2 text-sm text-[#22322B]">
                          <input
                            type="checkbox"
                            checked={field.required}
                            onChange={(event) =>
                              setActionDataIndexDraft((previousDraft) => ({
                                ...previousDraft,
                                fields: updateActionDataIndexDraftRow(previousDraft.fields, field.id, {
                                  required: event.target.checked,
                                }),
                              }))
                            }
                            className="size-4 rounded border border-[#DCE5E0]"
                          />
                          필수
                        </label>
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          className="size-8 rounded-lg text-[#6A7971] hover:bg-[#F3F7F5] hover:text-[#C5534B]"
                          onClick={() =>
                            setActionDataIndexDraft((previousDraft) => ({
                              ...previousDraft,
                              fields:
                                previousDraft.fields.length > 1
                                  ? previousDraft.fields.filter((item) => item.id !== field.id)
                                  : [createEmptyActionDataIndexField()],
                            }))
                          }
                        >
                          <Trash2 className="size-4" aria-hidden="true" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseWorkflowTextEditor}>
              취소
            </Button>
            <Button onClick={handleSaveWorkflowTextEditor}>적용</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
