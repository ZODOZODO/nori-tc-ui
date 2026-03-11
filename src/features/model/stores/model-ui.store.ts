import { create } from 'zustand'
import type { ModelDetailNode, ModelInfo, ModelOpenedTab } from '../types/model.types'

interface ModelUiState {
  selectedModelVersionKey: number | null
  sidebarOpen: boolean
  openedTabs: ModelOpenedTab[]
  activeTab: number | null
  detailNode: ModelDetailNode | null
  detailNodeByTab: Record<number, ModelDetailNode>
  isEditMode: boolean
  isCheckInModalOpen: boolean
  isProfileModalOpen: boolean
  setSelectedModelVersionKey: (modelVersionKey: number | null) => void
  setSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void
  openModelTab: (model: ModelInfo) => void
  closeModelTab: (modelVersionKey: number) => void
  setActiveTab: (modelVersionKey: number | null) => void
  setDetailNode: (node: ModelDetailNode | null) => void
  setDetailNodeForTab: (modelVersionKey: number, node: ModelDetailNode) => void
  setEditMode: (enabled: boolean) => void
  setCheckInModalOpen: (open: boolean) => void
  setProfileModalOpen: (open: boolean) => void
  reset: () => void
}

/**
 * ModelInfo를 Detail 탭 데이터 모델로 변환합니다.
 */
const toOpenedTab = (model: ModelInfo): ModelOpenedTab => ({
  modelVersionKey: model.modelVersionKey,
  modelKey: model.modelKey,
  modelName: model.modelName,
  modelVersion: model.modelVersion,
  commInterface: model.commInterface,
})

/**
 * Model 화면 전역 UI 상태 저장소입니다.
 */
export const useModelUiStore = create<ModelUiState>((set) => ({
  selectedModelVersionKey: null,
  sidebarOpen: true,
  openedTabs: [],
  activeTab: null,
  detailNode: null,
  detailNodeByTab: {},
  isEditMode: false,
  isCheckInModalOpen: false,
  isProfileModalOpen: false,
  setSelectedModelVersionKey: (modelVersionKey) => set({ selectedModelVersionKey: modelVersionKey }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  openModelTab: (model) =>
    set((state) => {
      const tab = toOpenedTab(model)
      const alreadyOpened = state.openedTabs.some(
        (openedTab) => openedTab.modelVersionKey === tab.modelVersionKey,
      )
      const nextTabs = alreadyOpened ? state.openedTabs : [...state.openedTabs, tab]
      const nextDetailNode =
        state.detailNodeByTab[tab.modelVersionKey] ?? state.detailNode ?? 'model-parameter'

      return {
        openedTabs: nextTabs,
        activeTab: tab.modelVersionKey,
        selectedModelVersionKey: tab.modelVersionKey,
        detailNode: nextDetailNode,
        detailNodeByTab: {
          ...state.detailNodeByTab,
          [tab.modelVersionKey]: nextDetailNode,
        },
      }
    }),
  closeModelTab: (modelVersionKey) =>
    set((state) => {
      const nextTabs = state.openedTabs.filter((tab) => tab.modelVersionKey !== modelVersionKey)
      const nextDetailNodeByTab = { ...state.detailNodeByTab }
      delete nextDetailNodeByTab[modelVersionKey]

      if (state.activeTab !== modelVersionKey) {
        const nextSelectedModelVersionKey =
          state.selectedModelVersionKey === modelVersionKey
            ? (state.activeTab ?? nextTabs[nextTabs.length - 1]?.modelVersionKey ?? null)
            : state.selectedModelVersionKey

        return {
          openedTabs: nextTabs,
          detailNodeByTab: nextDetailNodeByTab,
          selectedModelVersionKey: nextSelectedModelVersionKey,
        }
      }

      const nextActiveTab = nextTabs.length > 0 ? nextTabs[nextTabs.length - 1].modelVersionKey : null

      return {
        openedTabs: nextTabs,
        activeTab: nextActiveTab,
        // 마지막 탭을 닫아도 Model 정보 레이아웃은 유지해야 하므로 선택 키를 보존합니다.
        selectedModelVersionKey: nextActiveTab ?? state.selectedModelVersionKey ?? modelVersionKey,
        detailNode: nextActiveTab !== null ? (nextDetailNodeByTab[nextActiveTab] ?? null) : null,
        detailNodeByTab: nextDetailNodeByTab,
      }
    }),
  setActiveTab: (modelVersionKey) =>
    set((state) => ({
      activeTab: modelVersionKey,
      selectedModelVersionKey: modelVersionKey,
      detailNode: modelVersionKey !== null ? (state.detailNodeByTab[modelVersionKey] ?? null) : null,
    })),
  setDetailNode: (node) =>
    set((state) => {
      if (state.activeTab === null || node === null) {
        return { detailNode: node }
      }

      return {
        detailNode: node,
        detailNodeByTab: {
          ...state.detailNodeByTab,
          [state.activeTab]: node,
        },
      }
    }),
  setDetailNodeForTab: (modelVersionKey, node) =>
    set((state) => ({
      detailNodeByTab: {
        ...state.detailNodeByTab,
        [modelVersionKey]: node,
      },
      detailNode: state.activeTab === modelVersionKey ? node : state.detailNode,
    })),
  setEditMode: (enabled) => set({ isEditMode: enabled }),
  setCheckInModalOpen: (open) => set({ isCheckInModalOpen: open }),
  setProfileModalOpen: (open) => set({ isProfileModalOpen: open }),
  reset: () =>
    set({
      selectedModelVersionKey: null,
      sidebarOpen: true,
      openedTabs: [],
      activeTab: null,
      detailNode: null,
      detailNodeByTab: {},
      isEditMode: false,
      isCheckInModalOpen: false,
      isProfileModalOpen: false,
    }),
}))
