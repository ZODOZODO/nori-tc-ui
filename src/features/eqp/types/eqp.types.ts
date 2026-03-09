import type { ApiResponse } from '@/features/auth/types/auth.types'

/**
 * 설비 통신 인터페이스 타입입니다.
 * 백엔드 enum 변경 가능성을 고려해 string fallback을 허용합니다.
 */
export type EqpInterfaceType = 'HSMS' | 'SOCKET' | (string & {})

/**
 * GET /api/eqp, GET /api/eqp/{eqpId} 응답의 설비 단건 모델입니다.
 */
export interface EqpInfo {
  eqpKey: number
  eqpId: string
  commInterface: EqpInterfaceType
  commMode: string
  routePartition: number | null
  eqpIp: string
  eqpPort: number
  modelVersionKey: number
  enabled: boolean
  createdAt: string
  updatedAt: string
  createdBy: string
  updatedBy: string
}

/**
 * 선택 설비의 연결 모델 정보 응답 모델입니다.
 * /api/model/{modelVersionKey}에서 필요한 필드만 매핑합니다.
 */
export interface EqpModelInfo {
  modelVersionKey: number
  modelName: string
  modelVersion: string
}

/**
 * 선택 설비의 런타임 상태 응답 모델입니다.
 * /api/eqp/{eqpId}/runtime-state 조회 결과를 사용합니다.
 */
export interface EqpRuntimeState {
  controlState: string | null
  eqpState: string | null
  connectionState: string | null
}

/**
 * 페이지네이션된 설비 목록 payload 입니다.
 */
export interface EqpInfoPage {
  items: EqpInfo[]
  offset: number
  limit: number
  count: number
}

/**
 * EQP 목록 조회 응답 타입입니다.
 */
export type EqpInfoListResponse = ApiResponse<EqpInfoPage>

/**
 * EQP 단건 조회 응답 타입입니다.
 */
export type EqpInfoDetailResponse = ApiResponse<EqpInfo>

/**
 * EQP 파라미터 버전 목록 조회 응답 타입입니다.
 */
export type EqpParamVersionListResponse = ApiResponse<string[]>

/**
 * 모델 상세 조회 응답 타입입니다.
 */
export type EqpModelInfoResponse = ApiResponse<EqpModelInfo>

/**
 * 설비 런타임 상태 조회 응답 타입입니다.
 */
export type EqpRuntimeStateResponse = ApiResponse<EqpRuntimeState>

/**
 * EQP 생성 요청 DTO 입니다.
 */
export interface EqpCreateRequest {
  eqpId: string
  interfaceType: EqpInterfaceType
  uiMessage?: string | null
  equipmentProfile?: Record<string, unknown> | null
}

/**
 * EQP 수정 요청 DTO 입니다.
 */
export interface EqpUpdateRequest {
  interfaceType: EqpInterfaceType
  uiMessage?: string | null
  equipmentProfile?: Record<string, unknown> | null
}

/**
 * EQP start/end 요청 DTO 입니다.
 */
export interface EqpLifecycleRequest {
  interfaceType: EqpInterfaceType
  uiMessage?: string | null
}

/**
 * create/update/delete 계열의 공통 응답 타입입니다.
 */
export type EqpDualCommandResponse = ApiResponse<null>

/**
 * START/END 202 Accepted 응답 payload 입니다.
 */
export interface AsyncAcceptData {
  traceId: string
}

/**
 * START/END 요청의 즉시 응답 타입입니다.
 */
export type AsyncAcceptResponse = ApiResponse<AsyncAcceptData>

/**
 * GET /api/async/{traceId} polling 결과 payload 입니다.
 */
export interface AsyncResultData {
  traceId: string
  eqpId: string | null
  status: 'PENDING' | 'PASS' | 'FAIL' | 'TIMEOUT' | (string & {})
  errorCode: string | null
  errorMsg: string | null
}

/**
 * polling 결과 응답 타입입니다.
 */
export type AsyncResultResponse = ApiResponse<AsyncResultData>

