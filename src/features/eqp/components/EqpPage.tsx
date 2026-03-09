import { useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { ChevronDown, CircleUserRound, Loader2, LogOut } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { CheckInModal } from './CheckInModal'
import { EqpInfoTable } from './EqpInfoTable'
import { EqpParamTable } from './EqpParamTable'
import { EqpSidebar } from './EqpSidebar'
import { authApi } from '@/features/auth/api/auth.api'
import { useEqpMutations } from '../hooks/useEqpMutations'
import { useEqpDetail } from '../hooks/useEqpDetail'
import { useEqpList } from '../hooks/useEqpList'
import { useEqpModelInfo } from '../hooks/useEqpModelInfo'
import { useEqpParamVersions } from '../hooks/useEqpParamVersions'
import { useEqpRuntimeState } from '../hooks/useEqpRuntimeState'
import { useEqpUiStore } from '../stores/eqp-ui.store'
import { EqpApiError, type EqpInfo, type EqpParamRow } from '../types/eqp.types'
import { UserProfileModal } from '@/features/profile/components/UserProfileModal'

const LOGIN_ROUTE = '/login'
const CSRF_COOKIE_NAME = 'XSRF-TOKEN'
const EMPTY_VERSION_VALUE = ''
const NO_VERSION_OPTION_LABEL = '버전 없음'
const READ_ONLY_MODE_TEXT = 'Read-only (Check Out): table locked'
const EDIT_MODE_TEXT = 'Editable (Check In): table unlocked'

/**
 * 선택 설비 정보를 바탕으로 EQP Parameter 테이블의 기본 행을 구성합니다.
 * 현재 전용 파라미터 API가 없기 때문에 상세 데이터에서 파생한 값을 사용합니다.
 */
const createInitialParamRows = (eqp: EqpInfo): EqpParamRow[] => [
  {
    paramName: 'connectionTimeoutMs',
    paramValue: '30000',
    description: `통신 타임아웃 (${eqp.commInterface})`,
  },
  {
    paramName: 'heartbeatIntervalSec',
    paramValue: '5',
    description: `Comm Mode: ${eqp.commMode}`,
  },
  {
    paramName: 'routePartition',
    paramValue: String(eqp.routePartition ?? 0),
    description: `Gateway Partition (EQP ${eqp.eqpId})`,
  },
]

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
 * design.pen의 versionRow 문구 규칙에 맞춰 현재 편집 모드 상태를 텍스트로 변환합니다.
 */
const resolveModeText = (isEditMode: boolean): string =>
  isEditMode ? EDIT_MODE_TEXT : READ_ONLY_MODE_TEXT

/**
 * EQP 목록 항목의 최소 유효성(eqpId 문자열)을 확인합니다.
 * 일부 항목 데이터가 비정상이어도 화면 전체가 중단되지 않도록 방어적으로 필터링합니다.
 */
const isEqpInfoItem = (value: unknown): value is EqpInfo =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as { eqpId?: unknown }).eqpId === 'string' &&
  (value as { eqpId: string }).eqpId.length > 0

/**
 * 목록 payload를 화면에서 안전하게 사용할 수 있는 EQP 배열로 정규화합니다.
 * 표준 페이지 응답({items})과 구형 배열 응답(data=[])을 모두 수용합니다.
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
 * HttpOnly 인증 쿠키는 JS에서 직접 삭제할 수 없으므로 서버 로그아웃 응답의 Set-Cookie를 사용합니다.
 */
const clearCsrfCookie = () => {
  if (typeof document === 'undefined') {
    return
  }
  document.cookie = `${CSRF_COOKIE_NAME}=; Max-Age=0; path=/`
}

/**
 * EQP Info 메인 페이지입니다.
 * 사이드바/상단 정보 테이블/파라미터 테이블/체크인 모달/프로필 모달을 조합합니다.
 */
