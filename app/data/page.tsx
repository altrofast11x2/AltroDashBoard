'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  listDatasets, addDataset, updateDataset, deleteDataset,
  listRecords, addRecord, addRecordsBulk, updateRecord, deleteRecord,
} from '@/lib/dash';
import { PALETTE, CHART_TYPES, AGG_TYPES, aggLabel } from '@/lib/palette';
import { parseCSV, toCSV, downloadCSV } from '@/lib/csv';
import { todayStr, fmt } from '@/lib/dates';
import { Icons as I } from '../components/Icons';

export default function DataPage() {
  const [user, setUser] = useState<any>(null);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [datasets, setDatasets] = useState<any[]>([]);
  const [recordsByDs, setRecordsByDs] = useState<Record<string, any[]>>({});
  const [selId, setSelId] = useState<string>('');

  // 새 데이터셋 폼
  const [nName, setNName] = useState('');
  const [nUnit, setNUnit] = useState('');
  const [nColor, setNColor] = useState(PALETTE[0]);
  const [nType, setNType] = useState('line');
  const [nAgg, setNAgg] = useState('sum');

  // 새 기록 폼
  const [rDate, setRDate] = useState(todayStr());
  const [rValue, setRValue] = useState('');
  const [rNote, setRNote] = useState('');

  // 인라인 수정
  const [editId, setEditId] = useState('');
  const [eDate, setEDate] = useState('');
  const [eValue, setEValue] = useState('');
  const [eNote, setENote] = useState('');

  const [msg, setMsg] = useState<{ type: string; text: string } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('altrodash_user');
      setUser(raw ? JSON.parse(raw) : null);
    } catch { setUser(null); }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const ds = await listDatasets(user.id);
      setDatasets(ds);
      const map: Record<string, any[]> = {};
      await Promise.all(ds.map(async (d: any) => { map[d.id] = await listRecords(user.id, d.id); }));
      setRecordsByDs(map);
      if (ds.length && !selId) setSelId(ds[0].id);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const flash = (type: string, text: string) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 3500);
  };

  const reloadDatasets = async () => {
    const ds = await listDatasets(user.id);
    setDatasets(ds);
    return ds;
  };
  const reloadOne = async (dsId: string) => {
    const recs = await listRecords(user.id, dsId);
    setRecordsByDs(prev => ({ ...prev, [dsId]: recs }));
  };

  const createDataset = async () => {
    if (!nName.trim()) { flash('error', '데이터셋 이름을 입력해주세요'); return; }
    const ds = await addDataset(user.id, { name: nName, unit: nUnit, color: nColor, chartType: nType, agg: nAgg });
    setNName(''); setNUnit('');
    setNColor(PALETTE[(datasets.length + 1) % PALETTE.length]);
    const list = await reloadDatasets();
    setRecordsByDs(prev => ({ ...prev, [ds.id]: [] }));
    setSelId(ds.id);
    flash('success', `'${ds.name}' 데이터셋을 만들었어요`);
  };

  const removeDataset = async (ds: any) => {
    if (!confirm(`'${ds.name}' 데이터셋과 모든 기록을 삭제할까요?`)) return;
    await deleteDataset(user.id, ds.id);
    const list = await reloadDatasets();
    setRecordsByDs(prev => { const c = { ...prev }; delete c[ds.id]; return c; });
    if (selId === ds.id) setSelId(list[0]?.id || '');
    flash('success', '데이터셋을 삭제했어요');
  };

  const sel = datasets.find(d => d.id === selId);
  const records = (recordsByDs[selId] || []).slice().sort((a, b) => (a.date < b.date ? 1 : -1));

  const addOne = async () => {
    if (!sel) return;
    const v = Number(rValue);
    if (rValue === '' || isNaN(v)) { flash('error', '숫자 값을 입력해주세요'); return; }
    if (!rDate) { flash('error', '날짜를 입력해주세요'); return; }
    await addRecord(user.id, sel.id, { date: rDate, value: v, note: rNote });
    setRValue(''); setRNote('');
    await reloadOne(sel.id);
    flash('success', '기록을 추가했어요');
  };

  const startEdit = (r: any) => { setEditId(r.id); setEDate(r.date); setEValue(String(r.value)); setENote(r.note || ''); };
  const saveEdit = async () => {
    const v = Number(eValue);
    if (isNaN(v)) { flash('error', '숫자 값을 입력해주세요'); return; }
    await updateRecord(user.id, sel.id, editId, { date: eDate, value: v, note: eNote });
    setEditId('');
    await reloadOne(sel.id);
  };
  const removeRecord = async (r: any) => {
    await deleteRecord(user.id, sel.id, r.id);
    await reloadOne(sel.id);
  };

  const handleFile = async (file: File) => {
    if (!sel) { flash('error', '먼저 데이터셋을 선택하세요'); return; }
    try {
      const text = await file.text();
      const rows = parseCSV(text);
      if (!rows.length) { flash('error', '인식된 데이터가 없습니다. (헤더: date,value,note)'); return; }
      const n = await addRecordsBulk(user.id, sel.id, rows);
      await reloadOne(sel.id);
      flash('success', `CSV 에서 ${n}건을 '${sel.name}' 에 등록했어요`);
    } catch (e: any) {
      flash('error', 'CSV 처리 실패: ' + (e?.message || e));
    }
  };

  const exportCSV = () => {
    if (!sel) return;
    downloadCSV(`${sel.name}.csv`, toCSV(recordsByDs[sel.id] || []));
  };

  // 샘플 데이터 생성 (데모용)
  const seedSamples = async () => {
    if (!confirm('체중·일일지출·공부시간 샘플 데이터셋을 만들까요? (최근 40일치 임의 데이터)')) return;
    const today = new Date();
    const days = (n: number) => { const d = new Date(today); d.setDate(d.getDate() - n); return todayStr(d); };

    const seeds = [
      { name: '체중', unit: 'kg', color: PALETTE[0], chartType: 'line', agg: 'last',
        gen: (i: number) => Math.round((71 + Math.sin(i / 6) * 1.4 + (Math.random() - 0.5)) * 10) / 10 },
      { name: '일일 지출', unit: '원', color: PALETTE[1], chartType: 'bar', agg: 'sum',
        gen: () => Math.round((4000 + Math.random() * 36000) / 100) * 100 },
      { name: '공부 시간', unit: '시간', color: PALETTE[2], chartType: 'bar', agg: 'sum',
        gen: () => Math.round(Math.random() * 5 * 2) / 2 },
    ];
    for (const s of seeds) {
      const ds = await addDataset(user.id, s);
      const rows = [];
      for (let i = 39; i >= 0; i--) {
        if (s.name === '공부 시간' && Math.random() < 0.25) continue; // 가끔 빈 날
        rows.push({ date: days(i), value: s.gen(i), note: '' });
      }
      await addRecordsBulk(user.id, ds.id, rows);
    }
    const list = await reloadDatasets();
    const map: Record<string, any[]> = {};
    await Promise.all(list.map(async (d: any) => { map[d.id] = await listRecords(user.id, d.id); }));
    setRecordsByDs(map);
    setSelId(list[0]?.id || '');
    flash('success', '샘플 데이터셋 3개를 만들었어요. 대시보드에서 확인해보세요!');
  };

  if (!ready) return null;
  if (!user) {
    return (
      <main className="db-wrap">
        <div className="db-empty" style={{ paddingTop: 90 }}>
          <div className="db-empty-ico"><I.Database width={28} height={28} /></div>
          <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', marginBottom: 16 }}>로그인이 필요합니다</div>
          <Link href="/login" className="bj-btn bj-btn-primary">로그인 / 회원가입</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="db-wrap">
      <Link href="/" className="bj-back-link"><I.Chevron width={14} height={14} style={{ transform: 'rotate(180deg)' }} /> 대시보드</Link>
      <div className="db-page-head">
        <div className="db-page-title">데이터 관리</div>
        <div className="db-page-sub">데이터셋을 만들고, 값을 직접 입력하거나 CSV로 업로드하세요.</div>
      </div>

      {msg && <div className={`bj-alert bj-alert-${msg.type === 'error' ? 'error' : 'success'}`}>{msg.text}</div>}

      <div className="db-data-layout">
        {/* 왼쪽: 데이터셋 목록 + 생성 */}
        <div>
          <div className="db-card">
            <h3>내 데이터셋</h3>
            <div className="hint">{datasets.length}개</div>
            {loading ? (
              <div className="hint">불러오는 중…</div>
            ) : datasets.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '10px 0 4px' }}>
                <div className="hint" style={{ marginBottom: 12 }}>아직 데이터셋이 없어요.</div>
                <button className="bj-btn bj-btn-primary bj-btn-sm" onClick={seedSamples}>
                  <I.Plus width={14} height={14} /> 샘플 데이터 만들기
                </button>
              </div>
            ) : (
              <div className="db-ds-list">
                {datasets.map(ds => {
                  const cnt = (recordsByDs[ds.id] || []).length;
                  return (
                    <div key={ds.id} className={`db-ds-row ${selId === ds.id ? 'sel' : ''}`} onClick={() => { setSelId(ds.id); setEditId(''); }}>
                      <span className="db-ds-swatch" style={{ background: ds.color }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="db-ds-name">{ds.name}</div>
                        <div className="db-ds-meta">
                          {ds.unit || '단위 없음'} · {CHART_TYPES.find(c => c.id === ds.chartType)?.label} · {aggLabel(ds.agg)}
                        </div>
                      </div>
                      <span className="db-ds-count">{cnt}건</span>
                      <button className="db-icon-btn danger" onClick={(e) => { e.stopPropagation(); removeDataset(ds); }} aria-label="삭제">
                        <I.Trash width={15} height={15} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="db-card">
            <h3>새 데이터셋</h3>
            <div className="hint">추적할 항목을 정의하세요 (예: 체중 / kg)</div>
            <div className="bj-field">
              <label>이름</label>
              <input className="db-input" style={{ width: '100%' }} value={nName} onChange={e => setNName(e.target.value)} placeholder="예: 체중, 일일 지출, 독서 페이지" />
            </div>
            <div className="bj-field">
              <label>단위 (선택)</label>
              <input className="db-input" style={{ width: '100%' }} value={nUnit} onChange={e => setNUnit(e.target.value)} placeholder="예: kg, 원, 시간, 페이지" />
            </div>
            <div className="bj-field">
              <label>색상</label>
              <div className="db-palette">
                {PALETTE.map(c => (
                  <button key={c} className={`db-swatch-btn ${nColor === c ? 'sel' : ''}`} style={{ background: c }} onClick={() => setNColor(c)} aria-label="색상" />
                ))}
              </div>
            </div>
            <div className="db-form-row" style={{ marginBottom: 14 }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>차트</label>
                <select className="db-input db-select" style={{ width: '100%' }} value={nType} onChange={e => setNType(e.target.value)}>
                  {CHART_TYPES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>집계</label>
                <select className="db-input db-select" style={{ width: '100%' }} value={nAgg} onChange={e => setNAgg(e.target.value)}>
                  {AGG_TYPES.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
                </select>
              </div>
            </div>
            <button className="bj-btn bj-btn-primary bj-btn-block" onClick={createDataset}>
              <I.Plus width={15} height={15} /> 데이터셋 만들기
            </button>
          </div>
        </div>

        {/* 오른쪽: 선택한 데이터셋의 기록 */}
        <div>
          {!sel ? (
            <div className="db-card">
              <div className="db-empty" style={{ padding: '50px 20px' }}>
                <div className="db-empty-ico"><I.Inbox width={26} height={26} /></div>
                왼쪽에서 데이터셋을 선택하거나 새로 만들어주세요.
              </div>
            </div>
          ) : (
            <>
              <div className="db-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                  <span className="db-ds-swatch" style={{ background: sel.color, width: 18, height: 18 }} />
                  <h3 style={{ margin: 0 }}>{sel.name} <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>{sel.unit && `(${sel.unit})`}</span></h3>
                </div>
                <div className="hint">날짜와 값을 입력해 기록을 추가하세요.</div>
                <div className="db-form-row">
                  <input type="date" className="db-input" value={rDate} onChange={e => setRDate(e.target.value)} style={{ width: 160 }} />
                  <input type="number" step="any" className="db-input" value={rValue} onChange={e => setRValue(e.target.value)}
                    placeholder={`값${sel.unit ? ` (${sel.unit})` : ''}`} style={{ width: 130 }}
                    onKeyDown={e => e.key === 'Enter' && addOne()} />
                  <input className="db-input" value={rNote} onChange={e => setRNote(e.target.value)} placeholder="메모 (선택)" style={{ flex: 1, minWidth: 120 }}
                    onKeyDown={e => e.key === 'Enter' && addOne()} />
                  <button className="bj-btn bj-btn-primary" onClick={addOne}><I.Plus width={15} height={15} /> 추가</button>
                </div>
              </div>

              <div className="db-card">
                <h3>CSV 업로드 / 내보내기</h3>
                <div className="hint">헤더 <code>date,value,note</code> 형식. 날짜는 YYYY-MM-DD.</div>
                <div
                  className={`db-drop ${dragOver ? 'over' : ''}`}
                  onClick={() => fileRef.current?.click()}
                  onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
                >
                  <I.Upload width={22} height={22} style={{ margin: '0 auto 8px' }} />
                  <div><strong>CSV 파일을 끌어다 놓거나 클릭</strong>해서 업로드</div>
                  <div style={{ fontSize: 11.5, marginTop: 4 }}>예: <code>2026-05-30,72.4,아침</code></div>
                </div>
                <input ref={fileRef} type="file" accept=".csv,text/csv" style={{ display: 'none' }}
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }} />
                <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                  <button className="bj-btn bj-btn-sm" onClick={exportCSV}><I.Download width={14} height={14} /> CSV 내보내기</button>
                </div>
              </div>

              <div className="db-card">
                <h3>기록 ({records.length})</h3>
                {records.length === 0 ? (
                  <div className="hint">아직 기록이 없어요. 위에서 값을 추가하거나 CSV를 업로드하세요.</div>
                ) : (
                  <div className="db-table-wrap">
                    <table className="db-table">
                      <thead>
                        <tr><th>날짜</th><th className="num">값{sel.unit ? ` (${sel.unit})` : ''}</th><th>메모</th><th className="act"></th></tr>
                      </thead>
                      <tbody>
                        {records.map(r => editId === r.id ? (
                          <tr key={r.id}>
                            <td><input type="date" className="db-input" value={eDate} onChange={e => setEDate(e.target.value)} style={{ width: 140, padding: '6px 8px' }} /></td>
                            <td className="num"><input type="number" step="any" className="db-input" value={eValue} onChange={e => setEValue(e.target.value)} style={{ width: 90, padding: '6px 8px', textAlign: 'right' }} /></td>
                            <td><input className="db-input" value={eNote} onChange={e => setENote(e.target.value)} style={{ width: '100%', padding: '6px 8px' }} /></td>
                            <td className="act">
                              <button className="db-icon-btn on" onClick={saveEdit} aria-label="저장"><I.Check width={16} height={16} /></button>
                              <button className="db-icon-btn" onClick={() => setEditId('')} aria-label="취소"><I.X width={16} height={16} /></button>
                            </td>
                          </tr>
                        ) : (
                          <tr key={r.id}>
                            <td>{r.date}</td>
                            <td className="num">{fmt(r.value)}</td>
                            <td style={{ color: 'var(--muted)' }}>{r.note}</td>
                            <td className="act">
                              <button className="db-icon-btn" onClick={() => startEdit(r)} aria-label="수정"><I.Edit width={15} height={15} /></button>
                              <button className="db-icon-btn danger" onClick={() => removeRecord(r)} aria-label="삭제"><I.Trash width={15} height={15} /></button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
