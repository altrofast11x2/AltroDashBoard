'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Icons as I } from './Icons';

const ALTRO_APPS = [
  { name: 'AltroBoard', url: 'https://altroboard.vercel.app/' },
  { name: 'AltroShop', url: 'https://altroshop.vercel.app/' },
  { name: 'AltroTodo', url: 'https://altrotodo.vercel.app/' },
];

const NAV = [
  { href: '/',     label: '대시보드', icon: I.Grid },
  { href: '/data', label: '데이터',   icon: I.Database },
];

export default function NavBar() {
  const [user, setUser] = useState<any>(null);
  const [drawer, setDrawer] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const refresh = () => {
      try {
        const raw = localStorage.getItem('altrodash_user');
        setUser(raw ? JSON.parse(raw) : null);
      } catch { setUser(null); }
    };
    refresh();
    window.addEventListener('storage', refresh);
    window.addEventListener('altrodash:refresh', refresh);
    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener('altrodash:refresh', refresh);
    };
  }, [pathname]);

  useEffect(() => { setDrawer(false); }, [pathname]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.body.style.overflow = drawer ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [drawer]);

  const logout = () => {
    if (!confirm('로그아웃 하시겠습니까?')) return;
    localStorage.removeItem('altrodash_user');
    setUser(null);
    window.dispatchEvent(new Event('altrodash:refresh'));
    router.push('/');
  };

  return (
    <>
      <header className="bj-header">
        <div className="bj-header-inner">
          <Link href="/" className="bj-logo">Altro<span>DashBoard</span></Link>

          {user && (
            <nav className="bj-header-right" style={{ marginLeft: 8 }}>
              {NAV.map(n => {
                const Ico = n.icon;
                const active = pathname === n.href;
                return (
                  <Link key={n.href} href={n.href} className={`bj-nav-link ${active ? 'active' : ''}`}>
                    <Ico width={17} height={17} /><span>{n.label}</span>
                  </Link>
                );
              })}
            </nav>
          )}

          <div className="bj-header-spacer" />

          <div className="bj-header-right">
            {user ? (
              <button onClick={() => setDrawer(true)} className="bj-avatar" aria-label="메뉴">
                {(user.name || '?')[0].toUpperCase()}
              </button>
            ) : (
              <Link href="/login" className="bj-login-btn">로그인 / 회원가입</Link>
            )}
            <button onClick={() => setDrawer(true)} className="bj-hamburger" aria-label="메뉴">
              <I.Menu width={22} height={22} />
            </button>
          </div>
        </div>
      </header>

      {drawer && (
        <>
          <div className="bj-drawer-overlay" onClick={() => setDrawer(false)} />
          <aside className="bj-drawer">
            <div className="bj-drawer-head">
              <div className="bj-drawer-head-title">메뉴</div>
              <button className="bj-drawer-close" onClick={() => setDrawer(false)} aria-label="닫기">
                <I.X width={20} height={20} />
              </button>
            </div>

            {user ? (
              <div className="bj-drawer-user">
                <div className="bj-avatar">{(user.name || '?')[0].toUpperCase()}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="bj-drawer-user-name">{user.name}</div>
                  <div className="bj-drawer-user-email">{user.email}</div>
                </div>
              </div>
            ) : (
              <div className="bj-drawer-cta">
                <Link href="/login" className="bj-drawer-coin-btn">
                  <I.Login width={14} height={14} /> 로그인 / 회원가입
                </Link>
                <div className="bj-drawer-cta-note">
                  AltroBoard 계정으로도 로그인할 수 있어요<br />
                  내 데이터는 <strong>나에게만</strong> 보입니다
                </div>
              </div>
            )}

            <nav className="bj-drawer-nav">
              {user && NAV.map(n => {
                const Ico = n.icon;
                return (
                  <Link key={n.href} href={n.href} className={`bj-drawer-item ${pathname === n.href ? 'active' : ''}`}>
                    <span className="bj-drawer-item-icon"><Ico width={20} height={20} /></span>
                    {n.label}
                  </Link>
                );
              })}
              {user && (
                <Link href="/settings" className={`bj-drawer-item ${pathname === '/settings' ? 'active' : ''}`}>
                  <span className="bj-drawer-item-icon"><I.Cog width={20} height={20} /></span>
                  설정
                </Link>
              )}
              <div className="bj-drawer-sect">다른 Altro 앱</div>
              {ALTRO_APPS.map(app => (
                <a key={app.url} href={app.url} target="_blank" rel="noopener noreferrer" className="bj-drawer-item">
                  <span className="bj-drawer-item-icon"><I.Apps width={20} height={20} /></span>
                  {app.name}
                  <span className="bj-drawer-item-ext"><I.Ext width={13} height={13} /></span>
                </a>
              ))}
            </nav>

            {user && (
              <div className="bj-drawer-bottom">
                <button onClick={logout} className="bj-drawer-item bj-drawer-logout">
                  <span className="bj-drawer-item-icon"><I.Logout width={20} height={20} /></span>
                  로그아웃
                </button>
              </div>
            )}
          </aside>
        </>
      )}
    </>
  );
}
