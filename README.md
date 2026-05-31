# AltroDashBoard

나만의 데이터를 직접 입력하거나 CSV로 업로드해 **막대·라인·원형 차트**와 **기간 필터(주·월·년)**로 시각화하는 개인 데이터 대시보드.
외부 공개 API(날씨·환율·암호화폐) 실시간 위젯과 위젯 커스터마이징을 제공합니다.

> AltroBoard · AltroShop · AltroTodo 에 이은 **Altro 패밀리 4번째 앱**.

## 🔗 라이브

**https://altrodashboard.vercel.app**

## ✨ 기능

- **데이터셋 자유 정의** — 체중·지출·공부시간·독서 등 무엇이든 추적 (이름·단위·색상·차트종류·집계방식)
- **직접 입력 + CSV 업로드/내보내기** — `date,value,note` 형식
- **다중 차트 (Chart.js)** — 데이터셋별 라인↔막대 토글 + 데이터셋 비중 도넛
- **기간 필터** — 주(최근 7일·일별) / 월(최근 30일·일별) / 년(최근 12개월·월별)
- **외부 공개 API 실시간 위젯 (3종, 키 불필요)**
  - 날씨 — [Open-Meteo](https://open-meteo.com)
  - 환율 — [ER-API](https://www.exchangerate-api.com)
  - 암호화폐 — [Upbit](https://docs.upbit.com)
- **위젯 커스터마이징** — 추가/숨김/순서 이동/너비 토글, 레이아웃 저장
- **Altro 패밀리 통합 로그인** — AltroBoard·AltroShop·AltroTodo 계정으로 로그인 가능 (SHA-256 공통 해시)
- 와인레드 종이질감 디자인 + 다크모드

## 🧱 기술 스택

Next.js 16 (App Router) · React 19 · TypeScript · Chart.js · Firebase Realtime DB · Vercel

## 🚀 로컬 실행

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # 프로덕션 빌드
```

`.env.local` 에 Firebase 설정(`NEXT_PUBLIC_FIREBASE_*`)이 필요합니다.

## 🔐 Firebase 규칙 (최초 1회)

데이터 저장/조회를 위해 `database.rules.json` 의 `dash_*` 규칙을 Firebase 콘솔 → Realtime Database → 규칙에 게시하세요. (로그인은 게시 전에도 동작)

## 📁 구조

```
app/
  page.tsx              대시보드 (위젯 그리드 + 기간 필터 + 편집 모드)
  data/page.tsx         데이터 관리 (데이터셋 · 직접 입력 · CSV)
  settings/page.tsx     테마 · 레이아웃 초기화
  login/page.tsx        로그인 / 회원가입
  api/{weather,exchange,crypto}/route.ts   외부 API 프록시
  components/           NavBar · Icons · Charts · DatasetCard · ApiWidgets
lib/
  dash.js               Firebase CRUD (users/datasets/records/layout)
  dates.js · aggregate.js · csv.js · api.js · palette.js · security.js · firebase.js
PLANNING.md             기획서 (주제 · 차트 · DB 설계 · 4단계 분할)
```

## 📄 라이선스

MIT
