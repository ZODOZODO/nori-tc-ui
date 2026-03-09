Pencil MCP, Serena MCP 를 사용해서 아래의 요청사항을 진행해줘.

Pencil MCP 작업 요청:

1. Pencil 캔버스에서 design.pen 의 아래 8개 Frame을 읽고, 해당 디자인(레이아웃/여백/타이포/색/컴포넌트 구성 등)을 최대한 유지한 React 컴포넌트로 변환해 주세요.
   - "Eqp Frame"
   - "Eqp Frame - Edit Mode"
   - "Eqp Frame - CheckIn Modal"
   - "Eqp Frame - Sidebar Collapsed"
   - "Eqp Frame - Profile Modal Open"
   - "Eqp Frame - Edit Mode - Profile Modal Open"
   - "Eqp Frame - CheckIn Modal - Profile Modal Open"
   - "Eqp Frame - Sidebar Collapsed - Profile Modal Open"
2. 변환 결과는 "현재 백엔드 API 계약과 정확히 맞는 완전한 EQP Info 페이지"여야 합니다.
3. 아래 기술/규칙을 반드시 준수하고, 기존 프로젝트 설정(Foundation)은 임의로 변경하지 마세요. (필요한 import/route 추가만)

─────────────────────────────
📁 생성/수정할 파일 목록 (필수)
─────────────────────────────

1. src/features/eqp/types/eqp.types.ts
2. src/features/eqp/api/eqp.api.ts
3. src/features/eqp/hooks/useEqpList.ts
4. src/features/eqp/hooks/useEqpDetail.ts
5. src/features/eqp/hooks/useEqpMutations.ts
6. src/features/eqp/components/EqpPage.tsx
7. src/features/eqp/components/EqpSidebar.tsx
8. src/features/eqp/components/EqpInfoTable.tsx
9. src/features/eqp/components/EqpParamTable.tsx
10. src/features/eqp/components/CheckInModal.tsx
11. src/features/profile/types/profile.types.ts
12. src/features/profile/api/profile.api.ts
13. src/features/profile/hooks/useProfile.ts
14. src/features/profile/components/UserProfileModal.tsx
15. src/app/Router.tsx (기존 스타일 유지, 최소 변경)

─────────────────────────────
🔌 API 스펙 (백엔드 구현 기준)
─────────────────────────────

### GET /api/eqp — 설비 목록 조회 (페이지네이션)

- Query Params: offset (기본 0), limit (기본 100, 최대 500)
- Success Response (200):
{
  "success": true,
  "data": {
    "items": [
      {
        "eqpKey": 1,
        "eqpId": "EQP-001",
        "commInterface": "HSMS",        // ProtocolType: HSMS | SOCKET
        "commMode": "ACTIVE",
        "routePartition": 0,
        "eqpIp": "192.168.1.10",
        "eqpPort": 5000,
        "modelVersionKey": 1,
        "enabled": true,
        "createdAt": "2026-01-01T00:00:00+09:00",
        "updatedAt": "2026-01-01T00:00:00+09:00",
        "createdBy": "admin",
        "updatedBy": "admin"
      }
    ],
    "offset": 0,
    "limit": 100,
    "count": 1
  },
  "errorCode": null,
  "errorMsg": null
}

### GET /api/eqp/{eqpId} — 설비 단건 조회

- Path Variable: eqpId (설비 비즈니스 ID)
- Success Response (200): 위 items[0]와 동일한 단건 객체
- Not Found Response (404):
{
  "success": false,
  "data": null,
  "errorCode": "NOT_FOUND",
  "errorMsg": "설비를 찾을 수 없습니다."
}

### POST /api/eqp — 설비 등록 (DualResponse, 동기 대기)

- Request Body:
{
  "eqpId": "EQP-003",
  "interfaceType": "HSMS",
  "uiMessage": "optional message",
  "equipmentProfile": null       // GatewayEquipmentProfileSnapshot, 선택
}
- Success Response (200): { "success": true, "data": null, "errorCode": null, "errorMsg": null }
- 실패 응답 (500): { "success": false, "data": null, "errorCode": "PROCESSING_FAILED", "errorMsg": "..." }
- 타임아웃 응답 (504): { "success": false, "data": null, "errorCode": "TIMEOUT", "errorMsg": "..." }

