Pencil MCP 작업 요청:

1. Pencil 캔버스에서 현재 "Login Frame"을 읽고, 해당 디자인(레이아웃/여백/타이포/색/로고 등)을 최대한 유지한 React 컴포넌트로 변환해 주세요.
2. 변환 결과는 “실제 백엔드 API와 연동되는 완전한 로그인 페이지”여야 합니다.
3. 아래 기술/규칙을 반드시 준수하고, 기존 프로젝트 설정(Foundation)은 임의로 변경하지 마세요. (필요한 import/route 추가만)

─────────────────────────────
📁 생성/수정할 파일 목록 (필수)
─────────────────────────────

1. src/features/auth/types/auth.types.ts       → 타입 정의
2. src/features/auth/api/auth.api.ts           → API 호출 함수 (apiClient 사용)
3. src/features/auth/hooks/useLogin.ts         → 로그인 훅 (TanStack Query v5 mutation 사용)
4. src/features/auth/components/LoginPage.tsx  → 로그인 페이지 (shadcn/ui + RHF+Zod)
5. src/app/Router.tsx 수정                     → 라우트 추가 (기존 Router 스타일 유지)

─────────────────────────────
🔌 API 스펙 (필수)
─────────────────────────────

* Endpoint: POST /auth/login

* Request Body:
  {
  "userId": "admin",
  "password": "ChangeMe123!"
  }

* Success Response (200):
  {
  "success": true,
  "data": {
  "token": "발급된토큰",
  "userPk": 123,
  "issuedAt": "2026-03-04T10:00:00+09:00",
  "expiresAt": "2026-03-04T18:00:00+09:00"
  },
  "errorCode": null,
  "errorMsg": null
  }

* Fail Response (401):
 {
  "success": false,
  "data": null,
  "errorCode": "UNAUTHORIZED",
  "errorMsg": "아이디 또는 비밀번호가 올바르지 않습니다."
}

※ 실제 응답 필드명이 다르면 auth.types.ts의 타입/파서만 수정해서 맞출 수 있게 설계해 주세요.
※ 401 외(네트워크/5xx 등)도 발생 가능하므로, 화면에서는 “알 수 없는 오류”로 처리하지 말고 사용자 친화적 메시지를 표시하세요.

─────────────────────────────
🛠 기술 요구사항 (필수)
─────────────────────────────

* 언어: TypeScript (.ts/.tsx), UTF-8

* 스타일: Tailwind CSS v4

* UI: shadcn/ui 컴포넌트 우선 사용 (Card, Button, Input, Label, Form류 등)

* 폼: React Hook Form + Zod

* 서버 상태/요청: TanStack Query v5 (useMutation)

* API 클라이언트: 반드시 src/shared/lib/api-client.ts의 apiClient 사용

  * apiClient의 메서드 시그니처가 프로젝트마다 다를 수 있으니,
    “현재 프로젝트의 apiClient 구현을 읽고” 정확한 사용법으로 호출하도록 맞춰 주세요.
    (예: apiClient.post(url, body) / apiClient.post(url, { data: body }) 등)

* 로그인 성공 시:

  1. token을 sessionStorage에 저장 (키 이름: "token" 고정)
  2. useNavigate로 "/api/eqp" 이동 (GET)

* 로그인 실패 시:

  * 폼 하단에 서버 메시지 표시 (401 message 우선)
  * 필드 단 validation 오류는 각 필드 아래에 표시 (Zod)

─────────────────────────────
📐 반응형 요구사항 (필수)
─────────────────────────────

* 전체 페이지: 높이 100vh(min-h-screen), 배경 100vw(w-screen)
* 로그인 카드: 수직/수평 중앙 정렬
* 모바일 (<= 767px):

  * 카드: width 100% (w-full), 좌우 여백/패딩 축소
* 태블릿 (768px ~ 1023px):

  * 카드 너비 480px 고정 (md:w-[480px])
* 데스크탑 (>= 1024px):

  * 카드 너비 400px 고정 (lg:w-[400px])

※ 요구사항이 “태블릿이 데스크탑보다 더 넓음(480 > 400)”이므로 그대로 준수하세요.

─────────────────────────────
✅ 유효성 검사 (Zod) (필수)
─────────────────────────────

* userId: required, min(2)

* password: required, min(8)

* 에러 메시지:

  * 각 입력 필드 바로 아래에 표시
  * 서버 로그인 실패 메시지(401 등)는 폼 하단(Submit 버튼 아래)에 표시

* 제출 중 UX:

  * 버튼 disabled
  * 로딩 스피너 표시 (shadcn/ui Button 내부, 또는 lucide Loader2 아이콘 등)
  * 중복 제출 방지

─────────────────────────────
🔗 라우터 변경 (필수)
─────────────────────────────

* src/app/Router.tsx에 라우트 추가:

  * /login → LoginPage
  * / 접근 시 /login 으로 리다이렉트

중요:

* Router.tsx의 기존 구현 방식(예: <Routes> 기반인지, createBrowserRouter 기반인지)을 확인하고,
  “현재 스타일을 유지한 채” 최소 변경으로 라우트를 추가하세요.
* 기존 라우트 구조/가드/레이아웃이 있다면 깨지지 않게 유지하세요.

─────────────────────────────
📌 구현 디테일 요구 (필수)
─────────────────────────────

1. LoginPage.tsx

* Pencil 캔버스 로그인 Frame을 기준으로 UI를 구성하되, 아래는 반드시 포함:

  * userId 입력 (autocomplete="username")
  * password 입력 (type="password", autocomplete="current-password")
  * submit 버튼
  * 서버 에러 메시지 영역
* 접근성:

  * label 연결(for/id)
  * 키보드 탭 이동 정상
  * focus-visible 스타일 자연스럽게 적용

2. useLogin.ts

* TanStack Query v5 useMutation으로 구현
* 반환값으로:

  * mutateAsync 또는 mutate
  * isPending(또는 status 기반), error 등을 LoginPage에서 사용 가능하게 구성

3. auth.api.ts

* apiClient로 POST /auth/login 호출
* 응답이 success=true인 경우 token을 반환(또는 필요한 data 반환)
* 응답 포맷이 success wrapper/401 message 형태가 섞여 있으므로,
  “정상/비정상 케이스를 분리해 파싱”하고 호출자에서 메시지를 표시할 수 있게 해주세요.

4. auth.types.ts

* LoginRequest, LoginSuccessResponse, LoginFailResponse(401) 등 명확히 분리
* 필요한 경우 type guard 또는 간단 파서 함수 포함(주석 포함)

─────────────────────────────
✅ 완료 기준(DoD) (필수)
─────────────────────────────

* pnpm dev 실행 시:

  * 컴파일(TypeScript) 에러 0
  * 런타임 에러 0
  * / 접속 시 /login 리다이렉트 정상
  * 로그인 성공 시 localStorage "accessToken" 저장 + /dashboard 이동
  * 로그인 실패 시 서버 메시지 폼 하단 표시
  * Zod validation 에러는 각 필드 아래 표시
  * 제출 중 버튼 비활성화 + 스피너 표시

위 요구사항을 모두 반영해서 코드 생성/수정해 주세요.
