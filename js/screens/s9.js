/* S9 · Saves overlay. 1 AUTO + 4 manual slots. */
window.MV = window.MV || {};

MV.S9 = function S9() {
  const { useState, useEffect } = React;
  const game = MV.useGame();

  /* Re-render when localStorage changes (we don't get free reactivity since
     the saves lib is imperative). Track a tick counter that handlers bump. */
  const [tick, bump] = useState(0);
  const refresh = () => bump(t => t + 1);

  const slots = MV.saves.visibleSlots();
  const close = () => MV.overlays.close("saves");
  const isTop = MV.overlays.useTop() === "saves";
  MV.keyboard.useKeyDown("escape", () => { if (isTop) close(); }, [isTop]);

  const [confirmDel, setConfirmDel] = useState(null);  // save id pending delete

  function buildPayload() {
    const live = MV.saves.readLive();
    if (!live) {
      MV.toast.show("当前没有可保存的游戏状态");
      return null;
    }
    const here = MV.data.locationById(live.location);
    return {
      agent:     live.agent,
      gameTime:  live.gameTime,
      location:  live.location,
      playerPos: live.playerPos,
      chips:     [`位置:${here ? here.name : live.location}`],
    };
  }

  const handleNew = () => {
    const p = buildPayload(); if (!p) return;
    MV.saves.createManual(p);
    MV.toast.show("已新建存档");
    refresh();
  };
  const handleOverwrite = (id) => {
    const p = buildPayload(); if (!p) return;
    MV.saves.overwrite(id, p);
    MV.toast.show(id === "auto" ? "已覆盖自动存档" : "已覆盖存档");
    refresh();
  };
  const handleRead = (slot) => {
    if (!slot || !slot.snapshot) return;
    /* push the snapshot into the game context and bounce back to S3 */
    const snap = slot.snapshot;
    game.update({ playingAs: snap.playingAs || game.playingAs });
    /* Stash a one-shot restore directive that S3 picks up on next mount. */
    MV.saves.pendingRestore = snap;
    MV.toast.show(`已读取 · ${slot.name}`);
    MV.overlays.clear();   /* close all overlays */
    /* if we're not already on S3, route there */
    if (location.hash !== "#/s3") MV.setHash("#/s3");
  };
  const handleDelete = (slot) => {
    if (!slot) return;
    if (slot.kind === "auto") {
      MV.toast.show("自动存档不可删除");
      return;
    }
    setConfirmDel(slot.id);
  };
  const reallyDelete = () => {
    if (!confirmDel) return;
    MV.saves.remove(confirmDel);
    MV.toast.show("已删除");
    setConfirmDel(null);
    refresh();
  };

  /* Empty slot renderer */
  const EmptySlot = ({ n }) => (
    <div className="s9-slot empty" onClick={handleNew}>
      ⊕ 槽位 {n} · 点击新建存档
    </div>
  );

  return (
    <div className="ov-root">
      <div className="ov-card s9-card anim-scale">

        <header className="ov-head">
          <div className="titles">
            <div className="title">存档</div>
            <div className="subtitle">
              SAVES · 槽数 {slots.filter(Boolean).length} / 5 · 时间已暂停
            </div>
          </div>
          <div className="right">
            <button className="btn sm" onClick={handleNew}>⊕ 新建存档</button>
            <button className="btn ghost sm" onClick={close}>关闭 ESC</button>
          </div>
        </header>

        <div className="ov-body">
          <div className="s9-list">
            {slots.map((slot, i) => {
              if (!slot) return <EmptySlot key={i} n={i + 1}/>;
              const isAuto = slot.kind === "auto";
              const t = slot.gameTime || { day: 1, hour: 8, minute: 0 };
              const loc = MV.data.locationById(slot.location);
              return (
                <div key={slot.id || i} className={"s9-slot" + (isAuto ? " is-auto" : "")}>
                  <div className="s9-thumb">{isAuto && <span className="auto-tag">AUTO</span>}</div>
                  <div className="s9-info">
                    <div className="title">{slot.name} · {slot.role}</div>
                    <div className="when">
                      <span>{MV.time.format(t)}</span>
                      <span>· {loc ? loc.name : slot.location}</span>
                    </div>
                    <div className="chips">
                      {(slot.chips || []).map((c, j) => <span key={j} className="tag">{c}</span>)}
                      {isAuto && <span className="tag k">AUTO</span>}
                    </div>
                    <div className="when">
                      <span>{MV.saves.formatRelative(slot.savedAt)}</span>
                      <span className="mono">· {MV.saves.formatAbsolute(slot.savedAt)}</span>
                    </div>
                  </div>
                  <div className="s9-actions">
                    <button className="btn sm" onClick={() => handleRead(slot)}>读取</button>
                    <button className="btn ghost sm" onClick={() => handleOverwrite(slot.id)}>覆盖</button>
                    <button
                      className="btn ghost sm dashed"
                      onClick={() => handleDelete(slot)}
                      style={isAuto ? { opacity: 0.4 } : null}
                    >删除</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <footer className="ov-foot">
          <span className="cap" style={{ color: "var(--warn-red)" }}>⚠ 删除存档不可恢复</span>
          <button className="btn ghost sm" onClick={close}>关闭 ESC</button>
        </footer>
      </div>

      {confirmDel && (
        <div className="confirm-dialog">
          <div className="box">
            <div className="msg">确定删除这个存档?<br/>此操作不可撤销。</div>
            <div className="actions">
              <button className="btn sm" onClick={() => setConfirmDel(null)}>取消</button>
              <button className="btn sm primary" onClick={reallyDelete}>确定删除</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
