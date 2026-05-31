# AltroDashBoard — 나만의 데이터 대시보드 계획서

> AltroBoard · AltroShop · AltroTodo 에 이은 Altro 패밀리 4번째 앱.
> 로그인한 사용자가 **자신만의 데이터셋**(체중·지출·공부시간·독서량 등)을 직접 입력하거나 CSV로 업로드하고,
> 막대/라인/원형 차트와 기간 필터(주·월·년)로 시각화하는 개인용 데이터 대시보드.

## 1. 프로젝트 개요

| 항목 | 내용 |
|------|------|
| **프로젝트명** | AltroDashBoard |
| **목표** | 사용자가 관심 주제의 데이터를 직접 입력/CSV 업로드해 등록하고, 다중 차트(막대·라인·원형)와 기간 필터(주·월·년)로 시각화. 외부 공개 API 실시간 위젯과 위젯 커스터마이징까지 제공 |
| **컨셉** | "나만의 데이터" — 주제를 고정하지 않는 **범용 데이터 트래커**. 데이터셋을 자유롭게 만들어 체중·지출·운동·독서 등 무엇이든 추적 |
| **디자인** | AltroBoard 와 동일한 종이 질감 + 와인레드 액센트 (크림 배경, 2px 샤프 코너, 세리프+산세리프 폰트, 다크모드 지원) |
| **계정** | AltroBoard / AltroShop / AltroTodo 와 동일한 SHA-256 해시 포맷 → **통합 로그인** 호환 |

## 2. 기술 스택

| 분류 | 기술 | 비고 |
|------|------|------|
| 프레임워크 | Next.js 16 (App Router) | AltroTodo 와 동일 버전 |
| 언어 | TypeScript / React 19 | |
| 데이터베이스 | Firebase Realtime DB (`cozyboard-9fb1a`) | Altro 패밀리 공용 프로젝트 재사용 (`dash_*` 네임스페이스로 격리) |
| **차트** | **Chart.js 4 + react-chartjs-2** | 과제 명시 라이브러리. 막대/라인/원형(도넛) 모두 지원 |
| 비밀번호 보안 | SHA-256 (`v1$<email>$<plain>`) | AltroBoard/AltroShop/AltroTodo 와 동일한 `lib/security.js` 패턴 |
| 세션 | LocalStorage (`altrodash_user`) | 형제 앱과 동일 패턴 |
| CSV | 클라이언트 파싱 (의존성 없는 자체 파서 `lib/csv.js`) | 업로드 + 내보내기 |
| 외부 API | Open-Meteo(날씨) · ER-API(환율) · Upbit(암호화폐 시세) | **모두 키 불필요** 공개 API — 즉시 동작 (3단계) |
| 호스팅 | Vercel | production 배포 |

## 3. 폴더 구조

```
AltroDashBoard/
├── app/
│   ├── layout.tsx              루트 레이아웃 (테마 부트스트랩 + NavBar)
│   ├── page.tsx                메인 대시보드 — 데이터셋 카드 + 다중 차트 + 기간 필터
│   ├── globals.css             AltroBoard 팔레트 + 대시보드 전용 스타일
│   ├── components/
│   │   ├── NavBar.tsx          상단 네비 + 햄버거 드로어
│   │   ├── Icons.tsx           공용 SVG 아이콘 (이모지 미사용)
│   │   ├── Charts.tsx          Chart.js 래퍼 (Line/Bar/Doughnut, SSR 안전)
│   │   ├── DatasetCard.tsx     데이터셋 1개 = 차트 + 요약 통계 위젯       [2단계]
│   │   ├── ApiWidgets.tsx      외부 API 실시간 위젯 (날씨/환율/코인)       [3단계]
│   │   └── WidgetGrid.tsx      위젯 추가/제거/순서 커스터마이징           [4단계]
│   ├── login/page.tsx          로그인 / 회원가입 (탭, 통합 계정 호환)
│   ├── data/page.tsx           데이터 관리 — 데이터셋 생성/기록 입력/CSV  [2단계]
│   └── settings/page.tsx       테마 + 대시보드 설정                       [4단계]
├── lib/
│   ├── firebase.js             Firebase Realtime DB 초기화
│   ├── security.js             SHA-256 비밀번호 해시 (Altro 공용 포맷)
│   ├── dates.js                기간(주/월/년) 버킷·범위 계산 유틸
│   ├── dash.js                 모든 CRUD (users / datasets / records / layout / settings)
│   ├── aggregate.js            기간별 집계(합계/평균/최신) + 차트 데이터 변환
│   ├── csv.js                  CSV 파싱 / 생성 (의존성 없음)
│   └── api.js                  외부 공개 API fetch 래퍼                   [3단계]
├── database.rules.json         Firebase 보안 규칙 (dash_* 노드 추가)
├── .env.local                  Firebase 자격 증명 (git 제외)
├── next.config.ts
├── tsconfig.json
├── package.json
└── PLANNING.md
```

