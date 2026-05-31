// 외부 API 클라이언트 — 내부 프록시 라우트(/api/*)를 호출해 CORS 회피.

export async function fetchWeather(lat = '37.5665', lon = '126.9780') {
  try {
    const r = await fetch(`/api/weather?lat=${lat}&lon=${lon}`);
    return await r.json();
  } catch (e) { return { ok: false, error: String(e) }; }
}

export async function fetchExchange() {
  try {
    const r = await fetch('/api/exchange');
    return await r.json();
  } catch (e) { return { ok: false, error: String(e) }; }
}

export async function fetchCrypto() {
  try {
    const r = await fetch('/api/crypto');
    return await r.json();
  } catch (e) { return { ok: false, error: String(e) }; }
}

// 서울 등 프리셋 도시
export const CITIES = [
  { name: '서울', lat: '37.5665', lon: '126.9780' },
  { name: '부산', lat: '35.1796', lon: '129.0756' },
  { name: '제주', lat: '33.4996', lon: '126.5312' },
  { name: '도쿄', lat: '35.6762', lon: '139.6503' },
  { name: '뉴욕', lat: '40.7128', lon: '-74.0060' },
];

// Open-Meteo WMO weather code → 한글 설명
export const WMO = {
  0: '맑음', 1: '대체로 맑음', 2: '부분 흐림', 3: '흐림',
  45: '안개', 48: '서리 안개',
  51: '약한 이슬비', 53: '이슬비', 55: '강한 이슬비',
  56: '어는 이슬비', 57: '강한 어는 이슬비',
  61: '약한 비', 63: '비', 65: '강한 비',
  66: '어는 비', 67: '강한 어는 비',
  71: '약한 눈', 73: '눈', 75: '강한 눈', 77: '싸락눈',
  80: '약한 소나기', 81: '소나기', 82: '강한 소나기',
  85: '약한 눈 소나기', 86: '강한 눈 소나기',
  95: '뇌우', 96: '뇌우 (우박)', 99: '강한 뇌우 (우박)',
};

export function wmoDesc(code) {
  return WMO[code] ?? '–';
}
