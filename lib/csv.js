// 의존성 없는 CSV 파서 / 생성기 — 헤더: date,value,note (한글 날짜/값/메모 도 인식)

export function parseCSV(text) {
  const rows = [];
  const lines = String(text).replace(/\r\n?/g, '\n').split('\n').filter(l => l.trim() !== '');
  if (!lines.length) return rows;

  const first = splitLine(lines[0]).map(s => s.trim().toLowerCase());
  let startIdx = 0;
  let dateIdx = 0, valIdx = 1, noteIdx = 2;
  const looksHeader = first.some(h => ['date', '날짜', 'value', '값', 'amount', 'note', '메모'].includes(h));
  if (looksHeader) {
    startIdx = 1;
    const di = first.findIndex(h => h === 'date' || h === '날짜');
    const vi = first.findIndex(h => h === 'value' || h === '값' || h === 'amount');
    const ni = first.findIndex(h => h === 'note' || h === '메모');
    if (di >= 0) dateIdx = di;
    if (vi >= 0) valIdx = vi;
    if (ni >= 0) noteIdx = ni;
  }

  for (let i = startIdx; i < lines.length; i++) {
    const cells = splitLine(lines[i]);
    const date = normalizeDate(cells[dateIdx]);
    const value = Number(String(cells[valIdx] ?? '').replace(/[, ₩]/g, ''));
    if (!date || isNaN(value)) continue;
    rows.push({ date, value, note: (cells[noteIdx] || '').trim() });
  }
  return rows;
}

function splitLine(line) {
  const out = [];
  let cur = '';
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) {
      if (c === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; }
        else q = false;
      } else cur += c;
    } else {
      if (c === '"') q = true;
      else if (c === ',') { out.push(cur); cur = ''; }
      else cur += c;
    }
  }
  out.push(cur);
  return out;
}

function normalizeDate(s) {
  if (!s) return null;
  const t = String(s).trim().replace(/[./]/g, '-');
  const m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (!m) return null;
  return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
}

export function toCSV(records) {
  const head = 'date,value,note';
  const body = (records || [])
    .slice()
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .map(r => `${r.date},${r.value},${csvCell(r.note || '')}`)
    .join('\n');
  return body ? `${head}\n${body}` : head;
}

function csvCell(s) {
  s = String(s);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// 브라우저에서 CSV 파일 다운로드
export function downloadCSV(filename, text) {
  const blob = new Blob(['﻿' + text], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