## 4. 데이터 모델 (Firebase Realtime DB)

다른 Altro 앱과 충돌 방지를 위해 모든 노드는 `dash_` 프리픽스 사용.

| 노드 | 구조 | 인덱스 |
|------|------|--------|
| `dash_users/{uid}` | `{ name, email, password(sha256), createdAt }` | `email`, `createdAt` |
| `dash_datasets/{uid}/{dsId}` | `{ name, unit, color, chartType, agg, createdAt }` | `createdAt` |
| `dash_records/{uid}/{dsId}/{recId}` | `{ date, value, note, createdAt }` | `date`, `createdAt` |
| `dash_layout/{uid}` | `{ order:[widgetId...], hidden:{id:true}, apiWidgets:{...} }` | — |
| `dash_settings/{uid}` | `{ theme, defaultPeriod }` | — |

**데이터셋(dataset) 필드**

| 필드 | 타입 | 설명 |
|------|------|------|
| `name` | string | 데이터셋 이름 (예: 체중, 일일지출, 공부시간) |
| `unit` | string | 단위 (예: kg, 원, 시간, 페이지) |
| `color` | string | 차트 색상 (8색 팔레트) |
| `chartType` | `'line' \| 'bar'` | 기본 차트 종류 |
| `agg` | `'sum' \| 'avg' \| 'last'` | 같은 기간 버킷 내 다중 기록 집계 방식 |
| `createdAt` | ISO string | 생성 시각 |

**레코드(record) 필드**

| 필드 | 타입 | 설명 |
|------|------|------|
| `date` | string | 측정일 `YYYY-MM-DD` |
| `value` | number | 측정값 |
| `note` | string | 메모 (선택) |
| `createdAt` | ISO string | 입력 시각 |

> **사용자별 격리**: 모든 데이터는 `dash_*/{uid}` 하위에 저장되어 본인에게만 보인다.

## 5. 핵심 기능 (단계별)

### 5.1 회원 / 로그인 (1·2단계)
- 이메일/비밀번호 가입·로그인 (SHA-256 해시 저장)
- **Altro 패밀리 통합 로그인**: 같은 이메일+비밀번호면 AltroBoard `users/` 노드로도 인증
- LocalStorage 세션 (`altrodash_user`)
- 비밀정보를 소스에 하드코딩하지 않음

### 5.2 데이터 입력 & 차트 (2단계)
- **데이터셋 생성**: 이름 + 단위 + 색상 + 차트종류 + 집계방식
- **직접 입력**: 날짜 + 값 + (선택)메모로 레코드 추가, 인라인 수정/삭제
- **CSV 업로드**: `date,value,note` 헤더 CSV 를 선택 데이터셋에 일괄 등록 + CSV 내보내기
- **다중 차트**: 데이터셋마다 라인/막대 차트 + 전체 비중 원형(도넛) 차트
- **기간 필터(주/월/년)**: 같은 데이터를 주간(일별)·월간(일/주별)·연간(월별)로 다르게 표시
- **요약 통계**: 합계·평균·최소·최대·최신값·증감률

### 5.3 외부 API 실시간 위젯 (3단계 — 3개 이상 동시)
- **날씨** (Open-Meteo, 키 불필요): 현재 기온/날씨 + 시간별 추이 라인
- **환율** (ER-API, 키 불필요): USD/JPY/EUR → KRW 실시간 환율
- **암호화폐** (Upbit, 키 불필요): BTC/ETH 등 원화 시세 + 변동률
- 모두 클라이언트 fetch, 자동 새로고침, 실패 시 graceful degrade

### 5.4 위젯 커스터마이징 (4단계)
- 대시보드를 위젯(데이터셋 차트 + API 위젯) 그리드로 구성
- 위젯 **추가/제거(숨김)** + **순서 변경**(위/아래 이동)
- 위젯별 크기(1열/2열) 토글
- 레이아웃을 `dash_layout/{uid}` 에 저장 → 재방문 시 복원

## 6. 화면 레이아웃

