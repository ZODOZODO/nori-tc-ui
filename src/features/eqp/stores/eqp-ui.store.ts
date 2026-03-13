import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import {
  clampSidebarWidth,
  SIDEBAR_COLLAPSED_WIDTH_PX,
  SIDEBAR_DEFAULT_WIDTH_PX,
} from '@/shared/layout/sidebar-layout'
import type { EqpSelection } from '../types/eqp.types'

interface EqpUiState {
  selection: EqpSelection
  sidebarOpen: boolean
  sidebarWidth: number
  expandedSidebarWidth: number
  isEditMode: boolean
  isProfileModalOpen: boolean
  selectEqp: (eqpId: string) => void
  selectGatewayGroup: (groupIndex: number) => void
  clearSelection: () => void
  setSidebarOpen: (open: boolean) => void
  setSidebarWidth: (width: number) => void
  expandSidebar: () => void
  collapseSidebar: () => void
  toggleSidebar: () => void
  setEditMode: (enabled: boolean) => void
  setProfileModalOpen: (open: boolean) => void
}

interface EqpUiPersistedState {
  selection: EqpSelection
}

const EQP_UI_SELECTION_STORAGE_KEY = 'eqp-ui-selection'

/**
 * EQP 화면 전역 UI 상태 저장소입니다.
 * - 사이드바 확장/축소
 * - 선택 상태 (없음/gateway_group/개별 설비)
 * - 편집 모드
 * - 프로필 모달 오픈 상태를 한 곳에서 관리합니다.
 */
export const useEqpUiStore = create<EqpUiState>()(
  persist(
    (set) => ({
      selection: { type: 'none' },
      sidebarOpen: true,
      sidebarWidth: SIDEBAR_DEFAULT_WIDTH_PX,
      expandedSidebarWidth: SIDEBAR_DEFAULT_WIDTH_PX,
      isEditMode: false,
      isProfileModalOpen: false,
      // 개별 설비 선택
      selectEqp: (eqpId) => set({ selection: { type: 'eqp', eqpId } }),
      // gateway_app 그룹 선택
      selectGatewayGroup: (groupIndex) => set({ selection: { type: 'gateway_group', groupIndex } }),
      // 선택 초기화
      clearSelection: () => set({ selection: { type: 'none' } }),
      setSidebarOpen: (open) =>
        set((state) =>
          open
            ? {
                sidebarOpen: true,
                sidebarWidth: clampSidebarWidth(state.expandedSidebarWidth),
              }
            : {
                sidebarOpen: false,
                sidebarWidth: SIDEBAR_COLLAPSED_WIDTH_PX,
                expandedSidebarWidth: clampSidebarWidth(state.sidebarWidth),
              },
        ),
      setSidebarWidth: (width) =>
        set({
          sidebarOpen: true,
          sidebarWidth: clampSidebarWidth(width),
          expandedSidebarWidth: clampSidebarWidth(width),
        }),
      expandSidebar: () =>
        set((state) => ({
          sidebarOpen: true,
          sidebarWidth: clampSidebarWidth(state.expandedSidebarWidth),
        })),
      collapseSidebar: () =>
        set((state) => ({
          sidebarOpen: false,
          sidebarWidth: SIDEBAR_COLLAPSED_WIDTH_PX,
          expandedSidebarWidth: clampSidebarWidth(state.sidebarWidth),
        })),
      toggleSidebar: () =>
        set((state) =>
          state.sidebarOpen
            ? {
                sidebarOpen: false,
                sidebarWidth: SIDEBAR_COLLAPSED_WIDTH_PX,
                expandedSidebarWidth: clampSidebarWidth(state.sidebarWidth),
              }
            : {
                sidebarOpen: true,
                sidebarWidth: clampSidebarWidth(state.expandedSidebarWidth),
              },
        ),
      setEditMode: (enabled) => set({ isEditMode: enabled }),
      setProfileModalOpen: (open) => set({ isProfileModalOpen: open }),
    }),
    {
      name: EQP_UI_SELECTION_STORAGE_KEY,
      storage: createJSONStorage(() => sessionStorage),
      // 선택 상태만 sessionStorage에 보관하고, 나머지 UI 상태는 휘발 상태로 유지합니다.
      partialize: (state): EqpUiPersistedState => ({
        selection: state.selection,
      }),
    },
  ),
)
