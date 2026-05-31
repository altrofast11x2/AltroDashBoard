'use client';
import { useState, useMemo } from 'react';
import { buildBuckets, fmt } from '@/lib/dates';
import { bucketize, summarize } from '@/lib/aggregate';
import { LineChart, BarChart } from './Charts';
import { Icons as I } from './Icons';

// 데이터셋 1개 = 차트 + 요약 통계 위젯.
// editing 관련 props 는 4단계(위젯 커스터마이징)에서 사용.
export default function DatasetCard({
  ds, records, period, range,
  editing, span2, canUp, canDown, onMoveUp, onMoveDown, onToggleSpan, onHide,
}: any) {
  const [type, setType] = useState<string>(ds.chartType || 'line');

  const buckets = useMemo(() => buildBuckets(period), [period]);
  const series = useMemo(() => bucketize(records, buckets, ds.agg), [records, buckets, ds.agg]);
  const labels = series.map((s: any) => s.label);
  const values = series.map((s: any) => s.value);
  const hasData = values.some((v: any) => v != null);

  const inRange = useMemo(
    () => (records || []).filter((r: any) => r.date >= range.start && r.date <= range.end),
    [records, range],
  );
  const stat = useMemo(() => summarize(inRange), [inRange]);

  const delta = stat.change;
  const deltaCls = delta == null || delta === 0 ? 'flat' : delta > 0 ? 'up' : 'down';

  return (
    <div className={`db-widget ${span2 ? 'span2' : ''}`}>
      <div className="db-widget-head">
        <span className="db-widget-dot" style={{ background: ds.color }} />
        <div style={{ minWidth: 0 }}>
          <div className="db-widget-title">{ds.name} {ds.unit && <span className="db-widget-unit">({ds.unit})</span>}</div>
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
            <div className="db-chart-toggle">
              <button className={type === 'line' ? 'active' : ''} onClick={() => setType('line')}>라인</button>
              <button className={type === 'bar' ? 'active' : ''} onClick={() => setType('bar')}>막대</button>
            </div>
          )}
        </div>
      </div>

      <div className="db-widget-stats">
        <div className="db-mini">
          <div className="l">최신</div>
          <div className="v">
            {stat.latest != null ? fmt(stat.latest) : '–'}
            {delta != null && (
              <span className={`db-delta ${deltaCls}`} style={{ marginLeft: 6 }}>
                {delta > 0 ? <I.TrendUp width={12} height={12} /> : delta < 0 ? <I.TrendDown width={12} height={12} /> : null}
                {delta > 0 ? '+' : ''}{fmt(delta)}
              </span>
            )}
          </div>
        </div>
        <div className="db-mini"><div className="l">평균</div><div className="v">{fmt(stat.avg)}</div></div>
        {ds.agg === 'sum'
          ? <div className="db-mini"><div className="l">합계</div><div className="v">{fmt(stat.sum)}</div></div>
          : <div className="db-mini"><div className="l">최대</div><div className="v">{fmt(stat.max)}</div></div>}
        <div className="db-mini"><div className="l">기록</div><div className="v">{stat.count}<small> 건</small></div></div>
      </div>

      {hasData ? (
        <div className="db-chart-box">
          {type === 'line'
            ? <LineChart labels={labels} values={values} color={ds.color} unit={ds.unit} />
            : <BarChart labels={labels} values={values} color={ds.color} unit={ds.unit} />}
        </div>
      ) : (
        <div className="db-chart-empty">
          <div className="ico"><I.Chart width={24} height={24} /></div>
          이 기간에 기록이 없어요.
        </div>
      )}
    </div>
  );
}
