// 암호화폐 — Upbit 공개 시세 API (키 불필요). 원화 마켓 현재가 + 24h 변동률.
export const dynamic = 'force-dynamic';

const MARKETS = 'KRW-BTC,KRW-ETH,KRW-XRP,KRW-SOL';
const NAMES: Record<string, string> = {
  'KRW-BTC': '비트코인', 'KRW-ETH': '이더리움', 'KRW-XRP': '리플', 'KRW-SOL': '솔라나',
};

export async function GET() {
  try {
    const r = await fetch(`https://api.upbit.com/v1/ticker?markets=${MARKETS}`, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 60 },
    });
    const j = await r.json();
    if (!Array.isArray(j)) return Response.json({ ok: false, error: 'bad response' });
    const coins = j.map((t: any) => ({
      market: t.market,
      symbol: String(t.market).replace('KRW-', ''),
      name: NAMES[t.market] || t.market,
      price: t.trade_price,
      change: (t.signed_change_rate || 0) * 100,
    }));
    return Response.json({ ok: true, coins });
  } catch (e: any) {
    return Response.json({ ok: false, error: String(e?.message || e) });
  }
}
