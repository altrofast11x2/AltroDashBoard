// 날짜 유틸 + 기간(주/월/년) 버킷 계산 — 로컬 타임존 'YYYY-MM-DD' 문자열 사용

export function todayStr(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseDate(str) {
  if (!str) return null;
  const [y, m, d] = String(str).split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

export function addDaysStr(str, n) {
  const d = parseDate(str) || new Date();
  d.setDate(d.getDate() + n);
  return todayStr(d);
}

const WEEKDAY = ['일', '월', '화', '수', '목', '금', '토'];

export const PERIODS = [
  { id: 'week', label: '주' },
  { id: 'month', label: '월' },
  { id: 'year', label: '년' },
];

// 기간별 버킷 배열 — 각 버킷: { key, label, start, end } (start~end 포함 범위)
export function buildBuckets(period, base = new Date()) {
  const today = todayStr(base);
  if (period === 'week') {
    // 최근 7일(오늘 포함), 일별
    const out = [];
    for (let i = 6; i >= 0; i--) {
      const day = addDaysStr(today, -i);
      const d = parseDate(day);
      out.push({ key: day, label: WEEKDAY[d.getDay()], start: day, end: day });
    }
    return out;
  }
  if (period === 'month') {
    // 최근 30일, 일별
    const out = [];
    for (let i = 29; i >= 0; i--) {
      const day = addDaysStr(today, -i);
      const d = parseDate(day);
      out.push({ key: day, label: `${d.getMonth() + 1}/${d.getDate()}`, start: day, end: day });
    }
    return out;
  }
  // 'year' — 최근 12개월, 월별
  const out = [];
  const y0 = base.getFullYear();
  const m0 = base.getMonth();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(y0, m0 - i, 1);
    const y = d.getFullYear();
    const m = d.getMonth(); // 0-based
    const mm = String(m + 1).padStart(2, '0');
    const lastDay = new Date(y, m + 1, 0).getDate();
    out.push({
      key: `${y}-${mm}`,
      label: `${m + 1}월`,
      start: `${y}-${mm}-01`,
      end: `${y}-${mm}-${String(lastDay).padStart(2, '0')}`,
    });
  }
  return out;
}

// 기간 전체 시작/끝 (레코드 필터링용)
export function periodRange(period, base = new Date()) {
  const buckets = buildBuckets(period, base);
  return { start: buckets[0].start, end: buckets[buckets.length - 1].end };
}

// 사람이 읽기 좋은 숫자 (소수 2자리까지, 천단위 콤마)
export function fmt(n) {
  if (n == null || isNaN(n)) return '0';
  const rounded = Math.round(n * 100) / 100;
  return rounded.toLocaleString('ko-KR');
}
