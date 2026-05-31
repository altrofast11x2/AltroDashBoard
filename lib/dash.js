// AltroDashBoard Firebase Realtime DB helpers — 모든 노드는 `dash_` 프리픽스 사용
import {
  ref, get, set, update, push, remove, query, orderByChild, equalTo,
} from 'firebase/database';
import { db } from './firebase';
import { hashPassword } from './security';

// Altro 패밀리 계정 노드 — board=users, shop=shop_users, todo=todo_users.
// 해시 포맷(`v1$email$plain`)이 모두 동일하므로 어느 노드에서든 이메일+해시가 맞으면 인증.
const FAMILY_NODES = [
  { node: 'users', source: 'altroboard' },
  { node: 'shop_users', source: 'altroshop' },
  { node: 'todo_users', source: 'altrotodo' },
];

// ───────── USERS ─────────
export async function findUserByEmail(email) {
  const lower = String(email || '').toLowerCase();
  try {
    const snap = await get(query(ref(db, 'dash_users'), orderByChild('email'), equalTo(lower)));
    if (!snap.exists()) return null;
    const [uid, u] = Object.entries(snap.val())[0];
    return { uid, ...u };
  } catch (e) {
    console.warn('[AltroDashBoard] dash_users 조회 실패 (Firebase 규칙 미게시 가능성):', e?.message || e);
    return null;
  }
}

export async function loginUser(email, password) {
  const lower = String(email || '').toLowerCase();
  const hashed = await hashPassword(password, lower);

  // 1) AltroDashBoard 자체 회원
  const own = await findUserByEmail(lower);
  if (own && own.password === hashed) {
    return { id: own.uid, name: own.name, email: own.email, source: 'dash' };
  }

  // 2) Altro 패밀리 통합 로그인 — board(users)/shop(shop_users)/todo(todo_users) 노드에서
  //    같은 이메일+해시가 있으면 자동 인증. 이 노드들은 이미 읽기 허용이라 규칙 게시 전에도 동작.
  for (const { node, source } of FAMILY_NODES) {
    try {
      const snap = await get(query(ref(db, node), orderByChild('email'), equalTo(lower)));
      if (!snap.exists()) continue;
      for (const [uid, u] of Object.entries(snap.val())) {
        if (!u || typeof u.password !== 'string') continue;
        if (u.password !== hashed) continue;
        // dash_users 미러 생성 (권한 없으면 무시 — 메모리 세션만)
        try {
          const mirror = await get(ref(db, `dash_users/${uid}`));
          if (!mirror.exists()) {
            await set(ref(db, `dash_users/${uid}`), {
              name: u.name || '익명',
              email: lower,
              password: hashed,
              linkedFrom: source,
              createdAt: u.createdAt || new Date().toISOString(),
              linkedAt: new Date().toISOString(),
            });
          }
        } catch (e) {
          console.warn('[AltroDashBoard] dash_users 미러 생성 실패 — Firebase 규칙 게시 필요:', e?.message || e);
        }
        return { id: uid, name: u.name || '익명', email: lower, source };
      }
    } catch (e) {
      console.warn(`[AltroDashBoard] ${node} 조회 실패:`, e?.message || e);
    }
  }

  return null;
}

export async function registerUser(name, email, password) {
  const lower = String(email).toLowerCase();
  if (await findUserByEmail(lower)) return { error: '이미 가입된 이메일입니다. 로그인 해주세요.' };

  // Altro 패밀리(board/shop/todo)에 이미 있으면 기존 비밀번호로 바로 로그인하도록 안내
  for (const { node } of FAMILY_NODES) {
    try {
      const snap = await get(query(ref(db, node), orderByChild('email'), equalTo(lower)));
      if (snap.exists()) {
        return { error: '이미 Altro 패밀리(AltroBoard·Shop·Todo)에 가입된 이메일입니다. 기존 비밀번호로 바로 로그인 해주세요.' };
      }
    } catch {}
  }

  const hashed = await hashPassword(password, lower);
  const newRef = push(ref(db, 'dash_users'));
  await set(newRef, { name, email: lower, password: hashed, createdAt: new Date().toISOString() });
  return { id: newRef.key, name, email: lower };
}

