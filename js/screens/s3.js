/* S3 · Main screen.
   - rAF loop drives WASD/arrow player movement & edge detection.
   - useGameTime() advances clock when no overlay is open.
   - Selection: click an NPC, or auto-select when within 100px.
   - Location switch: press E on an active edge → fade + appear at back-wall.
   - ESC opens the S12 pause overlay (handled inside S12 itself).
   - Hotkeys mapped to overlays: M → S8 map, F1 → S14 help, settings/saves
     are opened from S12 or from the topbar buttons.
   - 1-4 dev-mode teleport (gated by settings.dev.teleport).
   - Publishes a live snapshot to MV.saves for the Saves overlay. */
window.MV = window.MV || {};

(function () {
  const { useState, useEffect, useRef, useMemo, useCallback } = React;

  const PLAYER_SPEED      = 2.5;
  const SELECT_RADIUS     = 100;
  const EDGE_THRESHOLD    = 40;
  const SPRITE_INSET      = 60;
  const PLAYER_BOUND_PAD  = 30;

  /* ---------- helpers ---------- */
  function spawnPosForEntry(rect, fromDir) {
    const w = rect.w, h = rect.h;
    const cx = w / 2, cy = h / 2;
    if (fromDir === "north") return { x: cx,         y: SPRITE_INSET };
    if (fromDir === "south") return { x: cx,         y: h - SPRITE_INSET };
    if (fromDir === "west")  return { x: SPRITE_INSET, y: cy };
    if (fromDir === "east")  return { x: w - SPRITE_INSET, y: cy };
    return { x: cx, y: cy };
  }
  function computeNpcPositions(locationId, npcs, rect) {
    const layout = MV.NPC_LAYOUTS[locationId] || [];
    return npcs.map((agent, i) => {
      const spot = layout[i] || { x: 0.5, y: 0.5 };
      return { agent, x: Math.round(spot.x * rect.w), y: Math.round(spot.y * rect.h) };
    });
  }
  function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
  function nextEventId() { nextEventId.n = (nextEventId.n || 0) + 1; return nextEventId.n; }

  /* ---------- main component ---------- */
  MV.S3 = function S3() {
    const game = MV.useGame();
    const world = MV.data.cache.world;
    const allAgents = MV.data.cache.agents;

    const playerAgent = useMemo(() => {
      return (game.playingAs && MV.data.agentById(game.playingAs))
          || MV.data.agentById("a04");
    }, [game.playingAs]);

    /* If a save is being restored, prefer its location + position over the
       agent default. pendingRestore is set by S9.read and cleared after use. */
    const restoreOnMount = MV.saves.pendingRestore || null;
    if (restoreOnMount) MV.saves.pendingRestore = null;

    const [collapsedEvents, setCollapsed] = useState(false);
    const [selectedId, setSelectedId]     = useState(null);
    const [stageRect, setStageRect]       = useState({ w: 1000, h: 700 });
    const [locationId, setLocationId]     = useState(() => restoreOnMount?.location || playerAgent.location);
    const [playerPos, setPlayerPos]       = useState(() => restoreOnMount?.playerPos || { x: 500, y: 350 });
    const [activeEdge, setActiveEdge]     = useState(null);
    const [fadeKey, setFadeKey]           = useState(0);
    const [events, setEvents]             = useState(() => ([
      { id: nextEventId(), kind: "divider", text: "—— 新的一天 ——" },
    ]));

    /* Pause when any overlay is open. */
    const overlayStack = MV.overlays.useStack();
    const overlayOpen  = overlayStack.length > 0;
    const paused = overlayOpen;
    const time = MV.time.useGameTime({ paused });

    /* refs for rAF / handlers */
    const pausedRef = useRef(paused);
    const stageRectRef = useRef(stageRect);
    const playerPosRef = useRef(playerPos);
    const locRef = useRef(locationId);
    const edgesRef = useRef([]);
    const activeEdgeRef = useRef(null);
    const selectedIdRef = useRef(null);
    useEffect(() => { pausedRef.current = paused; },     [paused]);
    useEffect(() => { stageRectRef.current = stageRect; },[stageRect]);
    useEffect(() => { playerPosRef.current = playerPos; },[playerPos]);
    useEffect(() => { locRef.current = locationId; },    [locationId]);
    useEffect(() => { activeEdgeRef.current = activeEdge; }, [activeEdge]);
    useEffect(() => { selectedIdRef.current = selectedId; }, [selectedId]);

    /* derived NPCs / edges */
    const npcs = useMemo(() => {
      const here = allAgents.filter(a => a.location === locationId && a.id !== playerAgent.id);
      return computeNpcPositions(locationId, here, stageRect);
    }, [allAgents, locationId, playerAgent.id, stageRect]);

    const edges = useMemo(() => {
      const list = (world.adjacency && world.adjacency[locationId]) || [];
      return list.map(e => ({ dir: e.dir, target: MV.data.locationById(e.to), targetId: e.to }));
    }, [world, locationId]);
    useEffect(() => { edgesRef.current = edges; }, [edges]);

    /* ---------- arrival event on each location switch ---------- */
    const lastLogged = useRef(null);
    useEffect(() => {
      if (lastLogged.current === locationId) return;
      lastLogged.current = locationId;
      const ts = MV.time.shortClock(time);
      setEvents(prev => {
        const here = MV.data.locationById(locationId);
        return [...prev, {
          id: nextEventId(),
          kind: "me",
          ts,
          text: `你 进入 ${here ? here.name : locationId}`,
        }];
      });
    }, [locationId]);

    /* ---------- AUTO save on initial mount ---------- */
    const didAutoSave = useRef(false);
    useEffect(() => {
      if (didAutoSave.current) return;
      didAutoSave.current = true;
      const here = MV.data.locationById(locationId);
      MV.saves.upsertAuto({
        agent: playerAgent,
        gameTime: time,
        location: locationId,
        playerPos: playerPosRef.current,
        chips: [`初次到达 ${here ? here.name : locationId}`],
      });
      /* eslint-disable-next-line */
    }, []);

    /* ---------- publish session callbacks ---------- */
    const switchLocationRef = useRef(null);
    useEffect(() => {
      MV.session.requestLocation = (id) => {
        if (switchLocationRef.current) switchLocationRef.current(id);
      };
      MV.session.isAdjacent = (id) => {
        const list = (world.adjacency && world.adjacency[locRef.current]) || [];
        return list.some(e => e.to === id);
      };
      MV.session.currentLocation = () => locRef.current;
      return () => {
        MV.session.requestLocation = null;
        MV.session.isAdjacent = null;
        MV.session.currentLocation = null;
      };
    }, [world]);

    /* ---------- publish live snapshot for the saves overlay ---------- */
    useEffect(() => {
      MV.saves.captureLive({
        agent: playerAgent,
        gameTime: time,
        location: locationId,
        playerPos,
      });
    }, [playerAgent, time, locationId, playerPos]);

    /* ---------- measure stage ---------- */
    const stageEl = useRef(null);
    const onStageMount = useCallback((el) => {
      stageEl.current = el;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setStageRect({ w: r.width, h: r.height });
    }, []);
    useEffect(() => {
      const onResize = () => {
        if (!stageEl.current) return;
        const r = stageEl.current.getBoundingClientRect();
        setStageRect({ w: r.width, h: r.height });
      };
      window.addEventListener("resize", onResize);
      return () => window.removeEventListener("resize", onResize);
    }, []);

    /* center player on first measure (unless restored) */
    useEffect(() => {
      if (restoreOnMount?.playerPos) return;
      setPlayerPos(p => {
        if (p.x === 500 && p.y === 350) {
          return { x: Math.round(stageRect.w / 2), y: Math.round(stageRect.h / 2) };
        }
        return p;
      });
      /* eslint-disable-next-line */
    }, [stageRect.w, stageRect.h]);

    /* ---------- movement loop ---------- */
    useEffect(() => {
      let raf;
      const step = () => {
        if (!pausedRef.current) {
          const kb = MV.keyboard;
          let dx = 0, dy = 0;
          if (kb.isDown("w") || kb.isDown("up"))    dy -= 1;
          if (kb.isDown("s") || kb.isDown("down"))  dy += 1;
          if (kb.isDown("a") || kb.isDown("left"))  dx -= 1;
          if (kb.isDown("d") || kb.isDown("right")) dx += 1;
          if (dx !== 0 || dy !== 0) {
            const len = Math.hypot(dx, dy);
            dx = (dx / len) * PLAYER_SPEED;
            dy = (dy / len) * PLAYER_SPEED;
            const r = stageRectRef.current;
            const p = playerPosRef.current;
            const next = {
              x: Math.max(PLAYER_BOUND_PAD, Math.min(r.w - PLAYER_BOUND_PAD, p.x + dx)),
              y: Math.max(PLAYER_BOUND_PAD, Math.min(r.h - PLAYER_BOUND_PAD, p.y + dy)),
            };
            if (next.x !== p.x || next.y !== p.y) {
              playerPosRef.current = next;
              setPlayerPos(next);
            }
          }
          /* edge detection */
          const r = stageRectRef.current;
          const p = playerPosRef.current;
          let nearest = null;
          for (const e of edgesRef.current) {
            let d;
            if (e.dir === "north") d = p.y;
            else if (e.dir === "south") d = r.h - p.y;
            else if (e.dir === "west")  d = p.x;
            else                        d = r.w - p.x;
            if (d < EDGE_THRESHOLD && (nearest == null || d < nearest.d)) {
              nearest = { dir: e.dir, d };
            }
          }
          setActiveEdge(prev => (nearest ? nearest.dir : null) === prev ? prev : (nearest ? nearest.dir : null));
        }
        raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
      return () => cancelAnimationFrame(raf);
    }, []);

    /* ---------- auto-select nearest NPC ---------- */
    useEffect(() => {
      if (paused) return;
      let near = null;
      for (const n of npcs) {
        const d = dist(playerPos, { x: n.x, y: n.y });
        if (d <= SELECT_RADIUS && (near == null || d < near.d)) {
          near = { id: n.agent.id, d };
        }
      }
      if (near && near.id !== selectedId) setSelectedId(near.id);
    }, [playerPos, npcs, paused, selectedId]);

    /* ---------- location switch (used by E key + S8 + 1-4 teleport) ---------- */
    function switchLocation(toId) {
      const from = locRef.current;
      if (toId === from) return;
      const adj = (world.adjacency[toId] || []).find(e => e.to === from);
      const back = adj ? adj.dir : null;
      const r = stageRectRef.current;
      const next = spawnPosForEntry(r, back);
      setLocationId(toId);
      playerPosRef.current = next;
      setPlayerPos(next);
      setActiveEdge(null);
      setSelectedId(null);
      setFadeKey(k => k + 1);
    }
    useEffect(() => { switchLocationRef.current = switchLocation; });

    /* ---------- key bindings (only fire when no overlay is open) ---------- */
    const noOverlay = !overlayOpen;

    MV.keyboard.useKeyDown("escape", () => {
      if (overlayOpen) return;     /* the overlay's own handler will take it */
      MV.overlays.push("pause");
    }, [overlayOpen]);

    MV.keyboard.useKeyDown("e", () => {
      if (!noOverlay) return;
      const edge = activeEdgeRef.current;
      if (!edge) {
        if (selectedIdRef.current) MV.toast.show("S11 对话 UI 将在下个 PR 实装");
        return;
      }
      const target = edgesRef.current.find(x => x.dir === edge);
      if (target) switchLocation(target.targetId);
    }, [noOverlay]);

    MV.keyboard.useKeyDown("q", () => {
      if (!noOverlay) return;
      if (!selectedIdRef.current) return;
      MV.toast.show("S4 读心抽屉将在下个 PR 实装");
    }, [noOverlay]);

    MV.keyboard.useKeyDown("m",  () => { if (noOverlay) MV.overlays.push("map");  }, [noOverlay]);
    MV.keyboard.useKeyDown("f1", () => { if (noOverlay) MV.overlays.push("help"); }, [noOverlay]);
    MV.keyboard.useKeyDown("c",  () => { if (noOverlay) MV.toast.show("S7 属性面板将在下个 PR 实装"); }, [noOverlay]);
    MV.keyboard.useKeyDown("tab",() => { if (noOverlay) MV.toast.show("S5 关系网将在下个 PR 实装"); }, [noOverlay]);

    /* dev-mode teleport: 1=plaza, 2=workshop, 3=farm, 4=tower */
    const teleEnabled = !!(game.settings && game.settings.dev && game.settings.dev.teleport);
    const TARGETS = ["lao_song_plaza", "north_frost_workshop", "warm_valley_farm", "silent_tower_ruin"];
    for (let i = 0; i < 4; i++) {
      const k = String(i + 1);
      const target = TARGETS[i];
      MV.keyboard.useKeyDown(k, () => {
        if (!noOverlay) return;
        if (!teleEnabled) {
          /* in non-dev mode the digit keys are inert */
          return;
        }
        const loc = MV.data.locationById(target);
        MV.toast.show(`传送 → ${loc.name}`);
        switchLocation(target);
      }, [noOverlay, teleEnabled]);
    }

    /* ---------- selected derived ---------- */
    const selectedAgent = selectedId ? MV.data.agentById(selectedId) : null;
    const inRange = useMemo(() => {
      if (!selectedAgent) return false;
      const n = npcs.find(x => x.agent.id === selectedAgent.id);
      if (!n) return false;
      return dist(playerPos, { x: n.x, y: n.y }) <= SELECT_RADIUS;
    }, [selectedAgent, npcs, playerPos]);

    const currentLocation = MV.data.locationById(locationId);

    /* topbar buttons: open the corresponding overlays */
    const onTogglePause = () => {
      if (MV.overlays.has("pause")) MV.overlays.close("pause");
      else                          MV.overlays.push("pause");
    };
    const openSettings = () => MV.overlays.push("settings");
    const openMap      = () => MV.overlays.push("map");

    return (
      <div className="s3-root">

        <MV.components.Topbar
          time={time}
          paused={paused}
          onTogglePause={onTogglePause}
          onSettings={openSettings}
          onRelations={() => MV.toast.show("S5 关系网将在下个 PR 实装")}
          onMap={openMap}
        />

        <div className="s3-main">
          <MV.components.Stage
            fadeKey={fadeKey}
            location={currentLocation}
            playerLetter={playerAgent.letter}
            playerPos={playerPos}
            npcs={npcs}
            selectedId={selectedId}
            edges={edges}
            activeEdge={activeEdge}
            onNpcClick={(id) => setSelectedId(id)}
            onMount={onStageMount}
          >
            <MV.components.Minimap
              locations={world.locations}
              currentId={locationId}
            />

            <MV.components.NpcInfoCard
              agent={selectedAgent}
              inRange={inRange}
              onClose={() => setSelectedId(null)}
            />
          </MV.components.Stage>

          <MV.components.EventStream
            events={events}
            collapsed={collapsedEvents}
            onToggle={() => setCollapsed(c => !c)}
          />
        </div>

        {/* Overlay stack: rendered above everything else. Topbar still
            visible so the clock keeps reading "paused" — feels intentional. */}
        {overlayStack.includes("pause")    && <MV.S12 />}
        {overlayStack.includes("settings") && <MV.S10 />}
        {overlayStack.includes("map")      && <MV.S8  />}
        {overlayStack.includes("saves")    && <MV.S9  />}
        {overlayStack.includes("help")     && <MV.S14 />}

        <MV.toast.Host />
      </div>
    );
  };
})();
