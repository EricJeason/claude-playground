/* Save-slot CRUD over localStorage.mv_saves.
   Schema:
     {
       id:        'auto' | 'save_<ts>'   // 'auto' is the singleton auto-save
       kind:      'auto' | 'manual'
       name:      character display name        (e.g. '艾琳')
       role:      character role                (e.g. '客居研究员')
       gameTime:  { day, hour, minute }
       location:  location id
       chips:     string[]                      // short labels for the card
       savedAt:   epoch ms
       snapshot:  { playingAs, gameTime, location, playerPos }  // minimum v0.3
     }
   We cap at 1 auto + 4 manual = 5 visible slots. The Save panel renders
   any empty slots itself; this lib only stores rows that exist. */
window.MV = window.MV || {};

MV.saves = (function () {
  const K = "mv_saves";
  const MAX_MANUAL = 4;

  function read() {
    try {
      const raw = localStorage.getItem(K);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch { return []; }
  }
  function write(arr) {
    try { localStorage.setItem(K, JSON.stringify(arr)); } catch { /* quota */ }
  }

  function listAll()  { return read(); }
  function getAuto()  { return read().find(s => s.kind === "auto") || null; }
  function getById(id){ return read().find(s => s.id === id) || null; }
  function manualSlots() {
    /* sorted newest-first */
    return read().filter(s => s.kind === "manual")
                 .sort((a, b) => b.savedAt - a.savedAt);
  }

  /* slotCount returns at most 5: 1 auto + 4 manual. */
  function visibleSlots() {
    const auto = getAuto();
    const manual = manualSlots().slice(0, MAX_MANUAL);
    const slots = [];
    slots.push(auto || null);
    for (let i = 0; i < MAX_MANUAL; i++) slots.push(manual[i] || null);
    return slots;
  }

  function makeRow({ kind, agent, gameTime, location, playerPos, chips }) {
    const id = kind === "auto" ? "auto" : "save_" + Date.now();
    return {
      id,
      kind,
      name: agent ? agent.name : "未知",
      role: agent ? agent.role : "",
      gameTime: { ...gameTime },
      location,
      chips: chips || [],
      savedAt: Date.now(),
      snapshot: {
        playingAs: agent ? agent.id : null,
        gameTime: { ...gameTime },
        location,
        playerPos: playerPos ? { ...playerPos } : null,
      },
    };
  }

  function upsertAuto(payload) {
    const row = makeRow({ ...payload, kind: "auto" });
    const all = read().filter(s => s.kind !== "auto");
    all.unshift(row);
    write(all);
    return row;
  }

  function createManual(payload) {
    const row = makeRow({ ...payload, kind: "manual" });
    /* drop oldest manual if at cap */
    const all = read();
    const manual = all.filter(s => s.kind === "manual")
                     .sort((a, b) => b.savedAt - a.savedAt);
    if (manual.length >= MAX_MANUAL) {
      const dropId = manual[manual.length - 1].id;
      const kept = all.filter(s => s.id !== dropId);
      kept.push(row);
      write(kept);
    } else {
      all.push(row);
      write(all);
    }
    return row;
  }

  function overwrite(id, payload) {
    const all = read();
    const idx = all.findIndex(s => s.id === id);
    if (idx === -1) return null;
    const kind = all[idx].kind;
    if (kind === "auto") {
      all[idx] = makeRow({ ...payload, kind: "auto" });
    } else {
      const fresh = makeRow({ ...payload, kind: "manual" });
      fresh.id = id;                    // keep id stable on overwrite
      all[idx] = fresh;
    }
    write(all);
    return all[idx];
  }

  function remove(id) {
    const all = read();
    if (!all.find(s => s.id === id)) return false;
    if (id === "auto") return false;   /* AUTO is undeletable */
    write(all.filter(s => s.id !== id));
    return true;
  }

  function clear() { write([]); }

  function formatRelative(ts) {
    const diff = Date.now() - ts;
    if (diff < 60_000)        return "刚刚";
    if (diff < 3600_000)      return `${Math.floor(diff / 60_000)} 分钟前`;
    if (diff < 86_400_000)    return `${Math.floor(diff / 3600_000)} 小时前`;
    return `${Math.floor(diff / 86_400_000)} 天前`;
  }
  function formatAbsolute(ts) {
    const d = new Date(ts);
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  /* Live-state stash: S3 calls captureLive() whenever its state changes so
     that S9 (which is an overlay sibling, not a child of S3) can read the
     current game state when the user clicks "新建存档" / "覆盖". */
  let live = null;
  function captureLive(payload) { live = payload; }
  function readLive() { return live; }

  return {
    listAll, getAuto, getById, manualSlots, visibleSlots,
    upsertAuto, createManual, overwrite, remove, clear,
    formatRelative, formatAbsolute,
    captureLive, readLive,
    MAX_MANUAL,
  };
})();
