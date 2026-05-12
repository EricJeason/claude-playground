/* S3 top status bar: pause + clock + nav buttons. */
window.MV = window.MV || {};
MV.components = MV.components || {};

MV.components.Topbar = function Topbar({ time, paused, onTogglePause }) {
  const pct = Math.round(MV.time.hourProgress(time) * 100);

  const navStub = (label, screenTag) => () =>
    MV.toast.show(`${screenTag} 将在下个 PR 实装`);

  return (
    <header className="s3-topbar">
      <div className="tb-left">
        <button
          className="tb-pause"
          title="暂停 (Esc)"
          onClick={onTogglePause}
        >
          {paused ? "▶" : "⏸"}
        </button>
        <span className="tb-brand">暮谷镇</span>
      </div>

      <div className="tb-clock">
        <div className="clock-text">{MV.time.format(time)}</div>
        <div className="clock-bar"><span style={{ width: pct + "%" }}/></div>
      </div>

      <div className="tb-right">
        <button className="tb-btn" onClick={navStub("设置", "S10 设置面板")}>
          ⚙ 设置 <span className="kb">⚙</span>
        </button>
        <button className="tb-btn" onClick={navStub("关系网", "S5 关系网")}>
          ※ 关系网 <span className="kb">R</span>
        </button>
        <button className="tb-btn" onClick={navStub("全镇", "S8 全屏地图")}>
          📍 全镇 <span className="kb">M</span>
        </button>
      </div>
    </header>
  );
};
