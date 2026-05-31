// 날씨 — Open-Meteo (키 불필요). 현재 날씨 + 시간별 기온.
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get('lat') || '37.5665';
  const lon = searchParams.get('lon') || '126.9780';
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}`
    + `&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m`
    + `&hourly=temperature_2m&forecast_days=1&timezone=Asia%2FSeoul`;
  try {
    const r = await fetch(url, { next: { revalidate: 300 } });
    const j = await r.json();
    return Response.json({
      ok: true,
      current: j.current || null,
      hourly: { time: j.hourly?.time || [], temp: j.hourly?.temperature_2m || [] },
    });
  } catch (e: any) {
    return Response.json({ ok: false, error: String(e?.message || e) });
  }
}
