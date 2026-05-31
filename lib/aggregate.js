// 레코드 집계 — 기간 버킷에 맞춰 합계/평균/최신으로 묶고, 요약 통계 계산

// records: [{date, value}], buckets: buildBuckets 결과, agg: 'sum'|'avg'|'last'
export function bucketize(records, buckets, agg = 'sum') {
  const groups = buckets.map(() => []);
  for (const r of records || []) {
    const v = Number(r.value);
    if (isNaN(v) || !r.date) continue;
    for (let i = 0; i < buckets.length; i++) {
      if (r.date >= buckets[i].start && r.date <= buckets[i].end) {
        groups[i].push({ date: r.date, value: v });
        break;
      }
    }
  }
  return buckets.map((b, i) => {
    const vals = groups[i];
    let value = null;
    if (vals.length) {
      if (agg === 'avg') value = vals.reduce((s, x) => s + x.value, 0) / vals.length;
      else if (agg === 'last') {
        vals.sort((a, b) => (a.date < b.date ? -1 : 1));
        value = vals[vals.length - 1].value;
      } else value = vals.reduce((s, x) => s + x.value, 0); // sum
    }
    return { label: b.label, key: b.key, value, count: vals.length };
  });
}

// 레코드 요약 통계 (전체 또는 기간 내)
export function summarize(records) {
  const clean = (records || []).filter(r => !isNaN(Number(r.value)) && r.date);
  if (!clean.length) {
    return { count: 0, sum: 0, avg: 0, min: 0, max: 0, latest: null, prev: null, change: null, changePct: null };
  }
  const sorted = [...clean].sort((a, b) => (a.date < b.date ? -1 : 1));
  const vals = clean.map(r => Number(r.value));
  const sum = vals.reduce((s, v) => s + v, 0);
  const latest = Number(sorted[sorted.length - 1].value);
  const prev = sorted.length > 1 ? Number(sorted[sorted.length - 2].value) : null;
  const change = prev != null ? latest - prev : null;
  const changePct = prev ? (change / Math.abs(prev)) * 100 : null;
  return {
    count: vals.length,
    sum,
    avg: sum / vals.length,
    min: Math.min(...vals),
    max: Math.max(...vals),
    latest,
    prev,
    change,
    changePct,
  };
}

// 데이터셋별 합계 (도넛 차트용)
export function datasetTotals(datasets, recordsByDs, range) {
  return (datasets || []).map(ds => {
    let recs = recordsByDs[ds.id] || [];
    if (range) recs = recs.filter(r => r.date >= range.start && r.date <= range.end);
    const total = recs.reduce((s, r) => s + (Number(r.value) || 0), 0);
    return { id: ds.id, name: ds.name, color: ds.color, total };
  });
}