### PUT /api/eqp/{eqpId} — 설비 수정 (DualResponse, 동기 대기)

- Path Variable: eqpId
- Request Body:
{
  "interfaceType": "HSMS",
  "uiMessage": null,
  "equipmentProfile": null       // 선택
}
- 응답 구조: POST /api/eqp와 동일

### DELETE /api/eqp/{eqpId} — 설비 삭제 (DualResponse, 동기 대기)

- Path Variable: eqpId
- Query Params: interfaceType (필수), uiMessage (선택)
- 요청 본문 없음 (본문 포함 시 백엔드가 무시)
- 응답 구조: POST /api/eqp와 동일

### POST /api/eqp/{eqpId}/start — 설비 시작 (Async, 202 즉시 반환)

- Request Body: { "interfaceType": "HSMS", "uiMessage": null }
- Success Response (202):
{
  "success": true,
  "data": { "traceId": "uuid-string" },
  "errorCode": null,
  "errorMsg": null
}
- 클라이언트는 GET /api/async/{traceId} 로 polling 결과 확인

### POST /api/eqp/{eqpId}/end — 설비 종료 (Async, 202 즉시 반환)

- 응답 구조: POST /api/eqp/{eqpId}/start와 동일

### GET /api/auth/me — 현재 인증 사용자 정보 조회

- Success Response (200):
{
  "success": true,
  "data": {
    "userPk": 1,
    "userId": "admin",
    "permissionCodes": ["EQP_READ", "EQP_WRITE"]
  }
}
- 사용처: TopBar 프로필 아이콘 표시, UserProfileModal 진입 시 userPk 확보

### GET /api/user/{userPk} — 사용자 상세 조회

- Path Variable: userPk (사용자 PK, GET /api/auth/me 응답 기준)
- Success Response (200):
{
  "success": true,
  "data": {
    "userPk": 1,
    "company": "NORI",
    "department": "개발팀",
    "userName": "관리자",
    "userId": "admin",
    "userIdNorm": "admin",
    "email": "admin@nori.ai",
    "status": "ACTIVE",
    "createdAt": "2026-01-01T00:00:00+09:00",
    "updatedAt": "2026-01-01T00:00:00+09:00",
    "createdBy": "system",
    "updatedBy": "admin"
  }
}

### PUT /api/user/{userPk} — 사용자 정보 수정 (프로필 저장)

- Path Variable: userPk
- Request Body:
{
  "company": "NORI",
  "department": "개발팀",
  "userName": "관리자",
  "userId": "admin",            // userId는 readonly이므로 기존 값 그대로 전송
  "password": null,             // null이면 기존 비밀번호 유지
  "email": "admin@nori.ai",
  "status": "ACTIVE",
  "updatedBy": "admin"
}
- Success Response (200): { "success": true, "data": null, "errorCode": null, "errorMsg": null }
- 실패 응답 (400): { "success": false, "data": null, "errorCode": "INVALID_REQUEST", "errorMsg": "..." }

### POST /api/user/{userPk}/password/reset — 비밀번호 변경

- Path Variable: userPk
- Request Body:
{
  "newPassword": "NewPassword1!",
  "updatedBy": "admin"
}
- Success Response (200): { "success": true, "data": null, "errorCode": null, "errorMsg": null }

### GET /api/async/{traceId} — Async 작업 결과 polling

- 응답 상태별 HTTP 코드:
  - 202: PENDING (아직 처리 중)
  - 200: COMPLETED (PASS 또는 FAIL)
  - 408: TIMEOUT
  - 404: 존재하지 않는 traceId
- Response Body:
{
  "success": true,
  "data": {
    "traceId": "uuid-string",
    "eqpId": "EQP-001",
    "status": "PASS",            // PENDING | PASS | FAIL | TIMEOUT
    "errorCode": null,
    "errorMsg": null
  }
}

- 중요 계약:
1. DualResponse(CREATE/UPDATE/DELETE)는 동기 대기 방식으로 최종 결과(200/500/504)를 반환
2. Lifecycle(START/END)는 비동기 방식으로 202 + traceId 반환 후 polling
3. PENDING 상태이면 1초 간격으로 최대 30회 polling, 이후 timeout으로 처리
4. 요청 시 withCredentials 적용 (쿠키 기반 인증)

─────────────────────────────
🛡 CSRF 계약 (필수)
─────────────────────────────

