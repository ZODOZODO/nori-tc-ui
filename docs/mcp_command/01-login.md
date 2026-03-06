Pencil MCP, Serena MCP 를 사용해서 아래의 요청사항을 진행해줘.

Pencil MCP 작업 요청:

1. Pencil 캔버스에서 현재 "Login Frame"을 읽고, 해당 디자인(레이아웃/여백/타이포/색/로고 등)을 최대한 유지한 React 컴포넌트로 변환해 주세요.
2. 변환 결과는 “현재 백엔드 API 계약과 정확히 맞는 완전한 로그인 페이지”여야 합니다.
3. 아래 기술/규칙을 반드시 준수하고, 기존 프로젝트 설정(Foundation)은 임의로 변경하지 마세요. (필요한 import/route 추가만)

─────────────────────────────
📁 생성/수정할 파일 목록 (필수)
─────────────────────────────

1. src/features/auth/types/auth.types.ts
2. src/features/auth/api/auth.api.ts
3. src/features/auth/hooks/useLogin.ts
4. src/features/auth/components/LoginPage.tsx
5. src/app/Router.tsx (기존 스타일 유지, 최소 변경)

─────────────────────────────
🔌 API 스펙 (백엔드 구현 기준)
─────────────────────────────

- Endpoint: POST /auth/login
- Request Body:
{
  "userId": "admin",
  "password": "ChangeMe123!"
}

- Success Response (200):
{
  "success": true,
  "data": {
    "userPk": 123,
    "issuedAt": "2026-03-04T10:00:00+09:00",
    "expiresAt": "2026-03-04T18:00:00+09:00"
  },
  "errorCode": null,
  "errorMsg": null
}

- 중요 계약:
1. 인증 토큰은 응답 본문(data.token)이 아니라 HttpOnly 쿠키(Set-Cookie: TC_UI_AUTH)로만 전달됩니다.
2. 따라서 프론트에서 token을 localStorage/sessionStorage에 저장하지 않습니다.
3. 요청 시 브라우저 쿠키를 포함하도록 withCredentials(또는 동등 설정)를 적용하세요.

- Fail Response (401) 예시:
{
  "success": false,
  "data": null,
  "errorCode": "UNAUTHORIZED",
  "errorMsg": "아이디 또는 비밀번호가 올바르지 않습니다."
}
- 주의: 401의 errorMsg는 상황에 따라 달라질 수 있으므로 고정 문자열 가정 금지.

- 기타 오류:
1. 400: INVALID_REQUEST + 검증/본문 형식 오류 메시지
2. 500: INTERNAL_ERROR + 서버 오류 메시지

─────────────────────────────
🛡 CSRF 계약 (필수)
─────────────────────────────

1. 로그인 전에 GET /auth/csrf를 먼저 호출해 CSRF 쿠키를 확보하세요.
2. POST /auth/login 요청 시 CSRF 헤더(X-XSRF-TOKEN)를 포함하세요. 값은 CSRF 쿠키(XSRF-TOKEN) 기준으로 처리하세요.
3. 상태 변경 요청(POST/PUT/PATCH/DELETE)은 동일한 CSRF 처리 규칙을 따르세요.

─────────────────────────────
🛠 기술 요구사항 (필수)
─────────────────────────────

- 언어: TypeScript (.ts/.tsx), UTF-8
- 스타일: Tailwind CSS v4
- UI: shadcn/ui 우선 (Card, Button, Input, Label, Form 계열)
- 폼: React Hook Form + Zod
- 서버 상태/요청: TanStack Query v5 (useMutation)
- API 클라이언트: 반드시 src/shared/lib/api-client.ts 의 apiClient 사용
- apiClient 실제 시그니처를 현재 프로젝트에서 읽고 정확히 맞춰 호출
- 로그인 성공 후:
1. 브라우저가 Set-Cookie를 저장했는지 기준으로 인증 상태를 판단
2. EqpInfo 기본 진입 라우트(기존 프로젝트 경로)로 이동
3. 해당 진입 흐름에서 GET /api/eqp가 정상 호출되어야 함
- 로그인 실패 후:
1. 서버 메시지를 폼 하단에 표시
2. Zod 필드 오류는 각 필드 하단에 표시

─────────────────────────────
📐 반응형 요구사항 (필수)
─────────────────────────────

- 전체 페이지: min-h-screen + w-screen
- 로그인 카드: 수직/수평 중앙 정렬
- 모바일 (<= 767px): 카드 w-full, 좌우 패딩 축소
- 태블릿 (768px ~ 1023px): md:w-[480px]
- 데스크탑 (>= 1024px): lg:w-[400px]
- 태블릿이 데스크탑보다 넓은 조건(480 > 400) 그대로 준수

─────────────────────────────
✅ 유효성 검사 (Zod) (필수)
─────────────────────────────

- userId: required, min(2)
- password: required, min(8)
- 에러 메시지:
1. 필드 검증 메시지: 각 입력 아래
2. 서버 실패 메시지(401/400/기타): Submit 버튼 아래
- 제출 중 UX:
1. 버튼 disabled
2. 로딩 스피너 표시
3. 중복 제출 방지

─────────────────────────────
🔗 라우터 변경 (필수)
─────────────────────────────

- /login → LoginPage
- / 접근 시 /login 리다이렉트
- 기존 Router 구현 방식(Routes/createBrowserRouter 등) 유지
- 기존 라우트/가드/레이아웃 훼손 금지
- 임의의 /dashboard 라우트 신설 금지 (기존 경로 체계 준수)

─────────────────────────────
📌 구현 디테일 요구 (필수)
─────────────────────────────

1. LoginPage.tsx
- userId 입력: autocomplete="username"
- password 입력: type="password", autocomplete="current-password"
- submit 버튼
- 서버 에러 메시지 영역
- 접근성(label-for/id, 탭 이동, focus-visible)

2. useLogin.ts
- TanStack Query v5 useMutation
- LoginPage에서 mutate/mutateAsync, isPending, error 사용 가능하게 구성

3. auth.api.ts
- apiClient로 GET /auth/csrf + POST /auth/login 처리
- 성공/실패 응답 파싱 분리
- success wrapper, errorCode/errorMsg를 명확히 반환
- 쿠키 기반 인증 전제(본문 token 의존 금지)

4. auth.types.ts
- LoginRequest, LoginSuccessResponse, LoginFailResponse, ApiResponse 래퍼 타입 정의
- 필요 시 type guard/파서 함수 포함

─────────────────────────────
✅ 완료 기준(DoD) (필수)
─────────────────────────────

- pnpm dev 실행 시:
1. TypeScript 컴파일 에러 0
2. 런타임 에러 0
3. / 접속 시 /login 리다이렉트 정상
4. 로그인 전 /auth/csrf 호출 및 CSRF 헤더 처리 정상
5. 로그인 성공 시 token 저장(localStorage/sessionStorage) 없이 쿠키 기반 인증으로 동작
6. 로그인 후 보호 API(GET /api/eqp) 호출 성공
7. 로그인 실패 시 서버 메시지 폼 하단 표시
8. Zod 필드 오류는 각 필드 하단 표시
9. 제출 중 버튼 비활성화 + 스피너 표시
