## 디자인 생성

### 로그인 페이지 디자인 생성 (예시)
webapp-3-scandinavianminimal 스타일 가이드를 사용해줘.
Pencil MCP 서버를 이용해서 현재 캔버스의 Frame에 로그인 페이지를 디자인해줘.

요구사항:
- 전체 페이지 크기 1440x900
- 좌측 상단에 "NORI" 로고 텍스트
- 중앙에 로그인 카드:
  - 제목: "로그인"
  - 이메일 입력 필드 (라벨 포함)
  - 비밀번호 입력 필드 (라벨 포함)
  - 로그인 버튼 (전체 너비, 주요 색상)
  - 버튼 아래 "비밀번호를 잊으셨나요?" 링크
- 여백이 충분한 깔끔한 스칸디나비안 미니멀 스타일
- 밝은 배경

pencil mcp 서버를 사용해줘.

### 레이아웃이 마음에 안 들 때 (예시)
pencil 캔버스에서 현재 디자인을 봐줘.
요소들 사이의 여백이 너무 좁아. 여백을 더 넓혀줘.
webapp-3-scandinavianminimal 스타일 가이드는 유지해줘.
현재 Frame 옆에 새로운 Frame을 만들어서 수정된 버전을 디자인해줘.
pencil mcp 서버를 사용해줘.


### EQP Info page 요청
webapp-3-scandinavianminimal 스타일 가이드를 사용해줘.
Pencil MCP 서버를 이용해서 design.pen의 EqpInfo Frame에 EqpInfo 페이지를 디자인해줘.

레이아웃 구성:
- 전체 페이지 크기 1440x900
- 상단 헤더바:
  - 좌측에 "NORI" 로고
  - 중앙에 메뉴 항목들 (가로 배치)
  - 우측에 사용자 프로필 아이콘
  - 전체 Page 공용으로 사용 (login 제외)

  - 메뉴 구조
    - Eqp         → 호버 시 드롭다운: Eqp Info
    - Model       → 호버 시 드롭다운: Model Info
    - Deploy      → 호버 시 드롭다운: Eqp Deploy, Model Deploy
    - Dlq         → 호버 시 드롭다운: Gateway Dlq, Business Dlq
    - User        → 호버 시 드롭다운: User Info, Group Info
    
  - 드롭다운 스타일:
    - 호버 시 메뉴 아이템 아래에 드롭다운 패널 표시
    - 드롭다운 항목 클릭 시 해당 페이지로 이동
    - 현재 활성화된 메뉴 항목 강조 표시
    - 스칸디나비안 미니멀 스타일 유지

- 좌측 사이드바 (너비 240px):
  - 제목: "설비 목록"
  - Tree 형식의 설비 ID 목록 (더미 데이터로 구성)
    - FAB-01
      - EQP-001
      - EQP-002
    - FAB-02
      - EQP-003
      - EQP-004
  - 선택된 항목은 강조 표시
  - 스크롤 가능한 영역

- 가운데 메인 콘텐츠 영역:
  - 상단 테이블 (설비 정보, EQP Info):
    - 테이블 제목: "설비 정보"
    - 컬럼: EQPID, Comm Interface, Comm Mode, Route Partition, IP, Port, Enabled, Model, Model Version, Gateway Jarfile, Business Jarfile, 
    - 더미 데이터 3~5행 포함
    - 상태 컬럼은 배지(badge) 형태로 표시

  - 하단 테이블 (설비 파라미터, EQP Parameter):
    - 테이블 제목: "설비 파라미터"
    - 컬럼: Param Name, Param Value, Description
    - 더미 데이터 3~5행 포함

- 두 테이블 사이 간격 충분히
- 상단 테이블과 하단 테이블 사이, 하단 테이블과 가까운 쪽에 "Applied version : " 라벨
- "Applied version : " 라벨 위에 select button
- select button 은 왼쪽에 있고, 오른쪽에는 "Check Out" 버튼
- "Check Out" 버튼을 누르면 하단 테이블 수정 가능. 버튼명은 "Check In" 으로 변경
- "Check In" 을 누르면 테이블을 저장하는 기능. save, undo, cancel 을 사용자가 선택

스타일:
- 사이드바와 메인 영역 사이에 구분선
- 스칸디나비안 미니멀 스타일 유지
- 충분한 여백과 깔끔한 타이포그래피

pencil mcp 서버를 사용해줘.

### Model Info page 요청
webapp-3-scandinavianminimal 스타일 가이드를 사용해줘.
Pencil MCP 서버를 이용해서 design.pen의 Model Frame에 ModelInfo 페이지를 디자인해줘.

레이아웃 구성:
- 전체 페이지 크기 1440x900
- 상단 헤더바:
  - 좌측에 "NORI" 로고
  - 중앙에 메뉴 항목들 (가로 배치)
  - 우측에 사용자 프로필 아이콘
  - 전체 Page 공용으로 사용 (login 제외)

  - 메뉴 구조
    - Eqp         → 호버 시 드롭다운: Eqp Info
    - Model       → 호버 시 드롭다운: Model Info
    - Deploy      → 호버 시 드롭다운: Eqp Deploy, Model Deploy
    - Dlq         → 호버 시 드롭다운: Gateway Dlq, Business Dlq
    - User        → 호버 시 드롭다운: User Info, Group Info
    
  - 드롭다운 스타일:
    - 호버 시 메뉴 아이템 아래에 드롭다운 패널 표시
    - 드롭다운 항목 클릭 시 해당 페이지로 이동
    - 현재 활성화된 메뉴 항목 강조 표시
    - 스칸디나비안 미니멀 스타일 유지

- 좌측 사이드바 (너비 240px):
  - 제목: "설비 목록"
  - Tree 형식의 설비 ID 목록 (더미 데이터로 구성)
    - FAB-01
      - EQP-001
      - EQP-002
    - FAB-02
      - EQP-003
      - EQP-004
  - 선택된 항목은 강조 표시
  - 스크롤 가능한 영역

- 가운데 메인 콘텐츠 영역:
  - 상단 테이블 (설비 정보, EQP Info):
    - 테이블 제목: "설비 정보"
    - 컬럼: EQPID, Comm Interface, Comm Mode, Route Partition, IP, Port, Enabled, Model, Model Version, Gateway Jarfile, Business Jarfile, 
    - 더미 데이터 3~5행 포함
    - 상태 컬럼은 배지(badge) 형태로 표시

  - 하단 테이블 (설비 파라미터, EQP Parameter):
    - 테이블 제목: "설비 파라미터"
    - 컬럼: Param Name, Param Value, Description
    - 더미 데이터 3~5행 포함

- 두 테이블 사이 간격 충분히
- 상단 테이블과 하단 테이블 사이, 하단 테이블과 가까운 쪽에 "Applied version : " 라벨
- "Applied version : " 라벨 위에 select button
- select button 은 왼쪽에 있고, 오른쪽에는 "Check Out" 버튼
- "Check Out" 버튼을 누르면 하단 테이블 수정 가능. 버튼명은 "Check In" 으로 변경
- "Check In" 을 누르면 테이블을 저장하는 기능. save, undo, cancel 을 사용자가 선택

스타일:
- 사이드바와 메인 영역 사이에 구분선
- 스칸디나비안 미니멀 스타일 유지
- 충분한 여백과 깔끔한 타이포그래피

pencil mcp 서버를 사용해줘.