```
┌───────────────────────────────────────────────────────────┐
│  AltroDashBoard      [대시보드] [데이터]        [아바타] ☰  │  ← NavBar
├───────────────────────────────────────────────────────────┤
│  기간:  [ 주 ] [ 월 ] [ 년 ]            + 위젯   ⚙ 편집      │  ← 컨트롤 바
├──────────────────────────┬────────────────────────────────┤
│  ┌── 체중 (kg) ──────┐   │  ┌── 일일지출 (원) ──────────┐  │
│  │  라인 차트         │   │  │  막대 차트                 │  │
│  │  최신 72.4 ▼0.6   │   │  │  합계 142,000  평균 20,285 │  │
│  └───────────────────┘   │  └────────────────────────────┘  │  ← 데이터셋 위젯
│  ┌── 데이터셋 비중 ──┐   │  ┌── 날씨 (서울) ────────────┐  │
│  │  도넛 차트         │   │  │  21° 맑음  시간별 추이      │  │  ← API 위젯(3단계)
│  └───────────────────┘   │  └────────────────────────────┘  │
└──────────────────────────┴────────────────────────────────┘
```

- **데스크톱**: 위젯 2열 그리드, 큰 위젯은 2열 차지
- **모바일**: 1열 스택, 기간 필터는 상단 고정 pill

## 7. 차트 설계 (과제: 막대/라인/원형)

| 차트 | 라이브러리 | 용도 |
|------|-----------|------|
| **라인(Line)** | Chart.js `Line` | 시계열 추이 (체중·공부시간 등 변화 추적) |
| **막대(Bar)** | Chart.js `Bar` | 기간별 합계/카운트 비교 (지출·운동 등) |
| **원형(Doughnut)** | Chart.js `Doughnut` | 데이터셋별 합계 비중 / 분포 |

- `app/components/Charts.tsx` 에서 Chart.js 컴포넌트를 SSR 안전하게 래핑(`'use client'`)
- 팔레트 색상·다크모드 그리드선·툴팁을 테마 변수와 일치시킴

## 8. 기간 필터 설계 (주/월/년)

| 기간 | 범위 | 버킷 | 라벨 예 |
|------|------|------|---------|
| **주** | 최근 7일 | 일별 7칸 | 월·화·수… |
| **월** | 최근 30일 | 일별 30칸 | 1·5·10·…일 |
| **년** | 최근 12개월 | 월별 12칸 | 1월·2월… |

- `lib/dates.js` 가 기간별 버킷 경계를 생성, `lib/aggregate.js` 가 레코드를 버킷에 `agg`(합/평균/최신)로 집계
- 같은 데이터가 기간 전환만으로 다른 해상도로 표시됨

## 9. 외부 API 설계 (3단계 상세)

| 위젯 | 엔드포인트 | 키 |
|------|-----------|----|
| 날씨 | `api.open-meteo.com/v1/forecast` | 불필요 |
| 환율 | `open.er-api.com/v6/latest/USD` | 불필요 |
| 암호화폐 | `api.upbit.com/v1/ticker` | 불필요 |

- 모두 무료·키 불필요 공개 API → 별도 설정 없이 즉시 동작
- (옵션) 공공데이터포털/OpenWeather 키 연동도 `.env.local` 로 확장 가능하게 설계

## 10. 배포

- **목표 URL**: https://altrodashboard.vercel.app (Vercel · production)
- 빌드 검증: `npm run build` 통과
- 환경변수: Firebase 7종을 Vercel production 에 등록. 비밀값은 `.env.local`(git 제외)·Vercel 설정에만 보관

### ⚠️ 수동 작업 — Firebase 규칙 게시
공용 DB(`cozyboard-9fb1a`)에 `dash_*` 규칙이 없으면 저장/조회가 거부됩니다(앱은 graceful degrade — 빈 화면).
1. Firebase 콘솔 → Realtime Database → **규칙(Rules)** 탭
2. 이 저장소의 `database.rules.json` **전체 내용**을 붙여넣기 (기존 board/shop/todo 규칙 포함 — 그대로 덮어쓰기)
3. **게시(Publish)** → 끝.

## 11. 개발 단계 (4단계 분할 — 스킵 없이 진행)

- ✅ **1단계**: 대시보드 계획서(본 문서) — 주제/차트종류/DB 설계/화면 레이아웃 + 프로젝트 스캐폴딩
- ✅ **2단계**: 데이터 입력(직접+CSV) + 다중 차트(라인/막대/원형 · Chart.js) + 기간 필터(주/월/년) 구현 및 Vercel 배포
- ✅ **3단계**: 외부 공개 API 3개 동시 연동 (날씨 Open-Meteo · 환율 ER-API · 암호화폐 Upbit) 실시간 위젯
- ✅ **4단계**: 위젯 커스터마이징 (추가/숨김/순서 이동/너비 토글 + 레이아웃 Firebase 저장)
