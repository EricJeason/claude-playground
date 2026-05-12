/* S3 · Main screen.
   - Layout: <Topbar/> + (<Stage/> + <EventStream/>) + overlays.
   - rAF loop drives WASD/arrow player movement & edge detection.
   - useGameTime() advances clock when not paused.
   - Selection: click an NPC, or auto-select when within 100px.
   - Location switch: press E on an active edge → fade + appear at back-wall.
   - ESC / pause button: half-overlay; movement & time stop. */
window.MV = window.MV || {};

(function () {
  const { useState, useEffect, useRef, useMemo, useCallback } = React;

  const PLAYER_SPEED      = 2.5;     // px / frame at 60fps
  const SELECT_RADIUS     = 100;     // auto-select distance to an NPC
  const EDGE_THRESHOLD    = 40;      // distance from wall to trigger edge prompt
  const SPRITE_INSET      = 60;      // keep the player off the very wall when spawning
  const PLAYER_BOUND_PAD  = 30;      // wall padding to clamp the player
  const NPC_SPACING_PX    = 220;     // for layout fallback (unused right now)

  const DIRS = ["north", "south", "east", "west"];

  /* --------------- helpers --------------- */

  function spawnPosForEntry(rect, fromDir) {
    /* fromDir = the direction the *new* location's exit points back the way we came.
       Player should appear on that wall, slightly inset. */
    const w = rect.w, h = rect.h;
    const cx = w / 2, cy = h / 2;
    if (fromDir === "north") return { x: cx,                       y: SPRITE_INSET };
    if (fromDir === "south") return { x: cx,                       y: h - SPRITE_INSET };
    if (fromDir === "west")  return { x: SPRITE_INSET,             y: cy };
    if (fromDir === "east")  return { x: w - SPRITE_INSET,         y: cy };
    return { x: cx, y: cy };
  }

  function computeNpcPositions(locationId, npcs, rect) {
    const layout = MV.NPC_LAYOUTS[locationId] || [];
    return npcs.map((agent, i) => {
      const spot = layout[i] || { x: 0.5, y: 0.5 };
      return {
        agent,
        x: Math.round(spot.x * rect.w),
        y: Math.round(spot.y * rect.h),
      };
    });
  }

  function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

  function nowClockLabel(time) {
    return MV.time.shortClock(time);
  }

  function nextEventId() {
    nextEventId.n = (nextEventId.n || 0) + 1;
    return nextEventId.n;
  }

  /* --------------- main component --------------- */

  MV.S3 = function S3() {
    const game = MV.useGame();
    const world = MV.data.cache.world;
    const allAgents = MV.data.cache.agents;

    /* current player agent — fall back to a04 if game.playingAs is blank
       (observe mode or fresh open straight to #/s3 in dev) */
    const playerAgent = useMemo(() => {
      return (game.playingAs && MV.data.agentById(game.playingAs))
          || MV.data.agentById("a04");
    }, [game.playingAs]);

    const [paused, setPaused]             = useState(false);
    const [collapsedEvents, setCollapsed] = useState(false);
    const [selectedId, setSelectedId]     = useState(null);
    const [stageRect, setStageRect]       = useState({ w: 1000, h: 700 });
    const [locationId, setLocationId]     = useState(() => playerAgent.location);
    const [playerPos, setPlayerPos]       = useState({ x: 500, y: 350 });
    const [activeEdge, setActiveEdge]     = useState(null);
    const [fadeKey, setFadeKey]           = useState(0);
    const [events, setEvents]             = useState(() => ([
      { id: nextEventId(), kind: "divider", text: "—— 新的一天 ——" },
    ]));

    const time = MV.time.useGameTime({ paused });

    /* refs that the rAF loop reads — avoids re-binding every frame */
    const pausedRef = useRef(paused);
    const stageRectRef = useRef(stageRect);
    const playerPosRef = useRef(playerPos);
    const locRef = useRef(locationId);
    const edgesRef = useRef([]);
    useEffect(() => { pausedRef.current = paused; },     [paused]);
    useEffect(() => { stageRectRef.current = stageRect; },[stageRect]);
    useEffect(() => { playerPosRef.current = playerPos; },[playerPos]);
    useEffect(() => { locRef.current = locationId; },    [locationId]);

    /* --------------- derived: npcs in current location --------------- */
    const npcs = useMemo(() => {
      const here = allAgents.filter(
        a => a.location === locationId && a.id !== playerAgent.id
      );
      return computeNpcPositions(locationId, here, stageRect);
    }, [allAgents, locationId, playerAgent.id, stageRect]);

    /* --------------- edges in current location --------------- */
    const edges = useMemo(() => {
      const list = (world.adjacency && world.adjacency[locationId]) || [];
      return list.map(e => ({
        dir: e.dir,
        target: MV.data.locationById(e.to),
        targetId: e.to,
      }));
    }, [world, locationId]);
    useEffect(() => { edgesRef.current = edges; }, [edges]);

    /* --------------- log helper --------------- */
    const log = useCallback((kind, text) => {
      setEvents(prev => {
        const ts = nowClockLabel(time);
        return [...prev, { id: nextEventId(), kind, ts, text }];
      });
    }, [time]);

    /* one-time arrival event on first mount and on every location switch */
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

    /* --------------- measure stage on mount + resize --------------- */
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

    /* place the player roughly center on first mount and after stage measured. */
    useEffect(() => {
      setPlayerPos(p => {
        if (p.x === 500 && p.y === 350) {
          return { x: Math.round(stageRect.w / 2), y: Math.round(stageRect.h / 2) };
        }
        return p;
      });
      /* eslint-disable-next-line */
    }, [stageRect.w, stageRect.h]);

    /* --------------- movement loop --------------- */
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
          const candidates = edgesRef.current;
          for (const e of candidates) {
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

    /* --------------- auto-select nearest NPC --------------- */
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

    /* --------------- key bindings --------------- */
    MV.keyboard.useKeyDown("escape", () => setPaused(p => !p), []);

    MV.keyboard.useKeyDown("e", () => {
      if (pausedRef.current) return;
      const edge = activeEdge;
      if (!edge) {
        if (selectedId) MV.toast.show("S11 对话 UI 将在下个 PR 实装");
        return;
      }
      const target = edgesRef.current.find(x => x.dir === edge);
      if (!target) return;
      switchLocation(target.targetId);
    }, [activeEdge, selectedId]);

    MV.keyboard.useKeyDown("q", () => {
      if (pausedRef.current) return;
      if (!selectedId) return;
      MV.toast.show("S4 读心抽屉将在下个 PR 实装");
    }, [selectedId]);

    MV.keyboard.useKeyDown("m",  () => MV.toast.show("S8 全屏地图将在下个 PR 实装"), []);
    MV.keyboard.useKeyDown("c",  () => MV.toast.show("S7 属性面板将在下个 PR 实装"), []);
    MV.keyboard.useKeyDown("f1", () => MV.toast.show("S14 键位帮助将在下个 PR 实装"), []);

    /* --------------- location switch --------------- */
    function switchLocation(toId) {
      const from = locRef.current;
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

    /* --------------- selected derived --------------- */
    const selectedAgent = selectedId ? MV.data.agentById(selectedId) : null;
    const inRange = useMemo(() => {
      if (!selectedAgent) return false;
      const n = npcs.find(x => x.agent.id === selectedAgent.id);
      if (!n) return false;
      return dist(playerPos, { x: n.x, y: n.y }) <= SELECT_RADIUS;
    }, [selectedAgent, npcs, playerPos]);

    /* if user moves out of range AND it was a click-only selection,
       keep the card so they can close it manually. We only auto-clear
       when both: not in range AND no recent click. To keep it simple:
       just keep card until ✕ pressed or another NPC is auto-selected. */

    const currentLocation = MV.data.locationById(locationId);

    return (
      <div className="s3-root">

        <MV.components.Topbar
          time={time}
          paused={paused}
          onTogglePause={() => setPaused(p => !p)}
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
            onStageClick={() => { /* keep card; click on empty stage does nothing */ }}
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

            {paused && (
              <div className="s3-pause">
                <div className="big">▮▮ 已暂停</div>
                <div className="hint">按 ESC 继续</div>
              </div>
            )}
          </MV.components.Stage>

          <MV.components.EventStream
            events={events}
            collapsed={collapsedEvents}
            onToggle={() => setCollapsed(c => !c)}
          />
        </div>

        <MV.toast.Host />
      </div>
    );
  };
})();
