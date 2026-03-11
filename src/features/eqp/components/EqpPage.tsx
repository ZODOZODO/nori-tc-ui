import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { CircleUserRound, Loader2, LogOut } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { CheckInModal } from './CheckInModal'
import { EqpInfoTable } from './EqpInfoTable'
import { EqpParamTable } from './EqpParamTable'
import { EqpSidebar } from './EqpSidebar'
import { GatewayGroupTable } from './GatewayGroupTable'
import { ResizableDivider } from './ResizableDivider'
import { authApi } from '@/features/auth/api/auth.api'
import { useEqpDetail } from '../hooks/useEqpDetail'
import { useEqpList } from '../hooks/useEqpList'
import { useEqpModelInfo } from '../hooks/useEqpModelInfo'
import { useEqpParamVersions } from '../hooks/useEqpParamVersions'
import { useEqpRuntimeState } from '../hooks/useEqpRuntimeState'
import { useEqpCheckoutStatus } from '../hooks/useEqpCheckoutStatus'
import { useEqpParams } from '../hooks/useEqpParams'
import { useEqpParamMutations } from '../hooks/useEqpParamMutations'
import { eqpQueryKeys, invalidateEqpSelectionQueries } from '../lib/eqp-query-keys'
import { useEqpUiStore } from '../stores/eqp-ui.store'
import { EqpApiError, type EqpInfo, type EqpParamRow } from '../types/eqp.types'
import { groupEqpItems } from '../utils/eqp-group.util'
import { UserProfileModal } from '@/features/profile/components/UserProfileModal'

const LOGIN_ROUTE = '/login'
const CSRF_COOKIE_NAME = 'XSRF-TOKEN'
const EMPTY_VERSION_VALUE = ''
const NO_VERSION_OPTION_LABEL = '버전 없음'
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
  if (error instanceof EqpApiError) {
    return error.payload.errorMsg
  }

  return fallbackMessage
}

/**
 * EQP 목록 항목의 최소 유효성(eqpId 문자열)을 확인합니다.
 */
const isEqpInfoItem = (value: unknown): value is EqpInfo =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as { eqpId?: unknown }).eqpId === 'string' &&
  (value as { eqpId: string }).eqpId.length > 0

/**
 * 목록 payload를 화면에서 안전하게 사용할 수 있는 EQP 배열로 정규화합니다.
 */