1. 상태 변경 요청(POST/PUT/DELETE)은 CSRF 헤더(X-XSRF-TOKEN) 포함 필수
2. CSRF 쿠키(XSRF-TOKEN) 값을 X-XSRF-TOKEN 헤더에 설정
3. apiClient (src/shared/lib/api-client.ts) 를 그대로 사용할 것 — apiClient 실제 시그니처를 현재 프로젝트에서 읽고 정확히 맞춰 호출

─────────────────────────────
🛠 기술 요구사항 (필수)
─────────────────────────────

- 언어: TypeScript (.ts/.tsx), UTF-8
- 스타일: Tailwind CSS v4
- UI: shadcn/ui 우선 (Table, Button, Badge, Dialog, Select, Input 계열)
- 서버 상태/요청: TanStack Query v5 (useQuery, useMutation)
- API 클라이언트: 반드시 src/shared/lib/api-client.ts 의 apiClient 사용
- 상태 관리: Zustand (선택한 eqpId, 사이드바 open/close 상태)
- EQP 목록 로드 후:
  1. 사이드바 트리에서 첫 번째 EQP를 기본 선택
  2. 선택된 EQP의 상세 정보를 EQP Info 테이블에 표시

─────────────────────────────
🗂 페이지 레이아웃 (design.pen 기준)
─────────────────────────────

### 전체 구조 (1440x900)

- 상단 헤더(TopBar, 높이 52px): design.pen의 ECnVQ ref 컴포넌트 기준
  - 좌측: "NORI" 로고
  - 중앙: 메뉴 (Eqp / Model / Deploy / Dlq / User)
    - Eqp → 드롭다운: Eqp Info
    - Model → 드롭다운: Model Info
    - Deploy → 드롭다운: Eqp Deploy, Model Deploy
    - Dlq → 드롭다운: Gateway Dlq, Business Dlq
    - User → 드롭다운: User Info, Group Info
  - 우측: 사용자 프로필 아이콘
- 헤더 아래 구분선(NavBorder, 1px)
- 콘텐츠 영역:
  - 좌측: EqpSidebar (240px 확장 / 56px 축소, 전환 가능)
  - 구분선(sidebarBorder, 1px)
  - 우측: MainContent (fill_container, gap 12px, vertical layout)

### EqpSidebar (확장 상태, 240px)

