// 환율 — open.er-api.com (키 불필요). USD 기준 → KRW 교차환율 계산.
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const r = await fetch('https://open.er-api.com/v6/latest/USD', { next: { revalidate: 600 } });
    const j = await r.json();
    const rates = j.rates || {};
    const krw = rates.KRW;
    if (!krw) return Response.json({ ok: false, error: 'no KRW rate' });
    const cross = (code: string) => (rates[code] ? krw / rates[code] : null);
    const pairs = [
      { code: 'USD', label: '미국 달러', krw, flag: '$' },
      { code: 'EUR', label: '유로', krw: cross('EUR'), flag: '€' },
      { code: 'JPY100', label: '일본 엔 (100)', krw: cross('JPY') ? cross('JPY')! * 100 : null, flag: '¥' },
      { code: 'CNY', label: '중국 위안', krw: cross('CNY'), flag: '¥' },
    ];
    return Response.json({ ok: true, pairs, updated: j.time_last_update_utc || null });
  } catch (e: any) {
    return Response.json({ ok: false, error: String(e?.message || e) });
  }
}
