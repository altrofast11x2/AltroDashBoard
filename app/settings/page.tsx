'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { saveLayout } from '@/lib/dash';
import { Icons as I } from '../components/Icons';

const THEMES = [
  { id: 'light', label: '라이트' },
  { id: 'dark', label: '다크' },
  { id: 'system', label: '시스템' },
];

function applyTheme(t: string) {
  const dark = t === 'dark' || (t === 'system' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  if (dark) document.documentElement.setAttribute('data-theme', 'dark');
  else document.documentElement.removeAttribute('data-theme');
}

export default function SettingsPage() {
  const [user, setUser] = useState<any>(null);
  const [ready, setReady] = useState(false);
  const [theme, setTheme] = useState('light');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    try {
      const raw = localStorage.getItem('altrodash_user');
      setUser(raw ? JSON.parse(raw) : null);
      setTheme(localStorage.getItem('altrodash_theme') || 'light');
    } catch {}
    setReady(true);
  }, []);

  const pickTheme = (t: string) => {
    setTheme(t);
    localStorage.setItem('altrodash_theme', t);
    applyTheme(t);
  };

  const resetLayout = async () => {
    if (!user) return;
    if (!confirm('대시보드 위젯 배치(순서·숨김·너비)를 기본값으로 초기화할까요? 데이터는 삭제되지 않습니다.')) return;
    await saveLayout(user.id, { order: [], hidden: {}, span2: {} });
    setMsg('대시보드 배치를 초기화했어요. 대시보드에서 확인하세요.');
    setTimeout(() => setMsg(''), 3500);
  };

  if (!ready) return null;
  if (!user) {
    return (
      <main className="db-wrap">
        <div className="db-empty" style={{ paddingTop: 90 }}>
          <div className="db-empty-ico"><I.Cog width={28} height={28} /></div>
          <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', marginBottom: 16 }}>로그인이 필요합니다</div>
          <Link href="/login" className="bj-btn bj-btn-primary">로그인 / 회원가입</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="db-wrap" style={{ maxWidth: 640 }}>
      <Link href="/" className="bj-back-link"><I.Chevron width={14} height={14} style={{ transform: 'rotate(180deg)' }} /> 대시보드</Link>
      <div className="db-page-head">
        <div className="db-page-title">설정</div>
        <div className="db-page-sub">테마와 대시보드 배치를 관리하세요.</div>
      </div>

      {msg && <div className="bj-alert bj-alert-success">{msg}</div>}

      <div className="db-card">
        <h3>테마</h3>
        <div className="hint">화면 색상 모드를 선택하세요.</div>
        <div className="db-theme-opts">
          {THEMES.map(t => (
            <button key={t.id} className={`db-theme-opt ${theme === t.id ? 'active' : ''}`} onClick={() => pickTheme(t.id)}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="db-card">
        <h3>대시보드 배치</h3>
        <div className="hint">위젯 순서·숨김·너비를 기본값으로 되돌립니다.</div>
        <button className="bj-btn" onClick={resetLayout}><I.Refresh width={15} height={15} /> 위젯 배치 초기화</button>
      </div>

      <div className="db-card">
        <h3>계정</h3>
        <div className="db-toggle-row">
          <div className="db-toggle-text">
            <strong>{user.name}</strong>
            <small>{user.email}</small>
          </div>
          <span className="db-chip">{user.source === 'altroboard' ? 'AltroBoard 연동' : 'AltroDashBoard'}</span>
        </div>
      </div>
    </main>
  );
}