/**
 * EQP Parameter UI 전용 행 모델입니다.
 * 현재 전용 API가 없으므로 화면 상태로 관리합니다.
 */
export interface EqpParamRow {
  paramName: string
  paramValue: string
  description: string
}

/**
 * 실패 응답 payload 최소 타입입니다.
 */
export type EqpFailResponse = ApiResponse<null> & {
  success: false
  data: null
  errorCode: string
  errorMsg: string
}

/**
 * EQP API 계층 공통 기본 오류 메시지입니다.
 */
export const DEFAULT_EQP_ERROR_MESSAGE =
  '설비 정보를 처리하는 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

/**
 * 런타임 응답 구조가 ApiResponse 계약인지 검사합니다.
 */
export const isApiResponse = <TData = unknown>(value: unknown): value is ApiResponse<TData> => {
  if (!isRecord(value)) {
    return false
  }

  const hasSuccess = typeof value.success === 'boolean'
  const hasData = 'data' in value
  const hasErrorCode = value.errorCode === null || typeof value.errorCode === 'string'
  const hasErrorMsg = value.errorMsg === null || typeof value.errorMsg === 'string'

  return hasSuccess && hasData && hasErrorCode && hasErrorMsg
}

/**
 * 알 수 없는 실패 payload를 EqpFailResponse 형태로 정규화합니다.
 */
export const createEqpFailResponse = (
  payload: unknown,
  fallbackMessage = DEFAULT_EQP_ERROR_MESSAGE,
): EqpFailResponse => {
  if (isApiResponse(payload) && payload.success === false) {
    return {
      success: false,
      data: null,
      errorCode:
        typeof payload.errorCode === 'string' && payload.errorCode.length > 0
          ? payload.errorCode
          : 'UNKNOWN_ERROR',
      errorMsg:
        typeof payload.errorMsg === 'string' && payload.errorMsg.length > 0
          ? payload.errorMsg
          : fallbackMessage,
    }
  }

  return {
    success: false,
    data: null,
    errorCode: 'UNKNOWN_ERROR',
    errorMsg: fallbackMessage,
  }
}

/**
 * EQP API 레이어 전용 에러 객체입니다.
 * status가 있으면 HTTP 상태코드를 함께 전달합니다.
 */
export class EqpApiError extends Error {
  public readonly payload: EqpFailResponse
  public readonly status?: number

  constructor(payload: EqpFailResponse, status?: number) {
    super(payload.errorMsg)
    this.name = 'EqpApiError'
    this.payload = payload
    this.status = status
  }
}

// =========================================================================
// Check Out / Check In 관련 타입
// =========================================================================

/**
 * tc_eqp_param 파라미터 단건 모델입니다.
 * GET /api/eqp/{eqpId}/params?version={version} 응답에 사용됩니다.
 */
export interface EqpParam {
  paramName: string
  paramValue: string | null
  description: string | null
  createdBy: string
}

/**
 * 설비 체크아웃 상태 모델입니다.
 * GET /api/eqp/{eqpId}/checkout-status 응답에 사용됩니다.
 */
export interface EqpCheckoutStatus {
  isCheckedOut: boolean
  checkedOutBy: string | null
}

/**
 * 체크아웃 요청 DTO입니다.
 */
export interface EqpCheckoutRequest {
  sourceVersion: string
}

/**
 * 파라미터 단건 수정 항목입니다.
 */
export interface EqpParamSaveItem {
  paramName: string
  paramValue: string
  description: string
}

/**
 * 체크인 요청 DTO입니다.
 */
export interface EqpCheckinRequest {
  newVersion: string
  description: string
}

/**
 * 파라미터 목록 조회 응답 타입입니다.
 */
export type EqpParamListResponse = ApiResponse<EqpParam[]>

/**
 * 체크아웃 상태 조회 응답 타입입니다.
 * 백엔드 응답의 checkedOut 필드를 isCheckedOut으로 매핑합니다.
 */
export type EqpCheckoutStatusResponse = ApiResponse<{
  checkedOut: boolean
  checkedOutBy: string | null
}>
