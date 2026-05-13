/* S14 · Keybinds help overlay. F1 or any key closes. */
window.MV = window.MV || {};

MV.S14 = function S14() {
  const K = MV.components.Kbd;
  const close = () => MV.overlays.close("help");
  const isTop = MV.overlays.useTop() === "help";

  /* Close on F1 or Escape. The "any key" exit is handled by a one-shot keydown
     listener mounted only while we're on top; otherwise number-key shortcuts
     coming from a lower S12 layer would close us immediately. */
  MV.keyboard.useKeyDown("f1",     () => { if (isTop) close(); }, [isTop]);
  MV.keyboard.useKeyDown("escape", () => { if (isTop) close(); }, [isTop]);

  React.useEffect(() => {
    if (!isTop) return;
    /* delay so the F1 keydown that *opened* us doesn't immediately close us */
    let armed = false;
    const t = setTimeout(() => { armed = true; }, 250);
    const fn = (e) => {
      if (!armed) return;
      /* ignore modifier-only presses */
      if (e.key === "Shift" || e.key === "Control" || e.key === "Alt" || e.key === "Meta") return;
      close();
    };
    window.addEventListener("keydown", fn);
    return () => { clearTimeout(t); window.removeEventListener("keydown", fn); };
  }, [isTop]);

  return (
    <div className="ov-root">
      <div className="ov-full s14-full anim-fade">

        <header className="ov-head">
          <div className="titles">
            <div className="title">键位说明</div>
            <div className="subtitle">KEYBINDS · MURK VALLEY</div>
          </div>
          <div className="right">
            <button className="btn ghost sm" onClick={close}>关闭 ESC</button>
          </div>
        </header>

        <div className="s14-grid">

          <section className="s14-card">
            <div className="head">
              <span className="zh">↗ 移动</span>
              <span className="en">MOVE</span>
            </div>
            <div className="s14-row">
              <span className="keys">
                <K>W</K><K>A</K><K>S</K><K>D</K>
              </span>
              <span className="desc">标准移动(推荐)</span>
            </div>
            <div className="s14-row">
              <span className="keys">
                <K>↑</K><K>↓</K><K>←</K><K>→</K>
              </span>
              <span className="desc">方向键替代</span>
            </div>
            <div className="s14-row">
              <span className="keys"><K dim>SHIFT</K></span>
              <span className="desc" style={{ color: "var(--ink-4)" }}>+ 移动 · 疾跑(待定)</span>
            </div>
          </section>

          <section className="s14-card">
            <div className="head">
              <span className="zh">◐ 互动</span>
              <span className="en">INTERACT</span>
            </div>
            <div className="s14-row"><span className="keys"><K>E</K></span><span className="desc">搭话 / 进入场所</span></div>
            <div className="s14-row"><span className="keys"><K>Q</K></span><span className="desc">读心(需靠近)</span></div>
            <div className="s14-row"><span className="keys"><K>SPACE</K></span><span className="desc">推进对话</span></div>
            <div className="s14-row"><span className="keys"><K>LMB</K></span><span className="desc">选中 NPC · 点击 UI</span></div>
            <div className="s14-row"><span className="keys"><K>RMB</K></span><span className="desc">取消 · 关闭</span></div>
          </section>

          <section className="s14-card">
            <div className="head">
              <span className="zh">❋ 界面</span>
              <span className="en">UI</span>
            </div>
            <div className="s14-row"><span className="keys"><K>TAB</K></span><span className="desc">关系网 开 / 关</span></div>
            <div className="s14-row"><span className="keys"><K>M</K></span><span className="desc">全屏地图 开 / 关</span></div>
            <div className="s14-row"><span className="keys"><K>C</K></span><span className="desc">我的状态 / 属性</span></div>
            <div className="s14-row"><span className="keys"><K>ESC</K></span><span className="desc">暂停菜单</span></div>
            <div className="s14-row"><span className="keys"><K>F1</K></span><span className="desc">本帮助页</span></div>
          </section>

          <section className="s14-card dim">
            <div className="head">
              <span className="zh">🛠 开发者</span>
              <span className="en">DEBUG</span>
            </div>
            <div className="s14-row">
              <span className="desc" style={{ flex: "1 1 auto", color: "var(--ink-4)", fontStyle: "italic" }}>
                仅在 设置 → 开发者 中启用后可用
              </span>
            </div>
            <div className="s14-row"><span className="keys"><K dim>1</K><K dim>2</K><K dim>3</K><K dim>4</K></span><span className="desc">直接传送到对应场所</span></div>
            <div className="s14-row"><span className="keys"><K dim>F2</K></span><span className="desc">切换显示档案级读心信息</span></div>
            <div className="s14-row"><span className="keys"><K dim>F12</K></span><span className="desc">显示调试信息(待定)</span></div>
          </section>
        </div>

        <footer className="s14-foot">按任意键返回 · ANY KEY TO RETURN</footer>
      </div>
    </div>
  );
};
