/* S3 · Placeholder. Real main screen will land in the next PR. */
window.MV = window.MV || {};

MV.S3 = function S3() {
  const game = MV.useGame();
  const agent = game.playingAs ? MV.data.agentById(game.playingAs) : null;
  const loc   = agent ? MV.data.locationById(agent.location) : null;

  const stateLine = agent
    ? `你以 ${agent.name} 进入 · 当前位置:${loc ? loc.name : "—"}`
    : "尚未选择扮演角色(上帝视角进入)";

  return (
    <div className="screen">
      <header className="s2-header">
        <div>
          <button className="btn ghost sm" onClick={() => MV.setHash("#/s1")}>
            ← 返回启动屏
          </button>
        </div>
        <div className="title">— 主屏占位 —</div>
        <div className="count">PR · 02 · NEXT</div>
      </header>

      <div className="s3-stack">
        <div className="big">S3 · 主屏</div>
        <div className="sub">THIS SCREEN LANDS IN THE NEXT PR</div>
        <div className="state-card">{stateLine}</div>

        <div className="row gap-3" style={{ marginTop: 12 }}>
          <button className="btn" onClick={() => MV.setHash("#/s1")}>
            ← 返回启动屏 (#/s1)
          </button>
        </div>
      </div>
    </div>
  );
};
