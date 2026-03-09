# nori-tc-ui 아키텍처 문서

## 개요

**nori-tc-ui**는 React 19 기반의 싱글 페이지 애플리케이션(SPA)으로, Spring Boot 백엔드(`nori-tc`)와 연동하는 프론트엔드 프로젝트입니다.

---

## 기술 스택

### 핵심 프레임워크 & 런타임

| 기술 | 버전 | 역할 |
|------|------|------|
| **React** | ^19.2.0 | UI 라이브러리 및 컴포넌트 프레임워크 |
| **React DOM** | ^19.2.0 | DOM 렌더링 |
| **React Router DOM** | ^7.13.1 | 클라이언트 사이드 라우팅 |

### 언어 & 타입 시스템

| 기술 | 버전 | 역할 |
|------|------|------|
| **TypeScript** | ~5.9.3 | 정적 타입 검사 |
| **@types/react** | ^19.2.7 | React 타입 정의 |
| **@types/react-dom** | ^19.2.3 | React DOM 타입 정의 |
| **@types/node** | ^24.10.1 | Node.js 타입 정의 |

### 빌드 도구 & 번들러

| 기술 | 버전 | 역할 |
|------|------|------|
| **Vite** | ^7.3.1 | 빌드 도구 및 개발 서버 |
| **@vitejs/plugin-react** | ^5.1.1 | Vite용 React 플러그인 (Babel 기반 Fast Refresh) |
| **esbuild** | 0.27.3 | JavaScript 번들러 (Vite 내부 사용) |

### 상태 관리 & 데이터 페칭

| 기술 | 버전 | 역할 |
|------|------|------|
| **zustand** | ^5.0.11 | 경량 클라이언트 상태 관리 |
| **@tanstack/react-query** | ^5.90.21 | 서버 상태 관리 및 캐싱 |
| **@tanstack/react-query-devtools** | ^5.91.3 | React Query 디버깅 도구 |
| **axios** | ^1.13.6 | HTTP 클라이언트 |

### 폼 처리 & 유효성 검사

| 기술 | 버전 | 역할 |
|------|------|------|
| **react-hook-form** | ^7.71.2 | 폼 상태 관리 |
| **@hookform/resolvers** | ^5.2.2 | 폼 유효성 검사 리졸버 |
| **zod** | ^4.3.6 | TypeScript 우선 스키마 유효성 검사 |

### UI 컴포넌트 라이브러리

| 기술 | 버전 | 역할 |
|------|------|------|
| **radix-ui** | ^1.4.3 | 비스타일 접근성 React 컴포넌트 (dialog, dropdown, accordion 등) |
| **shadcn/ui** | (components.json 설정) | Radix UI 기반 컴포넌트 추상화 레이어 |
| **lucide-react** | ^0.576.0 | 아이콘 라이브러리 |
| **class-variance-authority** | ^0.7.1 | 변형 기반 CSS 클래스 조합 |
| **clsx** | ^2.1.1 | className 문자열 조합 유틸리티 |
| **tailwind-merge** | ^3.5.0 | Tailwind CSS 클래스 병합 유틸리티 |

### 스타일링 & CSS

| 기술 | 버전 | 역할 |
|------|------|------|
| **tailwindcss** | ^4.2.1 | 유틸리티 우선 CSS 프레임워크 |
| **@tailwindcss/vite** | ^4.2.1 | Tailwind CSS v4 Vite 플러그인 |
| **tw-animate-css** | ^1.4.0 | Tailwind CSS 애니메이션 유틸리티 |
| **lightningcss** | 1.31.1 | CSS 처리기 (Tailwind v4 내부 사용) |

### 코드 품질 도구

| 기술 | 버전 | 역할 |
|------|------|------|
| **ESLint** | ^9.39.1 | JavaScript/TypeScript 린터 |
| **@eslint/js** | ^9.39.1 | ESLint 권장 JS 규칙 |
| **typescript-eslint** | ^8.48.0 | ESLint TypeScript 지원 |
| **eslint-plugin-react-hooks** | ^7.0.1 | React Hooks 린팅 규칙 |
| **eslint-plugin-react-refresh** | ^0.4.24 | React Fast Refresh 린팅 |
| **@biomejs/biome** | ^2.4.5 | 코드 포매터 & 린터 |
| **globals** | ^16.5.0 | 린터용 전역 변수 정의 |

### 패키지 관리

| 기술 | 버전 | 역할 |
|------|------|------|
| **pnpm** | 9.0 (lockfile) | 패키지 매니저 |

