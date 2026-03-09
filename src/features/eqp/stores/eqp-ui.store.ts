import { create } from 'zustand'

interface EqpUiState {
  selectedEqpId: string | null
  sidebarOpen: boolean
  isEditMode: boolean
  isProfileModalOpen: boolean
  setSelectedEqpId: (eqpId: string | null) => void
  setSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void
  setEditMode: (enabled: boolean) => void
  setProfileModalOpen: (open: boolean) => void
}

/**
 * EQP 화면 전역 UI 상태 저장소입니다.
 * - 사이드바 확장/축소
 * - 선택 EQP
 * - 편집 모드
 * - 프로필 모달 오픈 상태를 한 곳에서 관리합니다.
 */
export const useEqpUiStore = create<EqpUiState>((set) => ({
  selectedEqpId: null,
  sidebarOpen: true,
  isEditMode: false,
  isProfileModalOpen: false,
  setSelectedEqpId: (eqpId) => set({ selectedEqpId: eqpId }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setEditMode: (enabled) => set({ isEditMode: enabled }),
  setProfileModalOpen: (open) => set({ isProfileModalOpen: open }),
}))
