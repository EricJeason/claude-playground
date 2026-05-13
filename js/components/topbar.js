/* S3 top status bar: pause + clock + nav buttons.
   Callbacks injected by S3; each button corresponds to an overlay or a stub. */
window.MV = window.MV || {};
MV.components = MV.components || {};

MV.components.Topbar = function Topbar(props) {
  const { time, paused, onTogglePause, onSettings, onRelations, onMap } = props;
  const pct = Math.round(MV.time.hourProgress(time) * 100);

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
        <button className="tb-btn" onClick={onSettings}>
          ⚙ 设置 <span className="kb">⚙</span>
        </button>
        <button className="tb-btn" onClick={onRelations}>
          ※ 关系网 <span className="kb">⇥</span>
        </button>
        <button className="tb-btn" onClick={onMap}>
          📍 全镇 <span className="kb">M</span>
        </button>
      </div>
    </header>
  );
};
