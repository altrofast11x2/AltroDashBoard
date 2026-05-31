'use client';
import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { listDatasets, listAllRecords, getLayout, saveLayout } from '@/lib/dash';
import { PERIODS, periodRange } from '@/lib/dates';
import DatasetCard from './components/DatasetCard';
import { DoughnutChart } from './components/Charts';
import { WeatherWidget, ExchangeWidget, CryptoWidget } from './components/ApiWidgets';
import { Icons as I } from './components/Icons';

const PERIOD_DESC: Record<string, string> = { week: '최근 7일 · 일별', month: '최근 30일 · 일별', year: '최근 12개월 · 월별' };
const API_LABELS: Record<string, string> = { 'api:weather': '날씨', 'api:exchange': '환율', 'api:crypto': '암호화폐' };

// 데이터셋별 비중 도넛 위젯 (편집 헤더 포함)
function DistWidget({ dist, editing, span2, canUp, canDown, onMoveUp, onMoveDown, onToggleSpan, onHide }: any) {
  return (
    <div className={`db-widget ${span2 ? 'span2' : ''}`}>
      <div className="db-widget-head">
        <span className="db-widget-dot" style={{ background: 'var(--accent)' }} />
        <div className="db-widget-title">데이터셋별 기록 비중 <span className="db-widget-unit">(기간 내)</span></div>
        <div className="db-widget-tools">
          {editing && (
            <>
              <button className="db-icon-btn" disabled={!canUp} onClick={onMoveUp} aria-label="위로"><I.ArrowUp width={16} height={16} /></button>
              <button className="db-icon-btn" disabled={!canDown} onClick={onMoveDown} aria-label="아래로"><I.ArrowDown width={16} height={16} /></button>
              <button className={`db-icon-btn ${span2 ? 'on' : ''}`} onClick={onToggleSpan} aria-label="넓게 보기"><I.Grid width={15} height={15} /></button>
              <button className="db-icon-btn danger" onClick={onHide} aria-label="숨기기"><I.EyeOff width={16} height={16} /></button>
            </>
          )}
        </div>
      </div>
      <div className="db-chart-box tall"><DoughnutChart items={dist} /></div>
    </div>
  );
}

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [datasets, setDatasets] = useState<any[]>([]);
  const [recordsByDs, setRecordsByDs] = useState<Record<string, any[]>>({});
  const [period, setPeriod] = useState('month');

  // 레이아웃(위젯 커스터마이징)
  const [order, setOrder] = useState<string[]>([]);
  const [hidden, setHidden] = useState<Record<string, boolean>>({});
  const [span2, setSpan2] = useState<Record<string, boolean>>({});
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('altrodash_user');
      setUser(raw ? JSON.parse(raw) : null);
    } catch { setUser(null); }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    (async () => {
      setLoading(true);
      const [ds, lay] = await Promise.all([listDatasets(user.id), getLayout(user.id)]);
      setDatasets(ds);
      const map = await listAllRecords(user.id, ds) as Record<string, any[]>;
      setRecordsByDs(map);
      if (lay) { setOrder(lay.order || []); setHidden(lay.hidden || {}); setSpan2(lay.span2 || {}); }
      setLoading(false);
    })();
  }, [user]);

  const range = useMemo(() => periodRange(period), [period]);
  const totalRecords = useMemo(() => Object.values(recordsByDs).reduce((s, a) => s + a.length, 0), [recordsByDs]);
  const recordsInRange = useMemo(() => Object.values(recordsByDs).reduce(
    (s, a) => s + a.filter(r => r.date >= range.start && r.date <= range.end).length, 0), [recordsByDs, range]);

  const dist = useMemo(() => datasets.map(ds => ({
    id: ds.id, name: ds.name, color: ds.color,
    total: (recordsByDs[ds.id] || []).filter(r => r.date >= range.start && r.date <= range.end).length,
  })).filter(d => d.total > 0), [datasets, recordsByDs, range]);
  const distAvailable = dist.length >= 2;

  // 사용 가능한 전체 위젯 id (기본 순서)
  const allIds = useMemo(() => {
    const ids = datasets.map(d => `ds:${d.id}`);
    if (distAvailable) ids.push('dist');
    ids.push('api:weather', 'api:exchange', 'api:crypto');
    return ids;
  }, [datasets, distAvailable]);

  // 저장된 순서 + 신규 위젯 병합
  const ordered = useMemo(() => {
    const out: string[] = [];
    for (const id of order) if (allIds.includes(id) && !out.includes(id)) out.push(id);
    for (const id of allIds) if (!out.includes(id)) out.push(id);
    return out;
  }, [order, allIds]);

  const visibleIds = ordered.filter(id => !hidden[id]);
  const hiddenIds = ordered.filter(id => hidden[id]);

  const persist = (next: { order?: string[]; hidden?: any; span2?: any }) => {
    const oo = next.order ?? ordered;
    const h = next.hidden ?? hidden;
    const s = next.span2 ?? span2;
    setOrder(oo); setHidden(h); setSpan2(s);
    if (user) saveLayout(user.id, { order: oo, hidden: h, span2: s }).catch(() => {});
  };

  const move = (id: string, dir: number) => {
    const vi = visibleIds.indexOf(id);
    const target = visibleIds[vi + dir];
    if (!target) return;
    const no = [...ordered];
    const a = no.indexOf(id), b = no.indexOf(target);
    [no[a], no[b]] = [no[b], no[a]];
    persist({ order: no });
  };
  const toggleSpan = (id: string) => {
    const ns = { ...span2 }; if (ns[id]) delete ns[id]; else ns[id] = true;
    persist({ span2: ns });
  };
  const hide = (id: string) => persist({ hidden: { ...hidden, [id]: true } });
  const show = (id: string) => { const nh = { ...hidden }; delete nh[id]; persist({ hidden: nh }); };

  const widgetLabel = (id: string) => {
    if (id.startsWith('ds:')) return datasets.find(d => d.id === id.slice(3))?.name || '데이터셋';
    if (id === 'dist') return '데이터셋별 비중';
    return API_LABELS[id] || id;
  };
  const widgetColor = (id: string) => {
    if (id.startsWith('ds:')) return datasets.find(d => d.id === id.slice(3))?.color || 'var(--accent)';
    if (id === 'api:weather') return 'var(--blue)';
    if (id === 'api:exchange') return 'var(--green)';
    if (id === 'api:crypto') return 'var(--amber)';
    return 'var(--accent)';
  };

  const renderWidget = (id: string) => {
    const ep = {
      editing, span2: !!span2[id],
      canUp: visibleIds.indexOf(id) > 0,
      canDown: visibleIds.indexOf(id) < visibleIds.length - 1,
      onMoveUp: () => move(id, -1), onMoveDown: () => move(id, 1),
      onToggleSpan: () => toggleSpan(id), onHide: () => hide(id),
    };
    if (id.startsWith('ds:')) {
      const ds = datasets.find(d => d.id === id.slice(3));
      if (!ds) return null;
      return <DatasetCard key={id} ds={ds} records={recordsByDs[ds.id] || []} period={period} range={range} {...ep} />;
    }
    if (id === 'dist') return <DistWidget key={id} dist={dist} {...ep} />;
    if (id === 'api:weather') return <WeatherWidget key={id} {...ep} />;
    if (id === 'api:exchange') return <ExchangeWidget key={id} {...ep} />;
    if (id === 'api:crypto') return <CryptoWidget key={id} {...ep} />;
    return null;
  };

  if (!ready) return null;

  // ───── 비로그인 랜딩 ─────
  if (!user) {
    return (
      <main className="db-wrap">
        <div style={{ textAlign: 'center', padding: '60px 20px 40px' }}>
          <div style={{ display: 'inline-flex', width: 72, height: 72, borderRadius: 20, background: 'var(--accent)', color: '#fff', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
            <I.Grid width={36} height={36} />
          </div>
          <h1 style={{ fontFamily: 'var(--serif)', fontSize: 34, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 12 }}>
            나만의 데이터, <span style={{ color: 'var(--accent)' }}>한눈에</span>
          </h1>
          <p style={{ fontSize: 15, color: 'var(--muted)', lineHeight: 1.7, maxWidth: 520, margin: '0 auto 26px' }}>
            체중·지출·공부시간·독서량 등 관심 있는 데이터를 직접 입력하거나 CSV로 올리고,<br />
            막대·라인·원형 차트와 기간 필터(주·월·년)로 시각화하세요.
          </p>
          <Link href="/login" className="bj-btn bj-btn-primary" style={{ padding: '13px 28px', fontSize: 15 }}>
            <I.Login width={16} height={16} /> 시작하기
          </Link>
        </div>
        <div className="db-strip" style={{ maxWidth: 760, margin: '20px auto 0' }}>
          <div className="db-strip-box"><div className="l"><I.Database width={14} height={14} /> 직접 입력 · CSV</div><div className="v" style={{ fontSize: 15, fontWeight: 700 }}>데이터셋 자유 정의</div></div>
          <div className="db-strip-box"><div className="l"><I.Chart width={14} height={14} /> 다중 차트</div><div className="v" style={{ fontSize: 15, fontWeight: 700 }}>막대·라인·원형</div></div>
          <div className="db-strip-box"><div className="l"><I.Cloud width={14} height={14} /> 실시간 API</div><div className="v" style={{ fontSize: 15, fontWeight: 700 }}>날씨·환율·코인</div></div>
          <div className="db-strip-box"><div className="l"><I.Grid width={14} height={14} /> 위젯 편집</div><div className="v" style={{ fontSize: 15, fontWeight: 700 }}>추가·이동·숨김</div></div>
        </div>
      </main>
    );
  }

  if (loading) {
    return <main className="db-wrap"><div className="db-empty" style={{ paddingTop: 90 }}>불러오는 중…</div></main>;
  }

  return (
    <main className="db-wrap">
      <div className="db-page-head">
        <div className="db-page-title">대시보드</div>
        <div className="db-page-sub">{user.name}님의 데이터를 {PERIOD_DESC[period]}로 보고 있어요.</div>
      </div>

      <div className="db-control">
        <div className="db-period">
          {PERIODS.map(p => (
            <button key={p.id} className={period === p.id ? 'active' : ''} onClick={() => setPeriod(p.id)}>{p.label}</button>
          ))}
        </div>
        <div className="db-control-spacer" />
        <Link href="/data" className="bj-btn bj-btn-sm"><I.Plus width={14} height={14} /> 데이터 추가</Link>
        <button className={`bj-btn bj-btn-sm ${editing ? 'bj-btn-primary' : ''}`} onClick={() => setEditing(e => !e)}>
          {editing ? <><I.Check width={14} height={14} /> 완료</> : <><I.Cog width={14} height={14} /> 위젯 편집</>}
        </button>
      </div>

      {datasets.length === 0 ? (
        <div className="db-empty" style={{ paddingTop: 50 }}>
          <div className="db-empty-ico"><I.Grid width={28} height={28} /></div>
          <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', marginBottom: 8 }}>아직 데이터셋이 없어요</div>
          <div style={{ marginBottom: 18 }}>데이터를 추가하면 여기에 차트가 표시됩니다. 아래 실시간 위젯은 바로 확인할 수 있어요.</div>
          <Link href="/data" className="bj-btn bj-btn-primary"><I.Plus width={15} height={15} /> 데이터 추가하기</Link>
        </div>
      ) : (
        <div className="db-strip">
          <div className="db-strip-box"><div className="l"><I.Database width={14} height={14} /> 데이터셋</div><div className="v">{datasets.length}<small> 개</small></div></div>
          <div className="db-strip-box"><div className="l"><I.Inbox width={14} height={14} /> 전체 기록</div><div className="v">{totalRecords}<small> 건</small></div></div>
          <div className="db-strip-box"><div className="l"><I.Chart width={14} height={14} /> 기간 내 기록</div><div className="v">{recordsInRange}<small> 건</small></div></div>
          <div className="db-strip-box"><div className="l"><I.Refresh width={14} height={14} /> 기간</div><div className="v" style={{ fontSize: 16, fontWeight: 700 }}>{PERIODS.find(p => p.id === period)?.label}간</div></div>
        </div>
      )}

      {editing && (
        <>
          <div className="db-edit-bar">
            <I.Cog width={16} height={16} />
            편집 모드 — 각 위젯의 화살표로 순서를, 격자 아이콘으로 너비를, 눈 아이콘으로 숨김을 조절하세요. 변경은 자동 저장됩니다.
          </div>
          <div className="db-add-panel">
            <h4>숨긴 위젯 추가</h4>
            {hiddenIds.length === 0 ? (
              <div className="db-add-empty">모든 위젯이 표시 중입니다.</div>
            ) : (
              <div className="db-add-chips">
                {hiddenIds.map(id => (
                  <span key={id} className="db-add-chip">
                    <span className="dot" style={{ background: widgetColor(id) }} />
                    {widgetLabel(id)}
                    <button onClick={() => show(id)}><I.Plus width={12} height={12} /> 추가</button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      <div className="db-grid">
        {visibleIds.map(renderWidget)}
      </div>
    </main>
  );
}
