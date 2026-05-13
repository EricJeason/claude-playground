/* S4 · Read-mind drawer (slides in from right of the S3 stage).
   This is NOT in the overlay stack — game time keeps running, the player
   can walk, and walking out of MIND_RANGE auto-closes us.

   Props:
     npc: agents.json row
     distance: number (px from player to npc)
     onClose: () => void
*/
window.MV = window.MV || {};

const MV_MIND_RANGE      = 150;
const MV_MIND_NEAR_RANGE = 80;
MV.MIND_RANGE      = MV_MIND_RANGE;
MV.MIND_NEAR_RANGE = MV_MIND_NEAR_RANGE;

MV.S4 = function S4(props) {
  const { useState, useEffect, useRef, useMemo } = React;
  const game = MV.useGame();
  const { npc, distance, onClose } = props;
  if (!npc) return null;

  const player = (game.playingAs && MV.data.agentById(game.playingAs)) || null;
  const location = MV.data.locationById(npc.location);

  /* mode: forced by user toggle, otherwise derived from distance */
  const [forcedMode, setForcedMode] = useState(null);   /* 'near' | 'far' | null */
  const autoMode = distance <= MV_MIND_NEAR_RANGE ? "near" : "far";
  const mode = forcedMode || autoMode;

  const settings = game.settings || {};
  const showArchive = !!(settings.dev && settings.dev.showArchiveMind);

  const [thought, setThought] = useState("");
  const [loading, setLoading] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const abortRef = useRef(null);
  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  const promptCtx = useMemo(() => ({
    npc, player, location,
    mode,
    showSecrets: showArchive,
  }), [npc, player, location, mode, showArchive]);

  async function regenerate() {
    if (abortRef.current) abortRef.current.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    setThought("");
    try {
      const system = MV.prompts.innerMonologuePrompt(promptCtx);
      const messages = [
        { role: "system", content: system },
        { role: "user", content: "请生成此刻的内心独白。" },
      ];
      const { text } = await MV.llm.complete({
        messages, signal: ctrl.signal,
        temperature: 0.85,
        maxTokens: mode === "near" ? 200 : 80,
      });
      if (!mountedRef.current) return;
      setThought(MV.prompts.cleanMonologue(text));
    } catch (e) {
      if (e && e.type === "aborted") return;
      console.error("[s4] monologue error", e);
      if (!mountedRef.current) return;
      MV.toast.error(e, { retry: regenerate });
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }

  /* regen on mount and on mode change (effectively forcedMode flips) */
  useEffect(() => {
    regenerate();
    return () => { if (abortRef.current) abortRef.current.abort(); };
    /* eslint-disable-next-line */
  }, [npc.id, mode]);

  /* auto-close when player walks too far away */
  useEffect(() => {
    if (distance > MV_MIND_RANGE) onClose && onClose();
  }, [distance, onClose]);

  /* the trait chips for "公开 · 性格" */
  const traits = npc.traits || [];

  /* a simple derived 公开 · 外观 paragraph */
  const appearance = `${npc.age} 岁的${npc.role}。${(npc.background_short || "").split(";")[0]}.`;

  const rel = (npc.relationships && player && npc.relationships[player.id]) || "你与 ta 不算熟。";

  return (
    <aside className="s4-drawer">

      <header className="s4-head">
        <span className="av lg me">{npc.letter}</span>
        <div className="col">
          <span className="name">{npc.name}</span>
          <span className="meta">
            {npc.age} · {npc.role}{location ? " · " + location.name : ""}
            {npc.mood && " · " + npc.mood}
          </span>
        </div>
        <button className="btn ghost sm" onClick={onClose}>Q 关闭</button>
      </header>

      <div className="s4-mode">
        <span>PROTO · 切换状态</span>
        <span className="chips">
          <span
            className={"chip" + (mode === "far" ? " is-active" : "")}
            onClick={() => setForcedMode("far")}
          >远</span>
          <span
            className={"chip" + (mode === "near" ? " is-active" : "")}
            onClick={() => setForcedMode("near")}
          >近</span>
        </span>
      </div>

      <div className="s4-body">

        <section className="s4-sec">
          <div className="lbl">公开 · 外观</div>
          <div className="val">{appearance}</div>
        </section>

        <section className="s4-sec">
          <div className="lbl">公开 · 性格</div>
          <div className="chips">
            {traits.map((t, i) => <span key={i} className="tag k">{t}</span>)}
          </div>
        </section>

        <section className="s4-sec">
          <div className="lbl">你与 ta</div>
          <div className="val">{rel}</div>
        </section>

        <MV.components.InnerVoice
          loading={loading}
          text={thought}
          mode={mode}
        />

        {showArchive && (
          <div className={"s4-archive" + (archiveOpen ? " is-open" : "")}>
            <div className="toggle-head" onClick={() => setArchiveOpen(o => !o)}>
              <span>{archiveOpen ? "▾" : "▸"}</span>
              <span>⚙ 档案级 · 仅开发者模式可见</span>
            </div>
            <div className="body">
              <div className="warn">⚠ 这是档案级信息,仅供调试。游戏中玩家不会看到这些。</div>
              <div className="item">
                <span className="k">KNOWN SECRETS</span>
                {(npc.known_secrets || ["—"]).map((s, i) => <div key={i}>· {s}</div>)}
              </div>
              <div className="item" style={{ marginTop: 8 }}>
                <span className="k">INNER CONFLICT</span>
                {npc.inner_conflict || "—"}
              </div>
            </div>
          </div>
        )}

      </div>

      <footer className="s4-foot">
        <span>· 离 {(distance / 100).toFixed(1)}m</span>
        <button className="btn ghost sm" onClick={onClose}>Q 关闭</button>
      </footer>
    </aside>
  );
};
