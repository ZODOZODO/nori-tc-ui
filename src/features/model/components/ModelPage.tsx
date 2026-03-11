import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { CircleUserRound, Loader2, LogOut } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { authApi } from '@/features/auth/api/auth.api'
import { UserProfileModal } from '@/features/profile/components/UserProfileModal'
import { useMe } from '@/features/profile/hooks/useProfile'
import { ResizableDivider } from '@/features/eqp/components/ResizableDivider'
import { useModelDetail } from '../hooks/useModelDetail'
import { useModelList } from '../hooks/useModelList'
import { useModelNodeDetail } from '../hooks/useModelNodeDetail'
import { useModelMutations } from '../hooks/useModelMutations'
import { useModelUiStore } from '../stores/model-ui.store'
import {
  ModelApiError,
  SECS_DETAIL_NODES,
  SOCKET_DETAIL_NODES,
  type ModelDetailNode,
  type ModelDetailRow,
  type ModelMdfContent,
  type ModelInfo,
  type ProtocolType,
} from '../types/model.types'
import { ModelCheckInModal } from './ModelCheckInModal'
import { ModelDetailPanel } from './ModelDetailPanel'
import { ModelInfoTable } from './ModelInfoTable'
import { ModelSidebar } from './ModelSidebar'

const LOGIN_ROUTE = '/login'
const CSRF_COOKIE_NAME = 'XSRF-TOKEN'
const HEADER_HORIZONTAL_PADDING_PX = 20
const CONTENT_START_PADDING_PX = 16
const SIDEBAR_EXPANDED_WIDTH_PX = 240
const SIDEBAR_COLLAPSED_WIDTH_PX = 56

// ResizableDivider 크기 제한 (%)
const PANEL_MIN_PERCENT = 15
const PANEL_MAX_PERCENT = 85
const PANEL_INITIAL_TOP_PERCENT = 35

/**
 * 상단 네비게이션 메뉴 구성입니다.
 */
const TOP_NAVIGATION_ITEMS = [
  { name: 'Eqp', subLabel: 'Eqp Info', route: '/eqp' },
  { name: 'Model', subLabel: 'Model Info', route: '/model' },
  { name: 'Deploy', subLabel: 'Eqp Deploy / Model Deploy', route: null },
  { name: 'Dlq', subLabel: 'Gateway Dlq / Business Dlq', route: null },
  { name: 'User', subLabel: 'User Info / Group Info', route: null },
] as const

/**
 * 알 수 없는 오류를 화면 메시지로 변환합니다.
 */
const resolveErrorMessage = (error: unknown, fallbackMessage: string): string => {
  if (error instanceof ModelApiError) {
    return error.payload.errorMsg
  }

  return fallbackMessage
}

/**
 * 브라우저에서 접근 가능한 CSRF 쿠키를 삭제합니다.
 */
const clearCsrfCookie = () => {
  if (typeof document === 'undefined') {
    return
  }
  document.cookie = `${CSRF_COOKIE_NAME}=; Max-Age=0; path=/`
}

/**
 * updatedAt 기준 최신순으로 모델 목록을 정렬합니다.
 */
const sortByUpdatedAtDesc = (models: ModelInfo[]): ModelInfo[] =>
  [...models].sort((firstItem, secondItem) => {
    const secondTime = Date.parse(secondItem.updatedAt)
    const firstTime = Date.parse(firstItem.updatedAt)
    return secondTime - firstTime
  })

/**
 * 인터페이스 타입별 상세 노드 기본 집합을 반환합니다.
 */
const resolveDetailNodesByInterface = (commInterface: ProtocolType): ModelDetailNode[] => {
  const normalizedInterface = commInterface.toUpperCase()
  return normalizedInterface === 'SOCKET' ? SOCKET_DETAIL_NODES : SECS_DETAIL_NODES
}

/**
 * Model Info 메인 페이지입니다.
 */
