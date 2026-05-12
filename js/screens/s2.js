/* S2 · Pick an agent to embody. 3x4 grid on the left, detail panel on the right. */
window.MV = window.MV || {};

MV.S2 = function S2() {
  const game = MV.useGame();
  const agents = MV.data.cache.agents;

  const initialId = game.playingAs && agents.some(a => a.id === game.playingAs)
    ? game.playingAs
    : agents[3].id;          // default to a04 艾琳 per the spec narrative
  const [selectedId, setSelectedId] = React.useState(initialId);

  const selected = agents.find(a => a.id === selectedId);
  const loc = selected ? MV.data.locationById(selected.location) : null;

  const pickRandom = () => {
    const next = agents[Math.floor(Math.random() * agents.length)];
    setSelectedId(next.id);
  };

  const confirm = () => {
    if (!selected) return;
    game.update({ playingAs: selected.id });
    MV.setHash("#/s3");
  };

  return (
    <div className="screen">

      <header className="s2-header">
        <div>
          <button className="btn ghost sm" onClick={() => MV.setHash("#/s1")}>
            ← 返回
          </button>
        </div>
        <div className="title">你将以这个人的眼睛看这个镇子</div>
        <div className="count">选择一位居民 · 12 / 12</div>
      </header>

      <div className="s2-body">

        <div className="s2-grid">
          {agents.map(a => (
            <article
              key={a.id}
              className={"s2-agent box" + (a.id === selectedId ? " is-selected" : "")}
              onClick={() => setSelectedId(a.id)}
            >
              <div className={"av lg" + (a.id === selectedId ? " selected" : "")}>
                {a.letter}
              </div>
              <div className="info">
                <div className="name">{a.name}</div>
                <div className="meta">{a.age} · {a.role}</div>
                <div className="tags">
                  {a.traits.map((t, i) => (
                    <span key={i} className="tag">{t}</span>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>

        <aside className="s2-detail box soft">
          <div className="head">
            <div className={"av xl selected"}>{selected.letter}</div>
            <div className="name">{selected.name}</div>
            <div className="meta">{selected.age} · {selected.role}</div>
          </div>

          <div className="section">
            <div className="label">背景 · BACKGROUND</div>
            <div className="bg-text">{selected.background_short}</div>
          </div>

          <div className="section">
            <div className="label">初始所在 · STARTING</div>
            <div className="loc-card box fill">
              <span className="ln">{loc ? loc.name : "—"}</span>
              <span className="le">{loc ? loc.short : ""}</span>
            </div>
          </div>

          <div className="section">
            <div className="label">关系网 · RELATIONS</div>
            <div className="rel-box">preview</div>
          </div>
        </aside>
      </div>

      <footer className="s2-footer">
        <span className="cap">PICK ONE</span>
        <button className="btn dashed" onClick={pickRandom}>🎲 随机选一个</button>
        <button
          className={"btn primary" + (selected ? "" : " disabled")}
          disabled={!selected}
          onClick={confirm}
        >
          确认扮演 →
        </button>
      </footer>
    </div>
  );
};