const resolveEqpItems = (payload: unknown): EqpInfo[] => {
  if (!payload) {
    return []
  }

  if (Array.isArray(payload)) {
    return payload.filter(isEqpInfoItem)
  }

  if (typeof payload === 'object' && payload !== null) {
    const items = (payload as { items?: unknown }).items
    if (Array.isArray(items)) {
      return items.filter(isEqpInfoItem)
    }
  }

  return []
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
 * EQP Info 메인 페이지입니다.
 * DB 기반 Check Out / Save / Check In 흐름을 처리합니다.
 *
 * 체크아웃 잠금: tc_eqp_param.param_version='EDIT' 존재 여부 = 체크아웃 상태
 *
 * 선택 상태:
 * - none: 초기 진입 / 선택 없음 → 가운데 영역 비어있음
 * - gateway_group: gateway_app 그룹 클릭 → 해당 그룹 설비 목록 테이블 표시
 * - eqp: 개별 설비 클릭 → 설비 정보 + ResizableDivider + 파라미터/Checkout 영역 표시
 */
export function EqpPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const selection = useEqpUiStore((state) => state.selection)
  const sidebarOpen = useEqpUiStore((state) => state.sidebarOpen)
  const isEditMode = useEqpUiStore((state) => state.isEditMode)
  const isProfileModalOpen = useEqpUiStore((state) => state.isProfileModalOpen)
  const selectEqp = useEqpUiStore((state) => state.selectEqp)
  const selectGatewayGroup = useEqpUiStore((state) => state.selectGatewayGroup)
  const clearSelection = useEqpUiStore((state) => state.clearSelection)
  const toggleSidebar = useEqpUiStore((state) => state.toggleSidebar)
  const setEditMode = useEqpUiStore((state) => state.setEditMode)
  const setProfileModalOpen = useEqpUiStore((state) => state.setProfileModalOpen)

  // selection에서 현재 선택된 eqpId 파생 (eqp 타입일 때만 유효)
  const selectedEqpId = selection.type === 'eqp' ? selection.eqpId : null

  const eqpListQuery = useEqpList()
  const eqpDetailQuery = useEqpDetail(selectedEqpId)
  const eqpParamVersionsQuery = useEqpParamVersions(selectedEqpId)
  const eqpRuntimeStateQuery = useEqpRuntimeState(selectedEqpId)
  const eqpModelInfoQuery = useEqpModelInfo(
    eqpDetailQuery.data && eqpDetailQuery.data.modelVersionKey > 0
      ? eqpDetailQuery.data.modelVersionKey
      : null,
  )

  const checkoutStatusQuery = useEqpCheckoutStatus(selectedEqpId)

  // 읽기 모드: 선택된 버전 파라미터 조회
  const [appliedVersion, setAppliedVersion] = useState(EMPTY_VERSION_VALUE)
  const readParamsQuery = useEqpParams(
    selectedEqpId,
    !isEditMode && appliedVersion ? appliedVersion : null,
  )

  // 편집 모드: EDIT 버전 파라미터 조회
  const editParamsQuery = useEqpParams(
    selectedEqpId,
    isEditMode ? 'EDIT' : null,
  )

  // 편집 중 로컬 상태 (편집 내용을 임시 보관)
  const [localEditRows, setLocalEditRows] = useState<EqpParamRow[]>([])
  const [isCheckInModalOpen, setIsCheckInModalOpen] = useState(false)
  const [checkInErrorMessage, setCheckInErrorMessage] = useState<string | null>(null)
  const [isLogoutPending, setIsLogoutPending] = useState(false)

  // ResizableDivider 상단 패널 높이 비율 (%)
  const [topPanelHeightPercent, setTopPanelHeightPercent] = useState(PANEL_INITIAL_TOP_PERCENT)
  // 가운데 컨테이너 높이 계산용 ref
  const centerContainerRef = useRef<HTMLDivElement>(null)
  // 체크아웃 중복 요청(더블 클릭) 방지용 로컬 가드
  const [isCheckoutSubmitting, setIsCheckoutSubmitting] = useState(false)
  const isCheckoutSubmittingRef = useRef(false)

  const { checkoutMutation, saveEditParamsMutation, checkinMutation } = useEqpParamMutations()
  const eqpItems = useMemo(() => resolveEqpItems(eqpListQuery.data as unknown), [eqpListQuery.data])
  // "EDIT"은 체크아웃 잠금용 내부 버전이므로 드롭다운에서 제외합니다.
  // "EDIT"을 sourceVersion으로 체크아웃하면 기존 EDIT 행과 중복 키 충돌이 발생합니다.
  const versionOptions = useMemo(
    () =>
      Array.from(new Set((eqpParamVersionsQuery.data ?? []).map((version) => version.trim()))).filter(
        (v) => Boolean(v) && v !== 'EDIT',
      ),
    [eqpParamVersionsQuery.data],
  )

  const checkoutStatus = useMemo(() => ({
    isCheckedOut: checkoutStatusQuery.data?.isCheckedOut ?? false,
    checkedOutBy: checkoutStatusQuery.data?.checkedOutBy ?? null,
  }), [checkoutStatusQuery.data])

  // 전체 eqpItems 기준으로 그룹화 (gateway_group 선택 시 설비 목록 조회용)
  const { gatewayGroups } = useMemo(() => groupEqpItems(eqpItems), [eqpItems])

  // gateway_group 선택 시 해당 그룹의 설비 목록 파생
  const gatewayGroupItems = useMemo(() => {
    if (selection.type !== 'gateway_group') {
      return []
    }
    const group = gatewayGroups.find((g) => g.appIndex === selection.groupIndex)
    return group?.items ?? []
  }, [selection, gatewayGroups])

  // gateway_group 선택 시 그룹명 파생
  const selectedGroupName = useMemo(() => {
    if (selection.type !== 'gateway_group') {
      return ''
    }
    return `gateway_app${selection.groupIndex}`
  }, [selection])

  /**
   * sessionStorage에서 복원된 선택 상태가 현재 목록과 불일치하면 선택을 정리합니다.
   * 목록 조회 성공 이후에만 검증해 로딩 중 오탐으로 선택이 해제되는 문제를 방지합니다.
   */
  useEffect(() => {
    if (!eqpListQuery.isSuccess) {
      return
    }

    const resetTransientStates = () => {
      clearSelection()
      setAppliedVersion(EMPTY_VERSION_VALUE)
      setEditMode(false)
      setLocalEditRows([])
      setIsCheckInModalOpen(false)
      setCheckInErrorMessage(null)
    }

    if (selection.type === 'eqp') {
      const existsSelectedEqp = eqpItems.some((item) => item.eqpId === selection.eqpId)
      if (!existsSelectedEqp) {
        resetTransientStates()
      }
      return
    }

    if (selection.type === 'gateway_group') {
      const existsSelectedGroup = gatewayGroups.some((group) => group.appIndex === selection.groupIndex)
      if (!existsSelectedGroup) {
        resetTransientStates()
      }
    }
  }, [eqpListQuery.isSuccess, selection, eqpItems, gatewayGroups, clearSelection, setEditMode])

  /**
   * 편집 모드가 활성화되면 EDIT 파라미터를 로컬 편집 행으로 동기화합니다.
   * EDIT 파라미터 데이터가 갱신될 때마다 실행됩니다.
   */
  useEffect(() => {
    if (!isEditMode) {
      return
    }
    const editData = editParamsQuery.data
    if (editData && editData.length > 0) {
      setLocalEditRows(editData.map((p) => ({
        paramName: p.paramName,
        paramValue: p.paramValue ?? '',
        description: p.description ?? '',
      })))
    }
  }, [isEditMode, editParamsQuery.data])

  /**
   * 선택 EQP 변경 또는 버전 목록 갱신 시 버전 기본 선택값을 조정합니다.
   * selectedEqpId가 없으면 (none/gateway_group 상태) 빈 문자열로 초기화합니다.
   */
  useEffect(() => {
    if (!selectedEqpId) {
      setAppliedVersion(EMPTY_VERSION_VALUE)
      return
    }

    if (versionOptions.length === 0) {
      setAppliedVersion(EMPTY_VERSION_VALUE)
      return
    }

    setAppliedVersion((previous) =>
      previous && versionOptions.includes(previous) ? previous : versionOptions[0],
    )
  }, [selectedEqpId, versionOptions])

  /**
   * 체크아웃 상태를 감지해 자동으로 편집 모드를 복원합니다.
   * 새로고침 후에도 내가 체크아웃한 상태라면 편집 모드가 유지됩니다.
   * selectedEqpId가 없으면 (none/gateway_group 상태) 실행하지 않습니다.
   *
   * NOTE: 현재 사용자 ID는 백엔드 세션에서 확인하므로 프론트에서 직접 비교할 수 없습니다.
   * 체크아웃 상태가 있으면 편집 모드로 복원합니다.
   */
  useEffect(() => {
    if (!selectedEqpId) {
      return
    }
    if (checkoutStatus.isCheckedOut && !isEditMode) {
      setEditMode(true)
    }
  }, [selectedEqpId, checkoutStatus.isCheckedOut, isEditMode, setEditMode])

  /**
   * 개별 설비 선택 처리.
   * 선택 시 관련 캐시를 즉시 무효화해 최신 데이터를 반영합니다.
   */
  const handleSelectEqp = useCallback((eqpId: string) => {
    // 선택한 EQP의 관련 캐시 즉시 무효화 → 백그라운드 리페치 트리거
    void invalidateEqpSelectionQueries(queryClient, eqpId)

    selectEqp(eqpId)
    setAppliedVersion(EMPTY_VERSION_VALUE)
    setEditMode(false)
    setLocalEditRows([])
    setIsCheckInModalOpen(false)
    setCheckInErrorMessage(null)
  }, [queryClient, selectEqp, setEditMode])

  /**
   * gateway_app 그룹 선택 처리.
   * 선택 시 eqpList 캐시를 무효화해 최신 설비 목록을 반영합니다.
   */
  const handleSelectGatewayGroup = useCallback((groupIndex: number) => {
    // 그룹 선택 시 eqpList 캐시 무효화 → 최신 설비 목록 반영
    void queryClient.invalidateQueries({ queryKey: eqpQueryKeys.list() })
    selectGatewayGroup(groupIndex)
  }, [queryClient, selectGatewayGroup])

  /**
   * ResizableDivider 드래그 처리.
   * deltaY(px)를 컨테이너 높이 기준 비율로 변환해 상단 패널 높이를 조절합니다.
   * 최소 15% ~ 최대 85% 범위로 제한합니다.
   */
  const handleDividerDrag = useCallback((deltaY: number) => {
    setTopPanelHeightPercent((previous) => {
      const containerHeight = centerContainerRef.current?.clientHeight ?? 0
      if (containerHeight === 0) {
        return previous
      }
      const deltaPct = (deltaY / containerHeight) * 100
      return Math.min(PANEL_MAX_PERCENT, Math.max(PANEL_MIN_PERCENT, previous + deltaPct))
    })
  }, [])

  /**
   * Check Out 버튼 클릭: DB에 EDIT 버전 파라미터 생성 후 편집 모드로 전환합니다.
   * appliedVersion이 없으면 빈 EDIT 버전으로 체크아웃합니다 (백엔드 허용).
   */
  const handleCheckOut = async () => {
    if (!selectedEqpId || isCheckoutSubmittingRef.current) {
      return
    }

    isCheckoutSubmittingRef.current = true
    setIsCheckoutSubmitting(true)

    try {
      setCheckInErrorMessage(null)
      await checkoutMutation.mutateAsync({
        eqpId: selectedEqpId,
        // appliedVersion이 없으면 빈 문자열로 전달 → 백엔드에서 빈 EDIT 버전 생성
        request: { sourceVersion: appliedVersion },
      })
      setEditMode(true)
    } catch (error) {
      // 409 (이미 체크아웃 중) 포함한 오류를 사용자에게 표시
      setCheckInErrorMessage(resolveErrorMessage(error, '체크아웃에 실패했습니다.'))
    } finally {
      isCheckoutSubmittingRef.current = false
      setIsCheckoutSubmitting(false)
    }
  }

  /**
   * Check In 버튼 클릭: 체크인 모달을 엽니다.
   */
  const handleRequestCheckIn = () => {
    if (!isEditMode) {
      return
    }
    setCheckInErrorMessage(null)
    setIsCheckInModalOpen(true)
  }

  /**
   * 파라미터 값 변경 (편집 모드에서 로컬 상태 업데이트)
   */
  const handleParamValueChange = (paramName: string, nextValue: string) => {
    setLocalEditRows((prevRows) =>
      prevRows.map((row) => (row.paramName === paramName ? { ...row, paramValue: nextValue } : row)),
    )
  }

  /**
   * Save 버튼 클릭: 로컬 편집 행을 DB EDIT 버전으로 저장합니다.
   */
  const handleSaveEditParams = async () => {
    if (!selectedEqpId || localEditRows.length === 0) {
      return
    }

    try {
      setCheckInErrorMessage(null)
      await saveEditParamsMutation.mutateAsync({
        eqpId: selectedEqpId,
        params: localEditRows.map((row) => ({
          paramName: row.paramName,
          paramValue: row.paramValue,
          description: row.description,
        })),
      })
    } catch (error) {
      setCheckInErrorMessage(resolveErrorMessage(error, 'EDIT 파라미터 저장에 실패했습니다.'))
    }
  }

  /**
   * CheckInModal의 Save 클릭: 버전명으로 체크인합니다.
   */
  const handleCheckInSave = async (version: string, description: string) => {
    if (!selectedEqpId) {
      setCheckInErrorMessage('선택된 설비 정보가 없어 저장할 수 없습니다.')
      return
    }

    try {
      setCheckInErrorMessage(null)
      await checkinMutation.mutateAsync({
        eqpId: selectedEqpId,
        request: { newVersion: version, description },
      })

      setLocalEditRows([])
      setEditMode(false)
      setIsCheckInModalOpen(false)
    } catch (error) {
      setCheckInErrorMessage(resolveErrorMessage(error, '체크인 중 오류가 발생했습니다.'))
    }
  }

  /**
   * 로그아웃 API 호출 후 로컬 UI 상태/캐시를 정리하고 로그인 페이지로 이동합니다.
   */
  const handleLogout = async () => {
    if (isLogoutPending) {
      return
    }

    setIsLogoutPending(true)

    try {
      await authApi.logout()
    } catch (error) {
      console.warn('[EqpPage] logout request failed, continuing with local cleanup', error)
    } finally {
      setProfileModalOpen(false)
      clearSelection()
      setAppliedVersion(EMPTY_VERSION_VALUE)
      setEditMode(false)
      setLocalEditRows([])
      setIsCheckInModalOpen(false)
      setCheckInErrorMessage(null)
      queryClient.clear()
      clearCsrfCookie()
      navigate(LOGIN_ROUTE, { replace: true })
    }
  }

  // 현재 파라미터 테이블에 표시할 행
  const displayParamRows: EqpParamRow[] = useMemo(() => {
    if (isEditMode) {
      // 편집 모드: 로컬 편집 행 우선, 없으면 EDIT 버전 데이터
      if (localEditRows.length > 0) {
        return localEditRows
      }
      return (editParamsQuery.data ?? []).map((p) => ({
        paramName: p.paramName,
        paramValue: p.paramValue ?? '',
        description: p.description ?? '',
      }))
    }
    // 읽기 모드: 선택된 버전 파라미터
    return (readParamsQuery.data ?? []).map((p) => ({
      paramName: p.paramName,
      paramValue: p.paramValue ?? '',
      description: p.description ?? '',
    }))
  }, [isEditMode, localEditRows, editParamsQuery.data, readParamsQuery.data])

  /**
   * Mode 영역에 표시할 텍스트를 결정합니다.
   * - 읽기 모드: 첫 번째 파라미터의 description
   * - 편집 모드(체크아웃 중): "{checkedOutBy}님이 편집 중"
   */
  const modeDescriptionText = useMemo(() => {
    if (isEditMode || checkoutStatus.isCheckedOut) {
      const checkedOutBy = checkoutStatus.checkedOutBy
      return checkedOutBy ? `${checkedOutBy}님이 편집 중` : '편집 중'
    }
    // 읽기 모드: 첫 번째 파라미터의 description 표시
    const firstParam = readParamsQuery.data?.[0]
    return firstParam?.description ?? ''
  }, [isEditMode, checkoutStatus, readParamsQuery.data])

  const listErrorMessage = eqpListQuery.error
    ? resolveErrorMessage(eqpListQuery.error, '설비 목록을 불러오지 못했습니다.')
    : null
  const versionErrorMessage = eqpParamVersionsQuery.error
    ? resolveErrorMessage(eqpParamVersionsQuery.error, '버전 목록을 불러오지 못했습니다.')
    : null

  // Check Out 버튼 비활성화: 설비 정보 없거나 다른 사용자가 이미 체크아웃 중인 경우
  // appliedVersion 없어도 (버전 없는 신규 설비) 체크아웃 가능 → !appliedVersion 조건 제거
  const isCheckoutDisabled =
    !eqpDetailQuery.data ||
    checkoutMutation.isPending ||
    isCheckoutSubmitting ||
    (checkoutStatus.isCheckedOut && !isEditMode)

  // 사이드바에 전달할 선택된 그룹 인덱스
  const selectedGroupIndex = selection.type === 'gateway_group' ? selection.groupIndex : null
  const topNavigationOffsetPx = sidebarOpen
    ? SIDEBAR_EXPANDED_WIDTH_PX + CONTENT_START_PADDING_PX - HEADER_HORIZONTAL_PADDING_PX
    : SIDEBAR_COLLAPSED_WIDTH_PX + CONTENT_START_PADDING_PX - HEADER_HORIZONTAL_PADDING_PX

  const handleNavigateMenu = (route: string | null) => {
    if (!route || route === '/eqp') {
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
              const isCurrentMenu = menuItem.name === 'Eqp'
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

      {/* main: flex-1로 남은 화면 전체 높이 차지, min-h-0으로 flex shrink 허용 */}
      <main className="flex flex-1 min-h-0">
        <EqpSidebar
          eqpItems={eqpItems}
          selectedEqpId={selectedEqpId}
          selectedGroupIndex={selectedGroupIndex}
          sidebarOpen={sidebarOpen}
          isLoading={eqpListQuery.isLoading}
          errorMessage={listErrorMessage}
          onSelectEqp={handleSelectEqp}
          onSelectGatewayGroup={handleSelectGatewayGroup}
          onToggleSidebar={toggleSidebar}
        />

        <section className="flex min-w-0 flex-1 flex-col">
          <div className="flex min-h-0 flex-1 flex-col">
            {/* 가운데 영역: selection 유형에 따라 콘텐츠 분기 */}
            {selection.type === 'none' ? (
              /* 초기 진입 / 선택 없음: 안내 문구만 표시 */
              <div className="flex flex-1 items-center justify-center text-sm text-[#8A8A8A]">
                설비 또는 게이트웨이 그룹을 선택해 주세요.
              </div>
            ) : selection.type === 'gateway_group' ? (
              /* gateway_app 그룹 선택: 설비 목록 테이블 (파라미터/Checkout 없음) */
              <section className="flex flex-1 flex-col p-3 md:p-4">
                <GatewayGroupTable eqpItems={gatewayGroupItems} groupName={selectedGroupName} />
              </section>
            ) : (
              /* 개별 설비 선택: 설비 정보 테이블 + ResizableDivider + 파라미터/Checkout 섹션 */
              <div
                ref={centerContainerRef}
                className="flex flex-1 flex-col overflow-hidden"
              >
                {/* 상단 패널: 설비 정보 테이블 */}
                <div
                  style={{ height: `${topPanelHeightPercent}%` }}
                  className="overflow-auto p-3 pb-0 md:p-4 md:pb-0"
                >
                  <EqpInfoTable
                    eqp={eqpDetailQuery.data ?? null}
                    modelInfo={eqpModelInfoQuery.data ?? null}
                    runtimeState={eqpRuntimeStateQuery.data ?? null}
                    isLoading={eqpDetailQuery.isLoading}
                    isFetching={
                      eqpDetailQuery.isFetching || eqpRuntimeStateQuery.isFetching || eqpModelInfoQuery.isFetching
                    }
                  />
                </div>

                {/* 드래그 핸들: 위아래 패널 크기 조절 (15% ~ 85%) */}
                <ResizableDivider onDrag={handleDividerDrag} />

                {/* 하단 패널: 버전 선택 + Check Out/In + 파라미터 테이블 */}
                <div
                  style={{ height: `${100 - topPanelHeightPercent}%` }}
                  className="min-h-0 p-3 pt-0 md:p-4 md:pt-0"
                >
                  <section className="flex h-full min-h-0 flex-col rounded-2xl border border-[#E4EAE6] bg-white p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex h-[34px] items-center gap-1.5">
                        <select
                          value={appliedVersion}
                          onChange={(event) => setAppliedVersion(event.target.value)}
                          disabled={isEditMode || versionOptions.length === 0 || eqpParamVersionsQuery.isLoading}
                          className="h-8 min-w-[232px] rounded-lg border border-[#97A8A1] bg-white px-2.5 text-xs font-medium text-[#1E3D33] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1C7F59]/30 disabled:cursor-not-allowed disabled:bg-[#F5F8F6] disabled:text-[#8A8A8A]"
                        >
                          {versionOptions.length === 0 ? (
                            <option value={EMPTY_VERSION_VALUE}>{NO_VERSION_OPTION_LABEL}</option>
                          ) : (
                            versionOptions.map((version) => (
                              <option key={version} value={version}>
                                {version}
                              </option>
                            ))
                          )}
                        </select>
                      </div>

                      <div className="flex items-center gap-2">
                        {isEditMode ? (
                          <>
                            {/* Save 버튼: 로컬 편집 내용을 DB EDIT 버전에 반영 */}
                            <Button
                              type="button"
                              variant="outline"
                              className="h-8 rounded-[10px] border-[#B8C9C1] bg-[#F3F7F5] px-3 text-xs font-semibold text-[#1E3D33]"
                              onClick={() => void handleSaveEditParams()}
                              disabled={saveEditParamsMutation.isPending || localEditRows.length === 0}
                            >
                              {saveEditParamsMutation.isPending ? (
                                <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                              ) : null}
                              Save
                            </Button>
                            {/* Check In 버튼 */}
                            <Button
                              type="button"
                              variant="outline"
                              className="h-8 rounded-[10px] border-[#B8C9C1] bg-[#F3F7F5] px-3 text-xs font-semibold text-[#1E3D33]"
                              onClick={handleRequestCheckIn}
                              disabled={!eqpDetailQuery.data || checkinMutation.isPending}
                            >
                              Check In
                            </Button>
                          </>
                        ) : (
                          /* Check Out 버튼: appliedVersion 없어도 활성화 (빈 EDIT 버전 생성 허용) */
                          <Button
                            type="button"
                            variant="outline"
                            className="h-8 rounded-[10px] border-[#B8C9C1] bg-[#F3F7F5] px-3 text-xs font-semibold text-[#1E3D33]"
                            onClick={() => void handleCheckOut()}
                            disabled={isCheckoutDisabled}
                            title={
                              checkoutStatus.isCheckedOut && checkoutStatus.checkedOutBy
                                ? `${checkoutStatus.checkedOutBy}님이 체크아웃 중`
                                : undefined
                            }
                          >
                            {checkoutMutation.isPending ? (
                              <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                            ) : null}
                            Check Out
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Mode 텍스트 영역: 읽기 모드는 첫 파라미터 description, 편집 모드는 "누구님이 편집 중" */}
                    <div className="mt-2 flex items-center gap-1 text-xs">
                      <span className={`${isEditMode ? 'font-medium text-[#7C9082]' : 'text-[#8A8A8A]'}`}>
                        {modeDescriptionText}
                      </span>
                    </div>

                    {checkInErrorMessage ? (
                      <p className="mt-2 text-xs text-[#C5534B]">{checkInErrorMessage}</p>
                    ) : null}

                    {versionErrorMessage ? (
                      <p className="mt-2 text-xs text-[#C5534B]">{versionErrorMessage}</p>
                    ) : null}

                    <div className="mt-3 min-h-0 flex-1 border-t border-[#E4EAE6] pt-3">
                      <EqpParamTable
                        rows={displayParamRows}
                        isEditMode={isEditMode}
                        onChangeValue={handleParamValueChange}
                      />
                    </div>
                  </section>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      <CheckInModal
        open={isCheckInModalOpen}
        isPending={checkinMutation.isPending}
        errorMessage={checkInErrorMessage}
        onOpenChange={setIsCheckInModalOpen}
        onSave={(version, description) => void handleCheckInSave(version, description)}
        onCancel={() => setIsCheckInModalOpen(false)}
      />

      <UserProfileModal open={isProfileModalOpen} onClose={() => setProfileModalOpen(false)} />
    </div>
  )
}