export function ModelPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const selectedModelVersionKey = useModelUiStore((state) => state.selectedModelVersionKey)
  const sidebarOpen = useModelUiStore((state) => state.sidebarOpen)
  const openedTabs = useModelUiStore((state) => state.openedTabs)
  const activeTab = useModelUiStore((state) => state.activeTab)
  const detailNode = useModelUiStore((state) => state.detailNode)
  const detailNodeByTab = useModelUiStore((state) => state.detailNodeByTab)
  const isEditMode = useModelUiStore((state) => state.isEditMode)
  const isCheckInModalOpen = useModelUiStore((state) => state.isCheckInModalOpen)
  const isProfileModalOpen = useModelUiStore((state) => state.isProfileModalOpen)
  const setSelectedModelVersionKey = useModelUiStore((state) => state.setSelectedModelVersionKey)
  const toggleSidebar = useModelUiStore((state) => state.toggleSidebar)
  const openModelTab = useModelUiStore((state) => state.openModelTab)
  const closeModelTab = useModelUiStore((state) => state.closeModelTab)
  const setActiveTab = useModelUiStore((state) => state.setActiveTab)
  const setDetailNode = useModelUiStore((state) => state.setDetailNode)
  const setDetailNodeForTab = useModelUiStore((state) => state.setDetailNodeForTab)
  const setEditMode = useModelUiStore((state) => state.setEditMode)
  const setCheckInModalOpen = useModelUiStore((state) => state.setCheckInModalOpen)
  const setProfileModalOpen = useModelUiStore((state) => state.setProfileModalOpen)
  const resetUiState = useModelUiStore((state) => state.reset)

  const modelListQuery = useModelList()
  const selectedModelDetailQuery = useModelDetail(selectedModelVersionKey)
  const meQuery = useMe(true)

  const { deleteModelMutation, checkoutModelMutation, checkinModelMutation } = useModelMutations()

  const [checkInErrorMessage, setCheckInErrorMessage] = useState<string | null>(null)
  const [isLogoutPending, setIsLogoutPending] = useState(false)
  const [topPanelHeightPercent, setTopPanelHeightPercent] = useState(PANEL_INITIAL_TOP_PERCENT)
  const [detailColumnsByContext, setDetailColumnsByContext] = useState<Record<string, string[]>>({})
  const [detailRowsByContext, setDetailRowsByContext] = useState<Record<string, ModelDetailRow[]>>({})
  const [detailMdfByContext, setDetailMdfByContext] = useState<Record<string, ModelMdfContent[]>>({})

  // 가운데 컨테이너 높이 계산용 ref
  const centerContainerRef = useRef<HTMLDivElement>(null)

  const currentUserId = meQuery.data?.userId ?? null

  const modelItems = useMemo(() => {
    const baseItems = modelListQuery.data?.items ?? []
    const selectedDetail = selectedModelDetailQuery.data

    if (!selectedDetail) {
      return baseItems
    }

    const hasSelectedInList = baseItems.some(
      (item) => item.modelVersionKey === selectedDetail.modelVersionKey,
    )
    if (!hasSelectedInList) {
      return baseItems
    }

    return baseItems.map((item) =>
      item.modelVersionKey === selectedDetail.modelVersionKey ? selectedDetail : item,
    )
  }, [modelListQuery.data, selectedModelDetailQuery.data])

  const selectedModel = useMemo(
    () => modelItems.find((item) => item.modelVersionKey === selectedModelVersionKey) ?? null,
    [modelItems, selectedModelVersionKey],
  )

  const selectedModelRows = useMemo(() => {
    if (!selectedModel) {
      return []
    }

    return sortByUpdatedAtDesc(modelItems.filter((item) => item.modelName === selectedModel.modelName))
  }, [modelItems, selectedModel])

  const activeTabModel = useMemo(() => {
    if (activeTab === null) {
      return null
    }

    return modelItems.find((item) => item.modelVersionKey === activeTab) ?? null
  }, [activeTab, modelItems])

  const detailNodeQuery = useModelNodeDetail(activeTabModel?.modelVersionKey ?? null, detailNode)

  const editModelForActiveGroup = useMemo(() => {
    if (!activeTabModel) {
      return null
    }

    return (
      modelItems.find(
        (item) =>
          item.modelKey === activeTabModel.modelKey &&
          item.modelVersion.trim().toUpperCase() === 'EDIT',
      ) ?? null
    )
  }, [activeTabModel, modelItems])

  const lockOwner = useMemo(() => {
    if (!editModelForActiveGroup) {
      return null
    }

    const normalizedUpdatedBy = editModelForActiveGroup.updatedBy.trim()
    if (normalizedUpdatedBy.length > 0) {
      return normalizedUpdatedBy
    }

    const normalizedCreatedBy = editModelForActiveGroup.createdBy.trim()
    if (normalizedCreatedBy.length > 0) {
      return normalizedCreatedBy
    }

    return null
  }, [editModelForActiveGroup])

  const isLockedByOtherUser = useMemo(() => {
    if (!editModelForActiveGroup || !lockOwner) {
      return false
    }

    if (!currentUserId) {
      return true
    }

    return lockOwner !== currentUserId
  }, [currentUserId, editModelForActiveGroup, lockOwner])

  /**
   * 활성 탭 기준으로 상세 노드 기본값을 보정합니다.
   */
  useEffect(() => {
    if (!activeTabModel) {
      return
    }

    const detailNodes = resolveDetailNodesByInterface(activeTabModel.commInterface)
    if (detailNodes.length === 0) {
      return
    }

    const defaultNode = detailNodes[0]
    const currentNodeForTab = detailNodeByTab[activeTabModel.modelVersionKey] ?? null

    if (!detailNode || !detailNodes.includes(detailNode)) {
      if (currentNodeForTab !== defaultNode) {
        setDetailNodeForTab(activeTabModel.modelVersionKey, defaultNode)
      }
      return
    }

    if (currentNodeForTab !== detailNode) {
      setDetailNodeForTab(activeTabModel.modelVersionKey, detailNode)
    }
  }, [activeTabModel, detailNode, detailNodeByTab, setDetailNodeForTab])

  /**
   * 활성 컨텍스트(탭 + 노드)에 대한 상세 데이터를 API 응답으로 초기화합니다.
   */
  useEffect(() => {
    if (!activeTabModel || !detailNode || !detailNodeQuery.data) {
      return
    }

    const contextKey = `${activeTabModel.modelVersionKey}:${detailNode}`
    setDetailColumnsByContext((previousColumnsByContext) => {
      if (previousColumnsByContext[contextKey]) {
        return previousColumnsByContext
      }

      return {
        ...previousColumnsByContext,
        [contextKey]: detailNodeQuery.data.columns,
      }
    })

    setDetailRowsByContext((previousRowsByContext) => {
      if (previousRowsByContext[contextKey]) {
        return previousRowsByContext
      }

      return {
        ...previousRowsByContext,
        [contextKey]: detailNodeQuery.data.rows,
      }
    })

    setDetailMdfByContext((previousMdfByContext) => {
      if (previousMdfByContext[contextKey]) {
        return previousMdfByContext
      }

      return {
        ...previousMdfByContext,
        [contextKey]: detailNodeQuery.data.mdfContents,
      }
    })
  }, [activeTabModel, detailNode, detailNodeQuery.data])

  /**
   * 활성 탭이 EDIT 모델인지/소유자인지에 따라 편집 모드를 동기화합니다.
   */
  useEffect(() => {
    if (!activeTabModel) {
      if (isEditMode) {
        setEditMode(false)
      }
      return
    }

    const isEditModel = activeTabModel.modelVersion.trim().toUpperCase() === 'EDIT'
    const canEdit =
      isEditModel && (!lockOwner || (currentUserId !== null && lockOwner === currentUserId))

    if (isEditMode !== canEdit) {
      setEditMode(canEdit)
    }
  }, [activeTabModel, currentUserId, isEditMode, lockOwner, setEditMode])

  /**
   * ResizableDivider 드래그 처리.
   */
  const handleDividerDrag = useCallback((deltaY: number) => {
    setTopPanelHeightPercent((previousPercent) => {
      const containerHeight = centerContainerRef.current?.clientHeight ?? 0
      if (containerHeight === 0) {
        return previousPercent
      }
      const deltaPercent = (deltaY / containerHeight) * 100
      return Math.min(PANEL_MAX_PERCENT, Math.max(PANEL_MIN_PERCENT, previousPercent + deltaPercent))
    })
  }, [])

  const detailContextKey = useMemo(() => {
    if (!activeTabModel || !detailNode) {
      return null
    }
    return `${activeTabModel.modelVersionKey}:${detailNode}`
  }, [activeTabModel, detailNode])

  const detailColumns = useMemo(() => {
    if (!detailContextKey) {
      return []
    }
    return detailColumnsByContext[detailContextKey] ?? detailNodeQuery.data?.columns ?? []
  }, [detailContextKey, detailColumnsByContext, detailNodeQuery.data?.columns])

  const detailRows = useMemo(() => {
    if (!detailContextKey) {
      return []
    }
    return detailRowsByContext[detailContextKey] ?? detailNodeQuery.data?.rows ?? []
  }, [detailContextKey, detailRowsByContext, detailNodeQuery.data?.rows])

  const detailMdfContents = useMemo(() => {
    if (!detailContextKey) {
      return []
    }
    return detailMdfByContext[detailContextKey] ?? detailNodeQuery.data?.mdfContents ?? []
  }, [detailContextKey, detailMdfByContext, detailNodeQuery.data?.mdfContents])

  const hasDetailData = detailRows.length > 0 || detailMdfContents.length > 0
  const detailLoadErrorMessage =
    detailNodeQuery.error && !hasDetailData
      ? resolveErrorMessage(detailNodeQuery.error, '상세 데이터를 불러오지 못했습니다.')
      : null

  const handleDetailValueChange = (rowId: string, columnIndex: number, nextValue: string) => {
    if (!detailContextKey) {
      return
    }

    setDetailRowsByContext((previousRowsByContext) => ({
      ...previousRowsByContext,
      [detailContextKey]: (previousRowsByContext[detailContextKey] ?? []).map((row) =>
        row.id === rowId
          ? {
              ...row,
              values: row.values.map((cellValue, index) =>
                index === columnIndex ? nextValue : cellValue,
              ),
            }
          : row,
      ),
    }))
  }

  /**
   * Sidebar에서 모델명 선택 시 Model 정보 테이블 화면으로 전환합니다.
   */
  const handleSelectModel = (model: ModelInfo) => {
    if (openedTabs.length === 0) {
      setActiveTab(null)
    }
    setSelectedModelVersionKey(model.modelVersionKey)
    setEditMode(false)
    setCheckInModalOpen(false)
    setCheckInErrorMessage(null)
  }

  /**
   * Model 정보 row 더블 클릭 시 Version 화면 탭을 엽니다.
   */
  const handleOpenModelDetail = (model: ModelInfo) => {
    openModelTab(model)
    setSelectedModelVersionKey(model.modelVersionKey)
    setActiveTab(model.modelVersionKey)
    const detailNodes = resolveDetailNodesByInterface(model.commInterface)
    if (detailNodes.length > 0) {
      setDetailNodeForTab(model.modelVersionKey, detailNodes[0])
    }
    setCheckInErrorMessage(null)
  }

  const handleSelectTab = (modelVersionKey: number) => {
    setActiveTab(modelVersionKey)
    setSelectedModelVersionKey(modelVersionKey)
    setCheckInErrorMessage(null)
  }

  const handleCheckOut = async () => {
    if (!activeTabModel) {
      return
    }

    try {
      setCheckInErrorMessage(null)
      const checkedOutModel = await checkoutModelMutation.mutateAsync({
        model: activeTabModel,
        currentUserId,
      })

      openModelTab(checkedOutModel)
      setSelectedModelVersionKey(checkedOutModel.modelVersionKey)
      setActiveTab(checkedOutModel.modelVersionKey)

      const detailNodes = resolveDetailNodesByInterface(checkedOutModel.commInterface)
      if (detailNodes.length > 0) {
        setDetailNodeForTab(checkedOutModel.modelVersionKey, detailNodes[0])
      }

      setEditMode(true)
    } catch (error) {
      setCheckInErrorMessage(resolveErrorMessage(error, '체크아웃에 실패했습니다.'))
    }
  }

  const handleRequestCheckIn = () => {
    if (!isEditMode) {
      return
    }
    setCheckInErrorMessage(null)
    setCheckInModalOpen(true)
  }

  const handleUndoCheckIn = async () => {
    if (!activeTabModel || activeTabModel.modelVersion.trim().toUpperCase() !== 'EDIT') {
      setCheckInErrorMessage('원복할 EDIT 모델이 없어 Undo를 수행할 수 없습니다.')
      return
    }

    try {
      setCheckInErrorMessage(null)
      await deleteModelMutation.mutateAsync({
        modelVersionKey: activeTabModel.modelVersionKey,
      })

      closeModelTab(activeTabModel.modelVersionKey)

      const fallbackModel = sortByUpdatedAtDesc(
        modelItems.filter(
          (item) =>
            item.modelKey === activeTabModel.modelKey &&
            item.modelVersion.trim().toUpperCase() !== 'EDIT',
        ),
      )[0]

      if (fallbackModel) {
        openModelTab(fallbackModel)
        setSelectedModelVersionKey(fallbackModel.modelVersionKey)
        setActiveTab(fallbackModel.modelVersionKey)

        const detailNodes = resolveDetailNodesByInterface(fallbackModel.commInterface)
        if (detailNodes.length > 0) {
          setDetailNodeForTab(fallbackModel.modelVersionKey, detailNodes[0])
        }
      } else {
        setActiveTab(null)
      }

      setEditMode(false)
      setCheckInModalOpen(false)
    } catch (error) {
      setCheckInErrorMessage(resolveErrorMessage(error, '편집 상태 원복에 실패했습니다.'))
    }
  }

  const handleSaveCheckIn = async (version: string, description: string) => {
    if (!activeTabModel || activeTabModel.modelVersion.trim().toUpperCase() !== 'EDIT') {
      setCheckInErrorMessage('체크인할 EDIT 모델이 없어 저장할 수 없습니다.')
      return
    }

    try {
      setCheckInErrorMessage(null)
      const createdModel = await checkinModelMutation.mutateAsync({
        editModel: activeTabModel,
        newVersion: version,
        description,
        currentUserId,
      })

      closeModelTab(activeTabModel.modelVersionKey)
      openModelTab(createdModel)
      setSelectedModelVersionKey(createdModel.modelVersionKey)
      setActiveTab(createdModel.modelVersionKey)

      const detailNodes = resolveDetailNodesByInterface(createdModel.commInterface)
      if (detailNodes.length > 0) {
        setDetailNodeForTab(createdModel.modelVersionKey, detailNodes[0])
      }

      setEditMode(false)
      setCheckInModalOpen(false)
    } catch (error) {
      setCheckInErrorMessage(resolveErrorMessage(error, '체크인 중 오류가 발생했습니다.'))
    }
  }

  /**
   * 로그아웃 API 호출 후 로컬 상태/캐시를 정리하고 로그인 페이지로 이동합니다.
   */
  const handleLogout = async () => {
    if (isLogoutPending) {
      return
    }

    setIsLogoutPending(true)

    try {
      await authApi.logout()
    } catch {
      // 로그아웃 API 실패 시에도 로컬 세션 정리를 우선합니다.
    } finally {
      resetUiState()
      setCheckInErrorMessage(null)
      setTopPanelHeightPercent(PANEL_INITIAL_TOP_PERCENT)
      setDetailColumnsByContext({})
      setDetailRowsByContext({})
      setDetailMdfByContext({})
      queryClient.clear()
      clearCsrfCookie()
      navigate(LOGIN_ROUTE, { replace: true })
    }
  }

  const listErrorMessage = modelListQuery.error
    ? resolveErrorMessage(modelListQuery.error, '모델 목록을 불러오지 못했습니다.')
    : null

  const isVersionFrame = activeTab !== null && openedTabs.length > 0
  const topNavigationOffsetPx = sidebarOpen
    ? SIDEBAR_EXPANDED_WIDTH_PX + CONTENT_START_PADDING_PX - HEADER_HORIZONTAL_PADDING_PX
    : SIDEBAR_COLLAPSED_WIDTH_PX + CONTENT_START_PADDING_PX - HEADER_HORIZONTAL_PADDING_PX

  const handleNavigateMenu = (route: string | null) => {
    if (!route || route === '/model') {
      return
    }
    navigate(route)
  }

  return (
    <div className="flex min-h-screen w-screen flex-col bg-[#F7FAF8]">
      <header className="relative flex h-[52px] items-center justify-between bg-white px-5">
        <div className="flex items-center gap-2.5">
          <div className="flex size-7 items-center justify-center rounded-md bg-[#d95d39]">
            <span className="font-fraunces text-sm font-medium text-white">N</span>
          </div>
          <span className="font-fraunces text-lg text-[#2D2D2D]">Nori-TC</span>
        </div>

        <div
          className="pointer-events-none absolute inset-y-0 hidden items-center md:flex"
          style={{ left: `${topNavigationOffsetPx}px`, right: '164px' }}
        >
          <nav className="pointer-events-auto flex max-w-full items-center gap-6 overflow-hidden whitespace-nowrap">
            {TOP_NAVIGATION_ITEMS.map((menuItem) => {
              const isCurrentMenu = menuItem.name === 'Model'
              return (
                <button
                  key={menuItem.name}
                  type="button"
                  onClick={() => handleNavigateMenu(menuItem.route)}
                  className={`group relative inline-flex h-[38px] items-center px-2 text-[14px] font-medium tracking-[0.01em] transition-colors ${
                    isCurrentMenu
                      ? 'text-[#173f31]'
                      : 'text-[#6A7971] hover:text-[#2B4A3F]'
                  }`}
                >
                  <span>{menuItem.name}</span>
                  <span
                    className={`pointer-events-none absolute -bottom-px left-0 right-0 h-[2px] rounded-full transition-opacity ${
                      isCurrentMenu
                        ? 'bg-[#1C7F59] opacity-100'
                        : 'bg-[#1C7F59] opacity-0 group-hover:opacity-35'
                    }`}
                  />
                </button>
              )
            })}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-[38px] rounded-full border-[#DCE5E0] px-3.5 text-sm font-medium text-[#4B5A52]"
            onClick={() => void handleLogout()}
            disabled={isLogoutPending}
            aria-label="로그아웃"
          >
            {isLogoutPending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <LogOut className="size-4" aria-hidden="true" />}
            로그아웃
          </Button>

          <Button
            type="button"
            variant="ghost"
            className="size-[38px] rounded-full border border-[#DCE5E0] text-[#4B5A52]"
            onClick={() => setProfileModalOpen(true)}
            aria-label="사용자 프로필 열기"
            disabled={isLogoutPending}
          >
            <CircleUserRound className="size-[18px]" />
          </Button>
        </div>
      </header>

      <div className="h-px bg-[#E5ECE7]" />

      <main className="flex flex-1 min-h-0">
        <ModelSidebar
          modelItems={modelItems}
          selectedModelVersionKey={selectedModelVersionKey}
          sidebarOpen={sidebarOpen}
          isLoading={modelListQuery.isLoading}
          errorMessage={listErrorMessage}
          onSelectModel={handleSelectModel}
          onToggleSidebar={toggleSidebar}
        />

        <section className="flex min-w-0 flex-1 flex-col">
          <div className="flex min-h-0 flex-1 flex-col">
            {selectedModelVersionKey === null ? (
              <div className="flex flex-1" />
            ) : !isVersionFrame ? (
              <section className="flex flex-1 flex-col p-3 md:p-4">
                <ModelInfoTable
                  models={selectedModelRows}
                  selectedModelVersionKey={selectedModelVersionKey}
                  isLoading={modelListQuery.isLoading}
                  isFetching={modelListQuery.isFetching || selectedModelDetailQuery.isFetching}
                  onSelectRow={setSelectedModelVersionKey}
                  onOpenDetail={handleOpenModelDetail}
                />
              </section>
            ) : (
              <div ref={centerContainerRef} className="flex flex-1 flex-col overflow-hidden">
                <div
                  style={{ height: `${topPanelHeightPercent}%` }}
                  className="overflow-auto p-3 pb-0 md:p-4 md:pb-0"
                >
                  <ModelInfoTable
                    models={selectedModelRows}
                    selectedModelVersionKey={selectedModelVersionKey}
                    isLoading={modelListQuery.isLoading}
                    isFetching={modelListQuery.isFetching || selectedModelDetailQuery.isFetching}
                    compactHeight
                    onSelectRow={setSelectedModelVersionKey}
                    onOpenDetail={handleOpenModelDetail}
                  />
                </div>

                <ResizableDivider onDrag={handleDividerDrag} />

                <div
                  style={{ height: `${100 - topPanelHeightPercent}%` }}
                  className="overflow-auto p-3 pt-0 md:p-4 md:pt-0"
                >
                  <ModelDetailPanel
                    openedTabs={openedTabs}
                    activeTab={activeTab}
                    activeModel={activeTabModel}
                    detailNode={detailNode}
                    detailColumns={detailColumns}
                    detailRows={detailRows}
                    mdfContents={detailMdfContents}
                    isDetailLoading={detailNodeQuery.isLoading}
                    detailErrorMessage={detailLoadErrorMessage}
                    isEditMode={isEditMode}
                    isLockedByOtherUser={isLockedByOtherUser}
                    lockOwner={lockOwner}
                    isCheckoutPending={checkoutModelMutation.isPending}
                    isCheckinPending={checkinModelMutation.isPending}
                    actionErrorMessage={checkInErrorMessage}
                    onSelectTab={handleSelectTab}
                    onCloseTab={closeModelTab}
                    onSelectDetailNode={setDetailNode}
                    onChangeDetailValue={handleDetailValueChange}
                    onCheckOut={() => void handleCheckOut()}
                    onRequestCheckIn={handleRequestCheckIn}
                  />
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      <ModelCheckInModal
        open={isCheckInModalOpen}
        isPending={checkinModelMutation.isPending || deleteModelMutation.isPending}
        errorMessage={checkInErrorMessage}
        onOpenChange={setCheckInModalOpen}
        onCancel={() => setCheckInModalOpen(false)}
        onUndo={() => void handleUndoCheckIn()}
        onSave={(version, description) => void handleSaveCheckIn(version, description)}
      />

      <UserProfileModal open={isProfileModalOpen} onClose={() => setProfileModalOpen(false)} />
    </div>
  )
}