export async function getUser(uid) {
  try {
    const snap = await get(ref(db, `dash_users/${uid}`));
    if (!snap.exists()) return null;
    return { id: uid, ...snap.val() };
  } catch { return null; }
}

// ───────── DATASETS (데이터셋) ─────────
export async function listDatasets(uid) {
  if (!uid) return [];
  try {
    const snap = await get(ref(db, `dash_datasets/${uid}`));
    if (!snap.exists()) return [];
    return Object.entries(snap.val())
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
  } catch (e) {
    console.warn('[AltroDashBoard] listDatasets 실패:', e?.message || e);
    return [];
  }
}

export async function addDataset(uid, data) {
  const newRef = push(ref(db, `dash_datasets/${uid}`));
  const ds = {
    name: String(data.name || '').trim() || '새 데이터셋',
    unit: data.unit || '',
    color: data.color || '#c0392b',
    chartType: data.chartType || 'line',
    agg: data.agg || 'sum',
    createdAt: new Date().toISOString(),
  };
  await set(newRef, ds);
  return { id: newRef.key, ...ds };
}

export async function updateDataset(uid, id, patch) {
  await update(ref(db, `dash_datasets/${uid}/${id}`), patch);
}

// 데이터셋 삭제 시 해당 레코드도 함께 삭제
export async function deleteDataset(uid, id) {
  await remove(ref(db, `dash_datasets/${uid}/${id}`));
  await remove(ref(db, `dash_records/${uid}/${id}`));
}

// ───────── RECORDS (기록) ─────────
export async function listRecords(uid, dsId) {
  if (!uid || !dsId) return [];
  try {
    const snap = await get(ref(db, `dash_records/${uid}/${dsId}`));
    if (!snap.exists()) return [];
    return Object.entries(snap.val()).map(([id, v]) => ({ id, ...v }));
  } catch { return []; }
}

// 여러 데이터셋의 레코드를 한 번에 (대시보드용) → { dsId: [records] }
export async function listAllRecords(uid, datasets) {
  const out = {};
  await Promise.all((datasets || []).map(async ds => {
    out[ds.id] = await listRecords(uid, ds.id);
  }));
  return out;
}

export async function addRecord(uid, dsId, data) {
  const newRef = push(ref(db, `dash_records/${uid}/${dsId}`));
  const rec = {
    date: data.date,
    value: Number(data.value),
    note: data.note || '',
    createdAt: new Date().toISOString(),
  };
  await set(newRef, rec);
  return { id: newRef.key, ...rec };
}

// CSV 일괄 등록
export async function addRecordsBulk(uid, dsId, rows) {
  const baseRef = ref(db, `dash_records/${uid}/${dsId}`);
  const updates = {};
  for (const r of rows) {
    const k = push(baseRef).key;
    updates[k] = {
      date: r.date,
      value: Number(r.value),
      note: r.note || '',
      createdAt: new Date().toISOString(),
    };
  }
  if (Object.keys(updates).length) await update(baseRef, updates);
  return Object.keys(updates).length;
}

export async function updateRecord(uid, dsId, id, patch) {
  await update(ref(db, `dash_records/${uid}/${dsId}/${id}`), patch);
}

export async function deleteRecord(uid, dsId, id) {
  await remove(ref(db, `dash_records/${uid}/${dsId}/${id}`));
}

// ───────── LAYOUT / SETTINGS (4단계) ─────────
export async function getLayout(uid) {
  if (!uid) return null;
  try {
    const snap = await get(ref(db, `dash_layout/${uid}`));
    return snap.exists() ? snap.val() : null;
  } catch { return null; }
}

export async function saveLayout(uid, layout) {
  await set(ref(db, `dash_layout/${uid}`), layout);
}

export async function getSettings(uid) {
  if (!uid) return null;
  try {
    const snap = await get(ref(db, `dash_settings/${uid}`));
    return snap.exists() ? snap.val() : null;
  } catch { return null; }
}

export async function saveSettings(uid, settings) {
  await update(ref(db, `dash_settings/${uid}`), settings);
}