---

## 설정 파일 상세

### TypeScript 설정

**`tsconfig.json`** (기본 설정):
- `target`: ES2022
- `module`: ESNext
- `moduleResolution`: bundler
- `jsx`: react-jsx
- `strict`: enabled
- 경로 별칭: `@/*` → `./src/*`

**`tsconfig.app.json`** (애플리케이션):
- TypeScript Build Info 파일 캐싱 활성화
- Vite 클라이언트 타입 정의 포함
- 엄격한 린팅 (noUnusedLocals, noUnusedParameters, noFallthroughCasesInSwitch)

**`tsconfig.node.json`** (빌드 도구):
- `target`: ES2023
- Vite 설정 파일용

### Vite 설정 (`vite.config.ts`)

- React 플러그인 (Fast Refresh)
- Tailwind CSS v4 플러그인
- 경로 별칭: `@` → `./src`
- 개발 서버 포트: **3000**
- API 프록시: `/api` → `http://localhost:8080` (Spring Boot 백엔드 연동)

### ESLint 설정 (`eslint.config.js`)

- Flat config 형식
- TypeScript ESLint 권장 규칙
- React Hooks 권장 규칙
- React Refresh Vite 규칙
- 브라우저 전역 변수
- 제외 디렉토리: `dist/`

### Biome 설정 (`biome.json`)

- 포매터: 2칸 들여쓰기, 최대 줄 너비 100자
- 린터: 권장 규칙 활성화
- JavaScript: 작은따옴표, 필요시 세미콜론
- Import 정렬 활성화

### shadcn/ui 설정 (`components.json`)

- 스타일: New York
- 프레임워크: React (RSC 미사용)
- 언어: TypeScript (tsx)
- 아이콘 라이브러리: Lucide
- CSS 변수 기반 테마 (기본 색상: slate)
- 컴포넌트 별칭:
  - `@/components`
  - `@/lib/utils`
  - `@/components/ui`
  - `@/hooks`

---

## 스타일링 접근 방식

- **Tailwind CSS v4** with CSS 변수 기반 테마
- **커스텀 폰트**: Fraunces (serif), Inter (sans-serif) via Google Fonts
- **다크 모드** 지원: CSS 변수 variant 기반
- **디자인 토큰**: spacing, sizing, colors, shadows, borders

---

## 프로젝트 구조

```
src/
├── main.tsx                    # 진입점
├── App.tsx / App.css           # 루트 컴포넌트
├── index.css                   # Tailwind 전역 스타일
├── app/
│   ├── App.tsx                 # 메인 앱 래퍼
│   ├── Router.tsx              # 라우트 정의
│   └── providers/
│       └── AppProvider.tsx     # TanStack Query 설정
├── features/                   # 기능 단위 모듈
│   └── auth/
│       ├── api/                # API 호출
│       ├── components/         # 기능 컴포넌트
│       ├── hooks/              # 커스텀 훅
│       └── types/              # TypeScript 타입
├── components/
│   └── ui/                     # shadcn/ui 컴포넌트
├── shared/
│   └── lib/
│       └── api-client.ts       # Axios 인스턴스 및 인터셉터
├── lib/
│   └── utils.ts                # 유틸리티 함수
└── assets/                     # 정적 자산
```

---

## API 연동

- **API 클라이언트**: `/api` 기본 URL로 Axios 인스턴스 구성
- **개발 프록시**: Vite 프록시 (`/api` → `localhost:8080`)
- **인증**: JWT 토큰을 localStorage에 저장, 요청 헤더 자동 주입
- **에러 처리**: 401 응답 시 로그인 페이지로 리다이렉트
- **타임아웃**: 요청당 10초

---

## 빌드 스크립트

```json
{
  "dev":     "vite",                   // 개발 서버 시작 (포트 3000)
  "build":   "tsc -b && vite build",   // TypeScript 빌드 + Vite 프로덕션 빌드
  "lint":    "eslint .",               // ESLint 실행
  "preview": "vite preview"            // 프로덕션 빌드 미리보기
}
```

빌드 출력 디렉토리: `dist/`

---

## 백엔드 연동

| 항목 | 값 |
|------|-----|
| 백엔드 프레임워크 | Spring Boot (`nori-tc`) |
| 개발 백엔드 URL | `http://localhost:8080` |
| API 경로 접두사 | `/api` |
| 인증 방식 | JWT (Bearer Token) |
