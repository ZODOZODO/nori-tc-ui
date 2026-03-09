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
import { useEqpCheckoutStatus } from '../hooks/useEqpCheckoutStatus'
import { useEqpParams } from '../hooks/useEqpParams'
import { useEqpParamMutations } from '../hooks/useEqpParamMutations'
import { useEqpUiStore } from '../stores/eqp-ui.store'
import { EqpApiError, type EqpInfo, type EqpParamRow } from '../types/eqp.types'
import { UserProfileModal } from '@/features/profile/components/UserProfileModal'

const LOGIN_ROUTE = '/login'
const CSRF_COOKIE_NAME = 'XSRF-TOKEN'
const EMPTY_VERSION_VALUE = ''
const NO_VERSION_OPTION_LABEL = '버전 없음'

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
 */
export function EqpPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

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

  const { checkoutMutation, saveEditParamsMutation, checkinMutation } = useEqpParamMutations()
  const { updateEqpMutation } = useEqpMutations()

  const eqpItems = useMemo(() => resolveEqpItems(eqpListQuery.data as unknown), [eqpListQuery.data])
  const versionOptions = useMemo(
    () => Array.from(new Set((eqpParamVersionsQuery.data ?? []).map((version) => version.trim()))).filter(Boolean),
    [eqpParamVersionsQuery.data],
  )

  const checkoutStatus = useMemo(() => ({
    isCheckedOut: checkoutStatusQuery.data?.isCheckedOut ?? false,
    checkedOutBy: checkoutStatusQuery.data?.checkedOutBy ?? null,
  }), [checkoutStatusQuery.data])

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
   * 선택 EQP 변경 또는 버전 목록 갱신 시 버전 기본 선택값을 조정합니다.
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

  const handleSelectEqp = (eqpId: string) => {
    setSelectedEqpId(eqpId)
    setAppliedVersion(EMPTY_VERSION_VALUE)
    setEditMode(false)
    setLocalEditRows([])
    setIsCheckInModalOpen(false)
    setCheckInErrorMessage(null)
  }

  /**
   * Check Out 버튼 클릭: DB에 EDIT 버전 파라미터 생성 후 편집 모드로 전환합니다.
   */
  const handleCheckOut = async () => {
    if (!selectedEqpId || !appliedVersion) {
      return
    }

    try {
      setCheckInErrorMessage(null)
      await checkoutMutation.mutateAsync({
        eqpId: selectedEqpId,
        request: { sourceVersion: appliedVersion },
      })
      setEditMode(true)
    } catch (error) {
      // 409 (이미 체크아웃 중) 포함한 오류를 사용자에게 표시
      setCheckInErrorMessage(resolveErrorMessage(error, '체크아웃에 실패했습니다.'))
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
      setSelectedEqpId(null)
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

  // Check Out 버튼 비활성화: 다른 사용자가 이미 체크아웃 중이거나 버전이 없는 경우
  const isCheckoutDisabled =
    !eqpDetailQuery.data ||
    !appliedVersion ||
    checkoutMutation.isPending ||
    (checkoutStatus.isCheckedOut && !isEditMode)

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
                  /* Check Out 버튼 */
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

            <div className="mt-3 border-t border-[#E4EAE6] pt-3">
              <EqpParamTable
                rows={displayParamRows}
                isEditMode={isEditMode}
                onChangeValue={handleParamValueChange}
              />
            </div>
          </section>
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