design.pen "EqpSidebarExpandedComponent" 기준:
- 헤더 행: "▾ 설비 목록" 제목 + ExpandCollapseToggleButton (우측)
- 검색 입력(SidebarSearch)
- 트리 노드 목록 (gap 4px):
  - Business (그룹 노드, 상태 dot: #8FA396)
  - Gateway (그룹 노드, 상태 dot: #2AAE67 — connected)
    - Gateway_app1 (중간 노드)
      - EQP-001, EQP-002 (leaf 노드, indent 46px)
    - Gateway_app2 (중간 노드)
  - 선택된 EQP: 배경 #EAF5EE, 텍스트 #1F2D26 bold, dot #2AAE67
- 축소 버튼 클릭 시 56px Collapsed 상태(CollapseToggleButton만 표시)로 전환

### MainContent 구성 (읽기 모드)

design.pen "Eqp Frame" → MainContent 기준:

1. **EQP Info 테이블** (상단)
   - 테이블 제목: "설비 정보"
   - 컬럼: EQPID | Comm Interface | Comm Mode | Route Partition | IP | Port | Enabled | Model | Model Version | Gateway Jarfile | Business Jarfile
   - 컬럼 중 Model/Model Version/Gateway Jarfile/Business Jarfile은 modelVersionKey 기반으로 별도 모델 API 호출 또는 "—"로 표시
   - enabled 컬럼: Badge 형태 (true → 초록, false → 회색)
   - commInterface: "HSMS" / "SOCKET" Badge
   - 우측 상단 버튼 영역:
     - "Check Out" 버튼 (클릭 시 Edit Mode로 전환)
     - (Edit Mode 시) "Check In" 버튼으로 교체

2. **중간 영역** (두 테이블 사이)
   - 좌측: select 버튼 (Applied Version 선택용 드롭다운)
   - 우측 근처: "Applied version : [선택된 버전]" 라벨

3. **EQP Parameter 테이블** (하단)
   - 테이블 제목: "설비 파라미터"
   - 컬럼: Param Name | Param Value | Description
   - 읽기 모드: 테이블 행 편집 불가
   - Edit Mode (Check Out 후): 행 인라인 편집 가능 (Param Value 수정)

### MainContent 구성 (Edit Mode — design.pen "Eqp Frame - Edit Mode" 기준)

- EQP Info 테이블 상단 "Check In" 버튼 표시
- EQP Parameter 테이블 행: Param Value 셀 Input으로 전환
- 하단 액션 버튼 영역: Save | Undo | Cancel

### User Profile Modal (design.pen "Eqp Frame - Profile Modal Open" 기준)

design.pen `UserProfileModalOverlayComponent` (Ndct4) + `UserProfileEditModal` (IyoCu) 기준:

- **트리거**: TopBar 우측 프로필 아이콘 클릭 시 오버레이 표시
- **오버레이**: 전체 콘텐츠 영역(1440×847px)을 반투명 배경(`#121A174D`)으로 덮고, 가운데 모달 카드 정렬
- **모달 카드**: 너비 640px, cornerRadius 24, 흰 배경, padding 26px, gap 18px
- **모달 헤더**:
  - 아이콘(초록 원형 배지 `#EDF4EF`) + "사용자 정보 수정" (fontSize 24, bold) + 부제목(fontSize 12, `#6C7872`)
- **폼 필드** (세로 stack, gap 12px):
  1. company + user_name 행 (가로 배치, gap 12px): 각 라벨(fontSize 11, bold) + Input (height 46, cornerRadius 12)
  2. user_id 필드 (읽기 전용): 라벨 + 회색 배경 Input(`#F4F3F0`) + 힌트 "user_id는 수정할 수 없습니다." (fontSize 10, `#9AA29D`)
  3. password 행: 라벨 + Input + "변경하기" 버튼 (cornerRadius 19, 배경 `#EAF3EE`, 테두리 `#CFE1D8`)
  4. email 필드: 라벨 + Input (흰 배경)
  5. 안내 텍스트: "비밀번호는 우측 변경하기 버튼에서 수정할 수 있습니다." (fontSize 11, `#8A9590`)
- **구분선**: `#ECEAE5`, 1px
- **하단 액션** (우측 정렬, gap 8px):
  - 취소 버튼 (흰 배경, 테두리 `#E2E0DA`)
  - 저장하기 버튼 (배경 `#1C7F59`, 흰 텍스트)
- **Profile Modal + CheckIn Modal 동시 표시**: "Eqp Frame - CheckIn Modal - Profile Modal Open" 상태에서 두 모달이 동시에 열릴 수 있음 — z-index로 Profile Modal이 CheckIn Modal 위에 렌더링

### CheckIn Modal (design.pen "Eqp Frame - CheckIn Modal" 기준)

- "Check In" 버튼 클릭 시 Dialog/Modal 표시
- 제목: "변경 내용을 저장하시겠습니까?"
- 버튼: Save (저장 후 읽기 모드 복귀) | Undo (변경 취소 후 원래 값 복원) | Cancel (모달만 닫기)
- Save 클릭 시 PUT /api/eqp/{eqpId} 호출

─────────────────────────────
📐 반응형 요구사항 (필수)
─────────────────────────────

- 전체 페이지: min-h-screen + w-screen
- 사이드바: 기본 확장(240px), 토글 버튼으로 56px 축소 가능
- 테이블: 수평 스크롤 가능 (overflow-x-auto)
- 모바일 대응은 데스크탑 우선으로 구현 (min-width 1024px 기준 레이아웃 유지)

─────────────────────────────
🔗 라우터 변경 (필수)
─────────────────────────────

- /eqp → EqpPage (로그인 성공 후 기본 진입 라우트)
- / 접근 시 /login 리다이렉트 유지
- /login → LoginPage 유지
- 기존 Router 구현 방식(Routes/Route) 유지
- 인증 미완료 시 /eqp 접근 → /login 리다이렉트 (401 응답 인터셉터로 처리, ProtectedRoute 추가 가능)
- 임의의 라우트 신설 금지 (기존 경로 체계 준수)

─────────────────────────────
📌 구현 디테일 요구 (필수)
─────────────────────────────

1. **eqp.types.ts**
   - EqpInfo: GET /api/eqp 응답의 단건 타입 (eqpKey, eqpId, commInterface, commMode, routePartition, eqpIp, eqpPort, modelVersionKey, enabled, createdAt, updatedAt, createdBy, updatedBy)
   - EqpInfoResponse: PagedResponse<EqpInfo> (items, offset, limit, count)
   - EqpCreateRequest, EqpUpdateRequest, EqpLifecycleRequest 요청 타입
   - AsyncAcceptResponse: { traceId: string }
   - AsyncResultResponse: { traceId, eqpId, status, errorCode, errorMsg }
   - ApiResponse<T> 래퍼 타입 (auth.types.ts 참조하여 일관성 유지)

2. **eqp.api.ts**
   - getEqpList(offset?, limit?): GET /api/eqp
   - getEqpDetail(eqpId): GET /api/eqp/{eqpId}
   - createEqp(request): POST /api/eqp
   - updateEqp(eqpId, request): PUT /api/eqp/{eqpId}
   - deleteEqp(eqpId, interfaceType): DELETE /api/eqp/{eqpId}?interfaceType=...
   - startEqp(eqpId, request): POST /api/eqp/{eqpId}/start
   - endEqp(eqpId, request): POST /api/eqp/{eqpId}/end
   - getAsyncResult(traceId): GET /api/async/{traceId}
   - apiClient로 withCredentials 포함하여 호출

3. **useEqpList.ts**
   - TanStack Query v5 useQuery
   - queryKey: ['eqp', 'list']
   - 전체 목록 반환 (offset 0, limit 500)

4. **useEqpDetail.ts**
   - TanStack Query v5 useQuery
   - queryKey: ['eqp', 'detail', eqpId]
   - enabled: eqpId가 있을 때만 실행

5. **useEqpMutations.ts**
   - createEqpMutation, updateEqpMutation, deleteEqpMutation
   - startEqpMutation, endEqpMutation
   - 성공 시 ['eqp', 'list'] 캐시 무효화 (invalidateQueries)
   - START/END: 202 응답의 traceId를 반환하여 컴포넌트에서 polling 처리

6. **EqpSidebar.tsx**
   - design.pen "EqpSidebarExpandedComponent" / "EqpSidebarCollapsedComponent" 기준
   - Zustand store에서 selectedEqpId, sidebarOpen 관리
   - 트리 노드: 더미 데이터가 아닌 useEqpList 데이터 기반으로 렌더링
   - 선택된 EQP: 배경 #EAF5EE, 텍스트 bold 강조
   - 검색: 입력값으로 트리 필터링 (eqpId 기준)
   - 확장/축소 토글 버튼

7. **EqpInfoTable.tsx**
   - 선택된 EQP 단건 데이터 표시 (useEqpDetail 기반)
   - enabled: Badge (true → "활성" green, false → "비활성" gray)
   - commInterface: Badge ("HSMS" blue, "SOCKET" orange)
   - 우측 상단: 읽기 모드 시 "Check Out" 버튼, Edit Mode 시 "Check In" 버튼
   - "Check Out" 클릭 → isEditMode=true
   - "Check In" 클릭 → CheckInModal 열기

8. **EqpParamTable.tsx**
   - EQP Parameter 테이블 (Param Name, Param Value, Description)
   - 읽기 모드: 정적 표시
   - Edit Mode: Param Value 셀 → Input 컴포넌트 (인라인 편집)
   - 하단 버튼: Save | Undo | Cancel (Edit Mode 시만 표시)
   - 주의: EQP Parameter 전용 API가 없으므로 equipmentProfile 필드나 별도 상태로 관리
   - Param 데이터는 초기에는 빈 목록 또는 더미 데이터로 시작하되, 실제 API 연동 시 확장 가능하도록 추상화

9. **CheckInModal.tsx**
   - Dialog 기반 모달 (shadcn/ui Dialog)
   - 제목: "변경 내용을 저장하시겠습니까?"
   - Save 버튼: updateEqpMutation 호출 → 성공 시 isEditMode=false, 모달 닫기
   - Undo 버튼: 변경 취소, 원래 값 복원, isEditMode=false, 모달 닫기
   - Cancel 버튼: 모달만 닫기 (Edit Mode 유지)
   - 처리 중: 버튼 disabled + 로딩 스피너

10. **EqpPage.tsx**
    - EqpSidebar + EqpInfoTable + EqpParamTable + CheckInModal + UserProfileModal 조합
    - Zustand store: selectedEqpId(초기: null), sidebarOpen(초기: true), isEditMode(초기: false), isProfileModalOpen(초기: false)
    - useEqpList 로드 완료 시 첫 번째 eqpId 자동 선택
    - 선택된 eqpId 변경 시 isEditMode 초기화
    - TopBar 프로필 아이콘 클릭 → isProfileModalOpen=true

11. **profile.types.ts**
    - UserInfo: GET /api/user/{userPk} 응답 타입 (userPk, company, department, userName, userId, userIdNorm, email, status, createdAt, updatedAt, createdBy, updatedBy)
    - MeInfo: GET /api/auth/me 응답 타입 (userPk, userId, permissionCodes)
    - UserUpdateRequest: PUT /api/user/{userPk} 요청 타입 (company, department, userName, userId, password, email, status, updatedBy)
    - UserPasswordResetRequest: { newPassword: string, updatedBy?: string }

12. **profile.api.ts**
    - getMe(): GET /api/auth/me
    - getUserDetail(userPk): GET /api/user/{userPk}
    - updateUser(userPk, request): PUT /api/user/{userPk}
    - resetPassword(userPk, request): POST /api/user/{userPk}/password/reset
    - apiClient로 withCredentials 포함하여 호출

13. **useProfile.ts**
    - useMe(): TanStack Query v5 useQuery, queryKey: ['auth', 'me']
    - useUserDetail(userPk): useQuery, queryKey: ['user', userPk], enabled: userPk 있을 때
    - useUpdateUser(): useMutation, 성공 시 ['user', userPk] 캐시 무효화
    - useResetPassword(): useMutation

14. **UserProfileModal.tsx**
    - design.pen "UserProfileModalOverlayComponent" + "UserProfileEditModal" 기준
    - Props: open (boolean), onClose (() => void)
    - 모달 열릴 때: useMe()로 userPk 확보 → useUserDetail(userPk)로 상세 정보 로드
    - 폼 필드: company, user_name (편집 가능) / user_id (readonly) / password Input + "변경하기" 버튼 / email (편집 가능)
    - "변경하기" 버튼 클릭 시: 비밀번호 변경 입력 UI 표시 → useResetPassword() 호출
    - "저장하기" 버튼 클릭 시: useUpdateUser() 호출 (password 필드는 null로 전송, 비밀번호는 변경하기 버튼으로만 수정)
    - 성공 시 onClose() 호출
    - 처리 중: 버튼 disabled + 로딩 스피너
    - 오버레이 클릭 또는 취소 버튼 → onClose()
    - z-index: CheckInModal보다 높게 설정 (Profile Modal이 최상단)

─────────────────────────────
✅ 완료 기준(DoD) (필수)
─────────────────────────────

- pnpm dev 실행 시:
1. TypeScript 컴파일 에러 0
2. 런타임 에러 0
3. 로그인 성공 후 /eqp 라우트로 정상 이동
4. GET /api/eqp 호출 성공 및 EQP 목록이 사이드바 트리에 표시
5. 사이드바에서 EQP 선택 시 GET /api/eqp/{eqpId} 호출 및 EQP Info 테이블 갱신
6. "Check Out" 버튼 클릭 시 Edit Mode 전환 및 EQP Parameter 테이블 편집 가능
7. "Check In" 버튼 클릭 시 CheckIn Modal 표시
8. Modal에서 Save 클릭 시 PUT /api/eqp/{eqpId} 호출 및 읽기 모드 복귀
9. Modal에서 Undo 클릭 시 변경 취소 및 읽기 모드 복귀
10. 사이드바 토글 버튼으로 확장(240px) ↔ 축소(56px) 전환
11. 인증 미완료 시 /eqp 접근 → /login 리다이렉트
12. TopBar 프로필 아이콘 클릭 시 UserProfileModal 표시
13. UserProfileModal에서 현재 사용자 정보(company, userName, email) 정상 로드
14. UserProfileModal에서 저장하기 클릭 시 PUT /api/user/{userPk} 호출 및 모달 닫기
15. UserProfileModal에서 변경하기 버튼 클릭 시 비밀번호 변경 처리 (POST /api/user/{userPk}/password/reset)
16. UserProfileModal이 CheckIn Modal과 동시에 열릴 경우 Profile Modal이 최상단에 표시
