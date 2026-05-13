/* S8 · Full-screen map overlay. */
window.MV = window.MV || {};

/* Topological positions for the 4 locations (percentages within the canvas).
   Spec coords (600,400 / 350,250 / 850,250 / 750,550) translated into a
   resolution-independent layout. */
const POS = {
  lao_song_plaza:       { x: 50, y: 55 },
  north_frost_workshop: { x: 28, y: 35 },
  silent_tower_ruin:    { x: 72, y: 35 },
  warm_valley_farm:     { x: 60, y: 78 },
};

MV.S8 = function S8() {
  const { useState } = React;
  const game = MV.useGame();
  const world = MV.data.cache.world;
  const allAgents = MV.data.cache.agents;
  const time = MV.time.useGameTime({ paused: true });
  const teleportEnabled = !!(game.settings && game.settings.dev && game.settings.dev.teleport);

  const close = () => MV.overlays.close("map");
  const isTop = MV.overlays.useTop() === "map";
  const [hover, setHover] = useState(null);  /* { locId, x, y } */

  MV.keyboard.useKeyDown("escape", () => { if (isTop) close(); }, [isTop]);
  MV.keyboard.useKeyDown("m",      () => { if (isTop) close(); }, [isTop]);

  /* 1-4 teleport (when dev mode enabled). Order: plaza / workshop / farm / tower. */
  const teleportTargets = [
    "lao_song_plaza", "north_frost_workshop", "warm_valley_farm", "silent_tower_ruin",
  ];
  for (let i = 0; i < 4; i++) {
    const key = String(i + 1);
    const target = teleportTargets[i];
    MV.keyboard.useKeyDown(key, () => {
      if (!isTop) return;
      if (!teleportEnabled) {
        MV.toast.show("传送未启用 · 设置 → 开发者");
        return;
      }
      enter(target, /* force */ true);
    }, [isTop, teleportEnabled]);
  }

  const currentId = MV.session.currentLocation ? MV.session.currentLocation() : null;
  const isAdjacent = (id) =>
    !!(MV.session.isAdjacent && MV.session.isAdjacent(id));
  const canEnter = (id) => id !== currentId && (teleportEnabled || isAdjacent(id));

  function enter(id, force) {
    if (!force && !canEnter(id)) return;
    if (MV.session.requestLocation) MV.session.requestLocation(id);
    close();
  }

  /* edges: build from adjacency. Walk both directions but de-dupe. */
  const edges = [];
  const seen = new Set();
  for (const [src, list] of Object.entries(world.adjacency || {})) {
    for (const e of list) {
      const key = [src, e.to].sort().join("|");
      if (seen.has(key)) continue;
      seen.add(key);
      edges.push([src, e.to]);
    }
  }

  /* hover rect: position near the mouse but keep inside canvas */
  const onNodeHover = (locId, evt) => {
    const canvas = evt.currentTarget.parentElement.getBoundingClientRect();
    const localX = evt.clientX - canvas.left;
    const localY = evt.clientY - canvas.top;
    setHover({ locId, x: Math.min(localX + 16, canvas.width - 300), y: Math.min(localY + 16, canvas.height - 200) });
  };
  const onNodeLeave = () => setHover(null);

  /* residents per location */
  const residentsOf = (id) => allAgents.filter(a => a.location === id);

  const hoverLoc = hover ? MV.data.locationById(hover.locId) : null;
  const hoverResidents = hover ? residentsOf(hover.locId) : [];
  const hoverEnterable = hover ? canEnter(hover.locId) : false;

  return (
    <div className="ov-root s8-root">
      <div className="ov-full s8-full anim-fade">

        <header className="ov-head">
          <div className="titles">
            <div className="title">暮谷镇 · 全镇</div>
            <div className="subtitle">现在是 {MV.time.format(time)}</div>
          </div>
          <div className="right">
            <button className="btn ghost sm" onClick={close}>× 关闭 ESC</button>
          </div>
        </header>

        <div className="s8-canvas" onMouseLeave={() => setHover(null)}>
          <div className="s8-compass">
            <span/>          <span>N</span>      <span/>
            <span>W</span>   <span style={{ fontSize: 9 }}>暮谷</span> <span>E</span>
            <span/>          <span>S</span>      <span/>
          </div>

          {/* edges */}
          {edges.map(([a, b], i) => {
            const A = POS[a], B = POS[b];
            if (!A || !B) return null;
            const dx = B.x - A.x, dy = B.y - A.y;
            const len = Math.sqrt(dx * dx + dy * dy);
            const ang = Math.atan2(dy, dx) * (180 / Math.PI);
            return (
              <span
                key={i}
                className="s8-edge"
                style={{
                  left:  A.x + "%",
                  top:   A.y + "%",
                  width: len + "%",
                  transform: `rotate(${ang}deg)`,
                }}
              />
            );
          })}

          {/* nodes */}
          {world.locations.map(loc => {
            const p = POS[loc.id];
            if (!p) return null;
            const here   = loc.id === currentId;
            const count  = residentsOf(loc.id).length;
            return (
              <div
                key={loc.id}
                className={"s8-node" + (here ? " is-current" : "")}
                style={{ left: p.x + "%", top: p.y + "%" }}
                onMouseMove={(e) => onNodeHover(loc.id, e)}
                onMouseLeave={onNodeLeave}
                onClick={() => enter(loc.id, false)}
              >
                <div className="top">
                  <span className="icon">{loc.icon || "◆"}</span>
                  <span className="name">{loc.name}</span>
                </div>
                <span className="short" style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: "var(--ink-3)", letterSpacing: "0.18em" }}>
                  {loc.short}
                </span>
                <div className="sep"/>
                <div className="bot">
                  <span>在场 {count} 人</span>
                  {here && <span className="here">★ 你在这里</span>}
                </div>
              </div>
            );
          })}

          {/* hover details */}
          {hover && hoverLoc && (
            <div
              className={"s8-hover" + (hoverEnterable ? " is-clickable" : "")}
              style={{ left: hover.x, top: hover.y }}
            >
              <div className="name">{hoverLoc.name}</div>
              <div className="desc">{hoverLoc.desc}</div>
              <div className="residents">
                {hoverResidents.length === 0 && (
                  <div className="res-row" style={{ color: "var(--ink-3)" }}>(无人)</div>
                )}
                {hoverResidents.map(a => (
                  <div key={a.id} className="res-row">
                    <span className="av sm">{a.letter}</span>
                    <span>{a.name} · {a.role}</span>
                  </div>
                ))}
              </div>
              <div className="actions">
                <button
                  className={"btn sm" + (hoverEnterable ? " primary" : " disabled")}
                  disabled={!hoverEnterable}
                  onClick={(e) => { e.stopPropagation(); enter(hoverLoc.id, false); }}
                >[E] 进入</button>
              </div>
            </div>
          )}
        </div>

        <footer className="ov-foot">
          <span className="mono">
            当前位置 · {currentId ? (MV.data.locationById(currentId) || {}).name : "—"}
          </span>
          <span className="mono">
            {teleportEnabled ? "✓ 1-4 传送已启用" : "传送未启用"}
          </span>
          <span className="mono">{MV.time.shortClock(time)}</span>
        </footer>
      </div>
    </div>
  );
};
