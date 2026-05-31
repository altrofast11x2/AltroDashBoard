import './globals.css';
import NavBar from './components/NavBar';

export const metadata = {
  title: 'AltroDashBoard — 나만의 데이터 대시보드',
  description: 'AltroDashBoard — 데이터를 직접 입력·CSV 업로드하고 막대/라인/원형 차트와 기간 필터로 시각화하는 개인 대시보드',
};

// 페인트 전에 테마를 적용해 깜빡임(FOUC) 방지
const themeInit = `(function(){try{var t=localStorage.getItem('altrodash_theme')||'light';var d=t==='dark'||(t==='system'&&window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(d)document.documentElement.setAttribute('data-theme','dark');}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body suppressHydrationWarning>
        <NavBar />
        {children}
        <footer className="bj-footer">
          AltroDashBoard — 나만의 데이터를 한눈에<br />
          AltroBoard · AltroShop · AltroTodo 통합 계정으로 로그인됩니다
        </footer>
      </body>
    </html>
  );
}
