/* S12 · Pause menu overlay.
   Hotkeys: ESC=close, 1-7=row, C/TAB/S/F1 jump straight to that item. */
window.MV = window.MV || {};

MV.S12 = function S12() {
  const { useState } = React;
  const [confirmQuit, setConfirmQuit] = useState(false);
  const K = MV.components.Kbd;

  const close       = () => MV.overlays.close("pause");
  const openSaves   = () => MV.overlays.push("saves");
  const openSet     = () => MV.overlays.push("settings");
  const openHelp    = () => MV.overlays.push("help");
  const stub        = (txt) => () => MV.toast.show(txt);
  const quit        = () => { MV.overlays.clear(); MV.setHash("#/s1"); };

  /* Use top-of-stack guard so all hotkeys fire only while S12 is the topmost
     overlay (otherwise opening Settings from here and pressing ESC would
     pop *both* layers in one keystroke). */
  const isTop = MV.overlays.useTop() === "pause";
  MV.keyboard.useKeyDown("escape", () => { if (isTop) close(); }, [isTop]);
  MV.keyboard.useKeyDown("1", () => { if (isTop) close(); },                            [isTop]);
  MV.keyboard.useKeyDown("2", () => { if (isTop) stub("S7 第四批实装")(); },             [isTop]);
  MV.keyboard.useKeyDown("3", () => { if (isTop) stub("S5 第四批实装")(); },             [isTop]);
  MV.keyboard.useKeyDown("4", () => { if (isTop) openSaves(); },                        [isTop]);
  MV.keyboard.useKeyDown("5", () => { if (isTop) openSet(); },                          [isTop]);
  MV.keyboard.useKeyDown("6", () => { if (isTop) openHelp(); },                         [isTop]);
  MV.keyboard.useKeyDown("7", () => { if (isTop) setConfirmQuit(true); },               [isTop]);
  /* Letter / Tab shortcuts */
  MV.keyboard.useKeyDown("c",   () => { if (isTop) stub("S7 第四批实装")(); },           [isTop]);
  MV.keyboard.useKeyDown("tab", () => { if (isTop) stub("S5 第四批实装")(); },           [isTop]);
  MV.keyboard.useKeyDown("s",   () => { if (isTop) openSaves(); },                      [isTop]);
  MV.keyboard.useKeyDown("f1",  () => { if (isTop) openHelp(); },                       [isTop]);

  const rows = [
    { idx: 1, zh: "继续",          kbd: "ESC", primary: true,  onClick: close },
    { idx: 2, zh: "我的状态",       kbd: "C",   soon: true,    onClick: stub("S7 第四批实装") },
    { idx: 3, zh: "关系网",         kbd: "TAB", soon: true,    onClick: stub("S5 第四批实装") },
    { idx: 4, zh: "存档 / 读档",    kbd: "S",                   onClick: openSaves },
    { idx: 5, zh: "设置",           kbd: "",                    onClick: openSet },
    { idx: 6, zh: "键位说明",       kbd: "F1",                  onClick: openHelp },
    { idx: 7, zh: "退出到主菜单",    kbd: "",   danger: true,    onClick: () => setConfirmQuit(true) },
  ];

  return (
    <div className="ov-root">
      <div className="ov-card s12-card anim-scale">
        <header className="s12-head">
          <div className="big">▮▮ 暂停</div>
          <div className="sub">TIME · HALTED</div>
        </header>

        <nav className="s12-list">
          {rows.map(r => (
            <div
              key={r.idx}
              className={
                "s12-row"
                + (r.primary ? " is-primary" : "")
                + (r.soon ? " dim" : "")
                + (r.danger ? " danger" : "")
              }
              onClick={r.onClick}
            >
              <span className="arrow">▷</span>
              <span className="name">
                <span className="zh">{r.zh}</span>
                {r.soon && <span className="soon">SOON</span>}
              </span>
              <K dim={r.soon}>{r.kbd || (r.idx + "")}</K>
            </div>
          ))}
        </nav>

        <footer className="s12-foot">游戏时间已暂停 · TIME HALTED</footer>
      </div>

      {confirmQuit && (
        <div className="confirm-dialog">
          <div className="box">
            <div className="msg">
              确定退出到主菜单吗?
              <br/>未保存的进度将丢失。
            </div>
            <div className="actions">
              <button className="btn sm" onClick={() => setConfirmQuit(false)}>取消</button>
              <button className="btn sm primary" onClick={quit}>确定退出</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
