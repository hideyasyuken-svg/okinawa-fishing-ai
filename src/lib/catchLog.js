// src/lib/catchLog.js
const KEY = "okf_catchlog_v1";

export function loadCatchLog() {
  try {
    const s = localStorage.getItem(KEY);
    const arr = s ? JSON.parse(s) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function saveCatchLog(list) {
  localStorage.setItem(KEY, JSON.stringify(list));
}

export function addCatch(entry) {
  const list = loadCatchLog();
  const next = [{ ...entry, id: crypto.randomUUID?.() ?? String(Date.now()) }, ...list].slice(0, 200);
  saveCatchLog(next);
  return next;
}

export function removeCatch(id) {
  const list = loadCatchLog();
  const next = list.filter((x) => x.id !== id);
  saveCatchLog(next);
  return next;
}