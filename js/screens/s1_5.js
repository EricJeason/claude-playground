/* S1.5 · New / Continue / Load.
   Three cards horizontally; the middle (continue) is the visual hero. */
window.MV = window.MV || {};

MV.S1_5 = function S1_5() {
  const game = MV.useGame();
  const lastSave = (game.saves && game.saves[0]) || null;

  const lastAgent = lastSave
    ? MV.data.agentById(lastSave.playingAs || game.playingAs)
    : MV.data.agentById(game.playingAs);
  const lastLocation = lastAgent ? MV.data.locationById(lastAgent.location) : null;

  const continueName = lastAgent ? lastAgent.name : "未知居民";
  const gameDateLabel = lastSave?.gameDate || "第 1 天 · 上午";
  const saveTimeLabel = lastSave?.savedAt   || "昨天 19:30";

  const goNew      = () => MV.setHash("#/s2");
  const goContinue = () => MV.setHash("#/s3");
  // TODO(S9): wire to real save-list screen when implemented.
  const goLoad     = () => MV.setHash("#/s3");
  const goBack     = () => MV.setHash("#/s1");

  return (
    <div className="screen">

      <header className="s15-header">
        <div>
          <div className="welcome h-serif">欢迎回到暮谷镇</div>
          <div className="sub">
            上次你以 <strong>{continueName}</strong> 的眼睛离开 · {gameDateLabel}
          </div>
        </div>
        <div className="step">STEP 1 · 5 / 2</div>
      </header>

      <div className="s15-grid">

        {/* ---- new ---- */}
        <section className="s15-card box">
          <div className="icon">⊕</div>
          <div className="card-title">新游戏</div>
          <div className="card-en">NEW · START FRESH</div>
          <div className="card-desc">
            重新选一位居民扮演。12 人皆可,世界从第 1 天 · 上午 8 时再次开始。
          </div>
          <div className="card-actions">
            <button className="btn" onClick={goNew}>开始 →</button>
          </div>
        </section>

        {/* ---- continue (hero) ---- */}
        <section className="s15-card box recommended">
          <div className="row between" style={{ alignItems: "center" }}>
            <span className="tag fill">推荐</span>
            <span className="cap">RECOMMENDED</span>
          </div>
          <div className="icon" style={{ marginTop: 10 }}>↻</div>
          <div className="card-title">继续 · {continueName}</div>
          <div className="card-en">CONTINUE · LAST RUN</div>

          <div className="s15-thumb">截图占位 · LAST FRAME</div>

          <div className="s15-meta">
            <div>{gameDateLabel}</div>
            <div>{lastLocation ? lastLocation.name : "老松广场"}</div>
            <div className="row-chips">
              <span className="tag">12 人在场</span>
              <span className="tag">无未读心音</span>
              <span className="tag k">3 条线索</span>
            </div>
            <div className="save-time mono">{saveTimeLabel}</div>
          </div>

          <div className="card-actions">
            <button className="btn primary" onClick={goContinue}>继续 →</button>
          </div>
        </section>

        {/* ---- load ---- */}
        <section className="s15-card box">
          <div className="icon">⊟</div>
          <div className="card-title">加载存档</div>
          <div className="card-en">LOAD · FROM SAVES</div>
          <div className="card-desc">
            从 3 个存档中选择。可读取、覆盖、或删除(自动存档除外)。
          </div>
          <div className="card-actions">
            <button className="btn" onClick={goLoad}>打开 →</button>
          </div>
        </section>
      </div>

      <div className="s15-back">
        <a onClick={goBack}>← 返回启动屏</a>
      </div>
    </div>
  );
};
