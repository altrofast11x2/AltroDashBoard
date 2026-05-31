'use client';
import { useState, useEffect, useCallback } from 'react';
import { fetchWeather, fetchExchange, fetchCrypto, CITIES, wmoDesc } from '@/lib/api';
import { fmt } from '@/lib/dates';
import { LineChart } from './Charts';
import { Icons as I } from './Icons';

// 공통 위젯 헤더 — 편집 모드면 이동/크기/숨김, 아니면 새로고침
function WidgetHead({ color, title, badge, editing, span2, canUp, canDown, onMoveUp, onMoveDown, onToggleSpan, onHide, onRefresh, loading, right }: any) {
  return (
    <div className="db-widget-head">
      <span className="db-widget-dot" style={{ background: color }} />
      <div style={{ minWidth: 0 }}>
        <div className="db-widget-title">{title} {badge && <span className="db-chip">{badge}</span>}</div>
      </div>
      <div className="db-widget-tools">
        {editing ? (
          <>
            <button className="db-icon-btn" disabled={!canUp} onClick={onMoveUp} aria-label="위로"><I.ArrowUp width={16} height={16} /></button>
            <button className="db-icon-btn" disabled={!canDown} onClick={onMoveDown} aria-label="아래로"><I.ArrowDown width={16} height={16} /></button>
            <button className={`db-icon-btn ${span2 ? 'on' : ''}`} onClick={onToggleSpan} aria-label="넓게 보기"><I.Grid width={15} height={15} /></button>
            <button className="db-icon-btn danger" onClick={onHide} aria-label="숨기기"><I.EyeOff width={16} height={16} /></button>
          </>
        ) : (
          <>
            {right}
            <button className="db-icon-btn" onClick={onRefresh} aria-label="새로고침" disabled={loading}>
              <I.Refresh width={15} height={15} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function useApi(fn: () => Promise<any>, intervalMs: number, deps: any[] = []) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const j = await fn();
    if (j && j.ok) { setData(j); setErr(false); } else { setErr(true); }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    load();
    const t = setInterval(load, intervalMs);
    return () => clearInterval(t);
  }, [load, intervalMs]);

  return { data, loading, err, reload: load };
}

/* ───────── 날씨 (Open-Meteo) ───────── */
export function WeatherWidget(props: any) {
  const [cityIdx, setCityIdx] = useState(0);
  const city = CITIES[cityIdx];
  const { data, loading, err, reload } = useApi(() => fetchWeather(city.lat, city.lon), 300000, [cityIdx]);

  const cur = data?.current;
  // 현재 시각 이후 12시간 기온
  let labels: string[] = [], temps: number[] = [];
  if (data?.hourly?.time?.length) {
    const now = cur?.time || data.hourly.time[0];
    let start = data.hourly.time.findIndex((t: string) => t >= now);
    if (start < 0) start = 0;
    const slice = data.hourly.time.slice(start, start + 12);
    labels = slice.map((t: string) => `${Number(t.slice(11, 13))}시`);
    temps = data.hourly.temp.slice(start, start + 12);
  }

  return (
    <div className={`db-widget ${props.span2 ? 'span2' : ''}`}>
      <WidgetHead {...props} color="var(--blue)" title="날씨" badge="Open-Meteo" loading={loading} onRefresh={reload}
        right={
          <select className="db-input db-select" value={cityIdx} onChange={e => setCityIdx(Number(e.target.value))}
            style={{ padding: '4px 26px 4px 8px', fontSize: 12, marginRight: 4 }} onClick={e => e.stopPropagation()}>
            {CITIES.map((c, i) => <option key={c.name} value={i}>{c.name}</option>)}
          </select>
        } />
      {err ? (
        <div className="db-chart-empty" style={{ height: 140 }}>날씨 정보를 불러오지 못했어요.</div>
      ) : !cur ? (
        <div className="db-chart-empty" style={{ height: 140 }}>불러오는 중…</div>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8 }}>
            <I.Cloud width={40} height={40} style={{ color: 'var(--blue)' }} />
            <div>
              <div className="db-api-big">{Math.round(cur.temperature_2m)}°</div>
              <div className="db-api-sub" style={{ fontSize: 13, marginTop: 2 }}>{city.name} · {wmoDesc(cur.weather_code)}</div>
            </div>
            <div style={{ marginLeft: 'auto', textAlign: 'right', fontSize: 12, color: 'var(--muted)' }}>
              <div>습도 {cur.relative_humidity_2m}%</div>
              <div>바람 {cur.wind_speed_10m} m/s</div>
            </div>
          </div>
          {temps.length > 0 && (
            <div style={{ height: 120 }}>
              <LineChart labels={labels} values={temps} color="#2f6df0" unit="°" />
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ───────── 환율 (ER-API) ───────── */
export function ExchangeWidget(props: any) {
  const { data, loading, err, reload } = useApi(fetchExchange, 600000);
  return (
    <div className={`db-widget ${props.span2 ? 'span2' : ''}`}>
      <WidgetHead {...props} color="var(--green)" title="환율" badge="ER-API" loading={loading} onRefresh={reload} />
      {err ? (
        <div className="db-chart-empty" style={{ height: 140 }}>환율 정보를 불러오지 못했어요.</div>
      ) : !data ? (
        <div className="db-chart-empty" style={{ height: 140 }}>불러오는 중…</div>
      ) : (
        <>
          <div style={{ fontSize: 11.5, color: 'var(--muted)', marginBottom: 6 }}>1 단위 = 원(KRW) 기준</div>
          {data.pairs.map((p: any) => (
            <div key={p.code} className="db-api-row">
              <div>
                <span className="db-api-label">{p.code}</span>
                <span className="db-api-sub" style={{ marginLeft: 8 }}>{p.label}</span>
              </div>
              <div className="db-api-val">{p.krw != null ? `${fmt(Math.round(p.krw * 100) / 100)} 원` : '–'}</div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

/* ───────── 암호화폐 (Upbit) ───────── */
export function CryptoWidget(props: any) {
  const { data, loading, err, reload } = useApi(fetchCrypto, 60000);
  return (
    <div className={`db-widget ${props.span2 ? 'span2' : ''}`}>
      <WidgetHead {...props} color="var(--amber)" title="암호화폐" badge="Upbit" loading={loading} onRefresh={reload} />
      {err ? (
        <div className="db-chart-empty" style={{ height: 140 }}>시세를 불러오지 못했어요.</div>
      ) : !data ? (
        <div className="db-chart-empty" style={{ height: 140 }}>불러오는 중…</div>
      ) : (
        <>
          <div style={{ fontSize: 11.5, color: 'var(--muted)', marginBottom: 6 }}>원화 마켓 현재가 · 24h 변동</div>
          {data.coins.map((c: any) => {
            const up = c.change >= 0;
            return (
              <div key={c.market} className="db-api-row">
                <div>
                  <span className="db-api-label">{c.name}</span>
                  <span className="db-api-sub" style={{ marginLeft: 8 }}>{c.symbol}</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="db-api-val">{fmt(c.price)} 원</div>
                  <div className={`db-delta ${up ? 'up' : 'down'}`} style={{ justifyContent: 'flex-end' }}>
                    {up ? <I.TrendUp width={12} height={12} /> : <I.TrendDown width={12} height={12} />}
                    {up ? '+' : ''}{c.change.toFixed(2)}%
                  </div>
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
