import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import {
  clampSidebarWidth,
  SIDEBAR_COLLAPSED_WIDTH_PX,
  SIDEBAR_DEFAULT_WIDTH_PX,
} from '../layout/sidebar-layout'

interface SharedLayoutState {
  sidebarOpen: boolean
  sidebarWidth: number
  expandedSidebarWidth: number
  setSidebarOpen: (open: boolean) => void
  setSidebarWidth: (width: number) => void
  expandSidebar: () => void
  collapseSidebar: () => void
  toggleSidebar: () => void
}

/**
 * EQP / Model 페이지 공용 사이드바 레이아웃 상태 저장소입니다.
 *
 * - localStorage에 영구 저장되어 페이지 이동 시 사이드바 폭·개폐 상태가 유지됩니다.
 * - eqp-ui.store와 model-ui.store의 사이드바 관련 상태를 이 공용 store로 대체합니다.
 */
export const useSharedLayoutStore = create<SharedLayoutState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      sidebarWidth: SIDEBAR_DEFAULT_WIDTH_PX,
      expandedSidebarWidth: SIDEBAR_DEFAULT_WIDTH_PX,
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
    }),
    {
      name: 'shared-sidebar-layout',
      storage: createJSONStorage(() => localStorage),
    },
  ),
)
