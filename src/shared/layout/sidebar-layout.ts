export const SIDEBAR_COLLAPSED_WIDTH_PX = 56
export const SIDEBAR_DEFAULT_WIDTH_PX = 240
export const SIDEBAR_MIN_WIDTH_PX = 220
export const SIDEBAR_MAX_WIDTH_PX = 420

/**
 * 사이드바 드래그 폭을 공통 범위 안으로 제한합니다.
 */
export const clampSidebarWidth = (width: number): number =>
  Math.min(SIDEBAR_MAX_WIDTH_PX, Math.max(SIDEBAR_MIN_WIDTH_PX, Math.round(width)))
