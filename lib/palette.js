// 데이터셋 색상 팔레트 (8색) — 차트/스와치 공용
export const PALETTE = [
  '#c0392b', // wine (accent)
  '#2f6df0', // blue
  '#1a9e54', // green
  '#d98a0b', // amber
  '#8b5cf6', // purple
  '#0891b2', // cyan
  '#e8590c', // orange
  '#be185d', // pink
];

export const CHART_TYPES = [
  { id: 'line', label: '라인' },
  { id: 'bar', label: '막대' },
];

export const AGG_TYPES = [
  { id: 'sum', label: '합계' },
  { id: 'avg', label: '평균' },
  { id: 'last', label: '최신값' },
];

export function aggLabel(id) {
  return (AGG_TYPES.find(a => a.id === id) || AGG_TYPES[0]).label;
}