export function EqpPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  // 객체 셀렉터는 매 호출마다 새 참조를 반환해 React의 useSyncExternalStore 일관성 검증에서
  // 무한 리렌더를 유발한다. 개별 셀렉터로 분리하면 primitive/함수 참조를 반환하므로 안전하다.
  const selectedEqpId = useEqpUiStore((state) => state.selectedEqpId)
  const sidebarOpen = useEqpUiStore((state) => state.sidebarOpen)
  const isEditMode = useEqpUiStore((state) => state.isEditMode)
  const isProfileModalOpen = useEqpUiStore((state) => state.isProfileModalOpen)
  const setSelectedEqpId = useEqpUiStore((state) => state.setSelectedEqpId)
  const toggleSidebar = useEqpUiStore((state) => state.toggleSidebar)
  const setEditMode = useEqpUiStore((state) => state.setEditMode)
  const setProfileModalOpen = useEqpUiStore((state) => state.setProfileModalOpen)

  const eqpListQuery = useEqpList()
  const eqpDetailQuery = useEqpDetail(selectedEqpId)
  const eqpParamVersionsQuery = useEqpParamVersions(selectedEqpId)
  const eqpRuntimeStateQuery = useEqpRuntimeState(selectedEqpId)
  const eqpModelInfoQuery = useEqpModelInfo(
    eqpDetailQuery.data && eqpDetailQuery.data.modelVersionKey > 0
      ? eqpDetailQuery.data.modelVersionKey
      : null,
  )
  const { updateEqpMutation } = useEqpMutations()
  const eqpItems = useMemo(() => resolveEqpItems(eqpListQuery.data as unknown), [eqpListQuery.data])
  const versionOptions = useMemo(
    () => Array.from(new Set((eqpParamVersionsQuery.data ?? []).map((version) => version.trim()))).filter(Boolean),
    [eqpParamVersionsQuery.data],
  )

  const [appliedVersion, setAppliedVersion] = useState(EMPTY_VERSION_VALUE)
  const [persistedParamRowsByEqp, setPersistedParamRowsByEqp] = useState<Record<string, EqpParamRow[]>>({})
  const [editParamRows, setEditParamRows] = useState<EqpParamRow[]>([])
  const [isCheckInModalOpen, setIsCheckInModalOpen] = useState(false)
  const [checkInErrorMessage, setCheckInErrorMessage] = useState<string | null>(null)
  const [isLogoutPending, setIsLogoutPending] = useState(false)

  /**
   * 현재 선택된 EQP에 대응하는 파라미터 행입니다.
   * 저장된 편집본이 있으면 우선 사용하고, 없으면 상세 정보 기반 기본값을 생성합니다.
   */
  const currentParamRows = useMemo(() => {
    if (!eqpDetailQuery.data) {
      return []
    }

    return persistedParamRowsByEqp[eqpDetailQuery.data.eqpId] ?? createInitialParamRows(eqpDetailQuery.data)
  }, [persistedParamRowsByEqp, eqpDetailQuery.data])

  /**
   * 목록 로드 후 첫 번째 EQP를 기본 선택값으로 설정합니다.
   */
  useEffect(() => {
    if (selectedEqpId || eqpItems.length === 0) {
      return
    }

    const firstEqpId = eqpItems[0]?.eqpId
    if (!firstEqpId) {
      return
    }

    setSelectedEqpId(firstEqpId)
  }, [selectedEqpId, eqpItems, setSelectedEqpId])

  /**
   * 선택 EQP 변경 또는 버전 목록 갱신 시 selectBtn 기본 선택값을 정렬합니다.
   * - 현재 선택값이 목록에 있으면 유지
   * - 없으면 첫 번째 버전으로 교체
   * - 버전이 없으면 빈 값으로 초기화
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

  const handleSelectEqp = (eqpId: string) => {
    setSelectedEqpId(eqpId)
    setAppliedVersion(EMPTY_VERSION_VALUE)
    setEditMode(false)
    setEditParamRows([])
    setIsCheckInModalOpen(false)
    setCheckInErrorMessage(null)
  }

  const handleCheckOut = () => {
    if (!eqpDetailQuery.data) {
      return
    }

    setEditParamRows(currentParamRows.map((row) => ({ ...row })))
    setEditMode(true)
    setCheckInErrorMessage(null)
  }

  const handleRequestCheckIn = () => {
    if (!isEditMode) {
      return
    }

    setCheckInErrorMessage(null)
    setIsCheckInModalOpen(true)
  }

  const handleParamValueChange = (paramName: string, nextValue: string) => {
    setEditParamRows((prevRows) =>
      prevRows.map((row) => (row.paramName === paramName ? { ...row, paramValue: nextValue } : row)),
    )
  }

  const handleUndoEdit = () => {
    setEditParamRows([])
    setEditMode(false)
    setIsCheckInModalOpen(false)
    setCheckInErrorMessage(null)
  }

  const handleCheckInSave = async () => {
    if (!selectedEqpId || !eqpDetailQuery.data) {
      setCheckInErrorMessage('선택된 설비 정보가 없어 저장할 수 없습니다.')
      return
    }

    try {
      setCheckInErrorMessage(null)
      await updateEqpMutation.mutateAsync({
        eqpId: selectedEqpId,
        request: {
          interfaceType: eqpDetailQuery.data.commInterface,
          uiMessage: `CheckIn Applied Version: ${appliedVersion || NO_VERSION_OPTION_LABEL}`,
          equipmentProfile: null,
        },
      })

      const rowsToPersist = editParamRows.length > 0 ? editParamRows : currentParamRows
      setPersistedParamRowsByEqp((prevRows) => ({
        ...prevRows,
        [selectedEqpId]: rowsToPersist,
      }))
      setEditParamRows([])
      setEditMode(false)
      setIsCheckInModalOpen(false)
    } catch (error) {
      setCheckInErrorMessage(resolveErrorMessage(error, '설비 저장 중 오류가 발생했습니다.'))
    }
  }

  /**
   * 로그아웃 API 호출 후 로컬 UI 상태/캐시를 정리하고 로그인 페이지로 이동합니다.
   * 서버 요청 실패 시에도 클라이언트 상태는 즉시 초기화해 재로그인 흐름을 보장합니다.
   */
  const handleLogout = async () => {
    if (isLogoutPending) {
      return
    }

    setIsLogoutPending(true)

    try {
      await authApi.logout()
      console.info('[EqpPage] logout completed')
    } catch (error) {
      console.warn('[EqpPage] logout request failed, continuing with local cleanup', error)
    } finally {
      setProfileModalOpen(false)
      setSelectedEqpId(null)
      setAppliedVersion(EMPTY_VERSION_VALUE)
      setEditMode(false)
      setEditParamRows([])
      setPersistedParamRowsByEqp({})
      setIsCheckInModalOpen(false)
      setCheckInErrorMessage(null)
      queryClient.clear()
      clearCsrfCookie()
      navigate(LOGIN_ROUTE, { replace: true })
    }
  }

  const listErrorMessage = eqpListQuery.error
    ? resolveErrorMessage(eqpListQuery.error, '설비 목록을 불러오지 못했습니다.')
    : null
  const versionErrorMessage = eqpParamVersionsQuery.error
    ? resolveErrorMessage(eqpParamVersionsQuery.error, '버전 목록을 불러오지 못했습니다.')
    : null

  return (
    <div className="flex min-h-screen w-screen flex-col bg-[#F7FAF8]">
      <header className="flex h-[52px] items-center justify-between bg-white px-5">
        <div className="flex items-center gap-2.5">
          <div className="flex size-7 items-center justify-center rounded-md bg-[#d95d39]">
            <span className="font-fraunces text-sm font-medium text-white">N</span>
          </div>
          <span className="font-fraunces text-lg text-[#2D2D2D]">Nori-TC</span>
        </div>

        <nav className="hidden items-center gap-2 md:flex">
          {[
            ['Eqp', 'Eqp Info'],
            ['Model', 'Model Info'],
            ['Deploy', 'Eqp Deploy / Model Deploy'],
            ['Dlq', 'Gateway Dlq / Business Dlq'],
            ['User', 'User Info / Group Info'],
          ].map(([menuName, subLabel]) => (
            <button
              key={menuName}
              type="button"
              className={`group inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold ${
                menuName === 'Eqp'
                  ? 'bg-[#EAF5EE] text-[#215A43]'
                  : 'text-[#5B6962] hover:bg-[#F2F6F3]'
              }`}
            >
              {menuName}
              <ChevronDown className="size-3" />
              <span className="pointer-events-none absolute mt-12 hidden rounded-md border border-[#E2E9E4] bg-white px-2 py-1 text-[10px] text-[#5D6963] group-hover:block">
                {subLabel}
              </span>
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-9 rounded-full border-[#DCE5E0] px-3 text-xs font-semibold text-[#4B5A52]"
            onClick={() => void handleLogout()}
            disabled={isLogoutPending}
            aria-label="로그아웃"
          >
            {isLogoutPending ? <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> : <LogOut className="size-3.5" aria-hidden="true" />}
            로그아웃
          </Button>

          <Button
            type="button"
            variant="ghost"
            className="size-9 rounded-full border border-[#DCE5E0] text-[#4B5A52]"
            onClick={() => setProfileModalOpen(true)}
            aria-label="사용자 프로필 열기"
            disabled={isLogoutPending}
          >
            <CircleUserRound className="size-4" />
          </Button>
        </div>
      </header>

      <div className="h-px bg-[#E5ECE7]" />

      <main className="flex min-h-0 flex-1 overflow-hidden">
        <EqpSidebar
          eqpItems={eqpItems}
          selectedEqpId={selectedEqpId}
          sidebarOpen={sidebarOpen}
          isLoading={eqpListQuery.isLoading}
          errorMessage={listErrorMessage}
          onSelectEqp={handleSelectEqp}
          onToggleSidebar={toggleSidebar}
        />

        <section className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3 md:p-4">
          <EqpInfoTable
            eqp={eqpDetailQuery.data ?? null}
            modelInfo={eqpModelInfoQuery.data ?? null}
            runtimeState={eqpRuntimeStateQuery.data ?? null}
            isLoading={eqpDetailQuery.isLoading}
            isFetching={
              eqpDetailQuery.isFetching || eqpRuntimeStateQuery.isFetching || eqpModelInfoQuery.isFetching
            }
          />

          <section className="rounded-2xl border border-[#E4EAE6] bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex h-[34px] items-center gap-1.5">
                <select
                  value={appliedVersion}
                  onChange={(event) => setAppliedVersion(event.target.value)}
                  disabled={versionOptions.length === 0 || eqpParamVersionsQuery.isLoading}
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

              {isEditMode ? (
                <Button
                  type="button"
                  variant="outline"
                  className="h-8 rounded-[10px] border-[#B8C9C1] bg-[#F3F7F5] px-3 text-xs font-semibold text-[#1E3D33]"
                  onClick={handleRequestCheckIn}
                  disabled={!eqpDetailQuery.data}
                >
                  Check In
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="h-8 rounded-[10px] border-[#B8C9C1] bg-[#F3F7F5] px-3 text-xs font-semibold text-[#1E3D33]"
                  onClick={handleCheckOut}
                  disabled={!eqpDetailQuery.data}
                >
                  Check Out
                </Button>
              )}
            </div>

            <div className="mt-2 flex items-center gap-1 text-xs">
              <span className="text-[#8A8A8A]">Mode :</span>
              <span className={isEditMode ? 'font-medium text-[#7C9082]' : 'font-medium text-[#8A8A8A]'}>
                {resolveModeText(isEditMode)}
              </span>
            </div>

            {versionErrorMessage ? (
              <p className="mt-2 text-xs text-[#C5534B]">{versionErrorMessage}</p>
            ) : null}

            <div className="mt-3 border-t border-[#E4EAE6] pt-3">
              <EqpParamTable
                rows={isEditMode ? editParamRows : currentParamRows}
                isEditMode={isEditMode}
                onChangeValue={handleParamValueChange}
              />
            </div>
          </section>
        </section>
      </main>

      <CheckInModal
        open={isCheckInModalOpen}
        isPending={updateEqpMutation.isPending}
        errorMessage={checkInErrorMessage}
        onOpenChange={setIsCheckInModalOpen}
        onSave={() => void handleCheckInSave()}
        onUndo={handleUndoEdit}
        onCancel={() => setIsCheckInModalOpen(false)}
      />

      <UserProfileModal open={isProfileModalOpen} onClose={() => setProfileModalOpen(false)} />
    </div>
  )
}
