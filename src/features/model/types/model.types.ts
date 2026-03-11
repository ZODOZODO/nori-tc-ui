import type { ApiResponse as BaseApiResponse } from '@/features/auth/types/auth.types'

/**
 * Model 도메인에서도 auth와 동일한 ApiResponse 래퍼 계약을 사용합니다.
 */
export type ApiResponse<TData> = BaseApiResponse<TData>

/**
 * 모델 통신 인터페이스 타입입니다.
 * 백엔드 enum 확장 가능성을 고려해 문자열 fallback을 허용합니다.
 */
export type ProtocolType = 'HSMS' | 'SOCKET' | (string & {})

/**
 * 모델 상태 타입입니다.
 * 현재 백엔드 계약은 DRAFT/ACTIVE/DEPRECATED를 사용합니다.
 */
export type ModelStatus = 'DRAFT' | 'ACTIVE' | 'DEPRECATED' | (string & {})

/**
 * GET /api/model, GET /api/model/{modelVersionKey} 공통 단건 모델입니다.
 */
export interface ModelInfo {
  modelVersionKey: number
  modelKey: number
  modelName: string
  modelVersion: string
  commInterface: ProtocolType
  status: ModelStatus
  description: string | null
  maker: string | null
  createdAt: string
  updatedAt: string
  createdBy: string
  updatedBy: string
}

/**
 * 모델 목록 페이지네이션 payload 입니다.
 */
export interface ModelPageResponse {
  items: ModelInfo[]
  offset: number
  limit: number
  count: number
}

/**
 * 모델 저장(등록/수정) 요청 DTO 입니다.
 */
export interface ModelUpsertRequest {
  modelName: string
  modelVersion: string
  commInterface: ProtocolType
  status: ModelStatus
  description?: string | null
  maker?: string | null
  createdBy?: string | null
  updatedBy?: string | null
}

/**
 * 모델 목록 조회 응답 타입입니다.
 */
export type ModelListResponse = ApiResponse<ModelPageResponse>

/**
 * 모델 단건 조회/등록/수정 응답 타입입니다.
 */
export type ModelDetailResponse = ApiResponse<ModelInfo>

/**
 * 모델 삭제 응답 타입입니다.
 */
export type ModelDeleteResponse = ApiResponse<null>

/**
 * 모델 상세 노드 row 원본 payload 타입입니다.
 */
export interface ModelDetailRowPayload {
  values: Array<string | null>
}

/**
 * MDF(XML) 원본 payload 타입입니다.
 */
export interface ModelMdfContentPayload {
  name: string
  xml: string
}

/**
 * 모델 상세 노드 원본 payload 타입입니다.
 */
export interface ModelNodeDetailPayload {
  columns: string[]
  rows: ModelDetailRowPayload[]
  mdfContents: ModelMdfContentPayload[]
}

/**
 * 모델 상세 노드 조회 응답 타입입니다.
 */
export type ModelNodeDetailResponse = ApiResponse<ModelNodeDetailPayload>

/**
 * 상세 패널 좌측 노드 타입입니다.
 */
export type ModelDetailNode =
  | 'model-parameter'
  | 'secs-message'
  | 'variableides'
  | 'reportides'
  | 'eventides'
  | 'socket-message'
  | 'workflow'
  | 'mdf'
  | 'dcop-itemes'

/**
 * 더블클릭으로 열린 상세 탭 모델입니다.
 */
export interface ModelOpenedTab {
  modelVersionKey: number
  modelKey: number
  modelName: string
  modelVersion: string
  commInterface: ProtocolType
}

/**
 * 상세 우측 메인 테이블의 행 모델입니다.
 */
export interface ModelDetailRow {
  id: string
  values: string[]
}

/**
 * MDF(XML) 렌더링 단위 모델입니다.
 */
export interface ModelMdfContent {
  id: string
  name: string
  xml: string
}

/**
 * 상세 노드 렌더링용 정규화 데이터입니다.
 */
export interface ModelNodeDetailData {
  columns: string[]
  rows: ModelDetailRow[]
  mdfContents: ModelMdfContent[]
}

/**
 * SECS 계열 상세 노드 순서입니다.
 */
export const SECS_DETAIL_NODES: ModelDetailNode[] = [
  'model-parameter',
  'secs-message',
  'variableides',
  'reportides',
  'eventides',
  'workflow',
  'mdf',
  'dcop-itemes',
]

/**
 * Socket 계열 상세 노드 순서입니다.
 */
export const SOCKET_DETAIL_NODES: ModelDetailNode[] = [
  'model-parameter',
  'socket-message',
  'workflow',
  'mdf',
  'dcop-itemes',
]

/**
 * 상세 노드별 라벨 매핑입니다.
 */
export const MODEL_DETAIL_NODE_LABELS: Record<ModelDetailNode, string> = {
  'model-parameter': 'Model Parameter',
  'secs-message': 'SECS Message',
  variableides: 'Variableides',
  reportides: 'ReportIdes',
  eventides: 'EventIdes',
  'socket-message': 'Socket Message',
  workflow: 'Workflow',
  mdf: 'MDF',
  'dcop-itemes': 'Dcop Itemes',
}

/**
 * 실패 응답 payload 최소 타입입니다.
 */
export type ModelFailResponse = ApiResponse<null> & {
  success: false
  data: null
  errorCode: string
  errorMsg: string
}

/**
 * Model API 계층 기본 오류 메시지입니다.
 */
export const DEFAULT_MODEL_ERROR_MESSAGE =
  '모델 정보를 처리하는 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.'

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
 * 알 수 없는 실패 payload를 ModelFailResponse 형태로 정규화합니다.
 */
export const createModelFailResponse = (
  payload: unknown,
  fallbackMessage = DEFAULT_MODEL_ERROR_MESSAGE,
): ModelFailResponse => {
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
 * Model API 레이어 전용 오류 객체입니다.
 */
export class ModelApiError extends Error {
  public readonly payload: ModelFailResponse
  public readonly status?: number

  constructor(payload: ModelFailResponse, status?: number) {
    super(payload.errorMsg)
    this.name = 'ModelApiError'
    this.payload = payload
    this.status = status
  }
}
