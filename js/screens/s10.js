/* S10 · Settings overlay.
   6 collapsible groups. Front two start open. Every chip / toggle mutation
   patches mv_settings via game.updateSettings(patch); side effects
   (font-size CSS var, body bg, tempo) apply immediately. */
window.MV = window.MV || {};

MV.S10 = function S10() {
  const { useState } = React;
  const game = MV.useGame();
  const s = game.settings;
  const K = MV.components.Kbd;

  const close = () => MV.overlays.close("settings");
  const isTop = MV.overlays.useTop() === "settings";
  MV.keyboard.useKeyDown("escape", () => { if (isTop) close(); }, [isTop]);

  /* group expanded state — first two open by default */
  const [open, setOpen] = useState({
    audio: true,
    keys:  true,
    tempo: false,
    display:false,
    ai:    false,
    dev:   false,
  });
  const toggle = (k) => setOpen(o => ({ ...o, [k]: !o[k] }));

  /* convenience setter for nested dev flags */
  const setDev = (patch) => game.updateSettings({ dev: patch });

  const stub = (txt) => () => MV.toast.show(txt);

  const Chip = ({ active, disabled, onClick, children }) => (
    <span
      className={"chip" + (active ? " is-active" : "") + (disabled ? " is-disabled" : "")}
      onClick={disabled ? undefined : onClick}
    >{children}</span>
  );
  const Toggle = ({ on, onChange }) => (
    <span className={"toggle" + (on ? " is-on" : "")} onClick={() => onChange(!on)} />
  );

  /* ---- group bodies ---- */
  const AudioBody = () => (
    <>
      {["主音量", "音效", "环境音"].map(label => (
        <div key={label} className="s10-row">
          <span className="label">{label}</span>
          <span className="ctrl">
            <span className="prog disabled"><span className="knob" style={{ left: "62%" }}/></span>
          </span>
        </div>
      ))}
      <div className="s10-row"><span className="label"/><span className="hint">v0.x 不实装</span></div>
    </>
  );

  const KEY_ROWS = [
    ["移动",              "W A S D / ↑↓←→"],
    ["搭话 · 进入场所",    "E"],
    ["读心",              "Q"],
    ["暂停菜单",          "ESC"],
    ["关系网",            "TAB"],
    ["全屏地图",          "M"],
    ["我的状态",          "C"],
    ["键位说明",          "F1"],
    ["存档读档(暂停内)",   "S"],
    ["传送到场所(开发者)", "1 2 3 4"],
  ];
  const KeysBody = () => (
    <>
      {KEY_ROWS.map(([action, keys]) => (
        <div key={action} className="s10-row">
          <span className="label" style={{ flexBasis: 140 }}>{action}</span>
          <span className="ctrl">
            <K>{keys}</K>
          </span>
          <button
            className="btn ghost sm"
            onClick={stub("自定义按键将在 v1.0+ 实装")}
          >编辑</button>
        </div>
      ))}
    </>
  );

  const TempoBody = () => (
    <>
      <div className="s10-row">
        <span className="label">现实秒 = 1 小时</span>
        <span className="ctrl">
          {[30, 60, 90, 120].map(v => (
            <Chip key={v} active={s.tempo === v} onClick={() => game.updateSettings({ tempo: v })}>
              {v}s/h
            </Chip>
          ))}
        </span>
      </div>
      <div className="s10-row">
        <span className="label">自动暂停</span>
        <span className="ctrl">
          <Toggle on={!!s.autoPause} onChange={(v) => game.updateSettings({ autoPause: v })}/>
          <span className="hint">玩家空闲超过 60 秒后暂停</span>
        </span>
      </div>
    </>
  );

  const DisplayBody = () => (
    <>
      <div className="s10-row">
        <span className="label">主题</span>
        <span className="ctrl">
          <Chip active={s.theme === "paper"} onClick={() => game.updateSettings({ theme: "paper" })}>纸质</Chip>
          <Chip disabled>深色(v1.0+)</Chip>
          <Chip disabled>像素(v1.0+)</Chip>
        </span>
      </div>
      <div className="s10-row">
        <span className="label">字体大小</span>
        <span className="ctrl">
          {["small", "medium", "large"].map(v => (
            <Chip
              key={v}
              active={s.fontSize === v}
              onClick={() => game.updateSettings({ fontSize: v })}
            >{ {small: "小", medium: "中", large: "大"}[v] }</Chip>
          ))}
        </span>
      </div>
      <div className="s10-row">
        <span className="label">letterbox</span>
        <span className="ctrl">
          <Chip active={s.letterboxColor === "black"} onClick={() => game.updateSettings({ letterboxColor: "black" })}>黑</Chip>
          <Chip active={s.letterboxColor === "brown"} onClick={() => game.updateSettings({ letterboxColor: "brown" })}>深棕</Chip>
        </span>
      </div>
    </>
  );

  const [editingKey, setEditingKey] = useState(false);
  const maskedKey = (game.apiKey || "") ? (game.apiKey.slice(0, 8) + " · · ·") : "(空)";
  const AiBody = () => (
    <>
      <div className="s10-row">
        <span className="label">渠道</span>
        <span className="ctrl">
          <select
            value={game.apiChannel}
            onChange={(e) => game.update({ apiChannel: e.target.value })}
          >
            <option value="openrouter">OpenRouter</option>
            <option value="deepseek">DeepSeek 官方</option>
          </select>
        </span>
      </div>
      <div className="s10-row">
        <span className="label">API key</span>
        <span className="ctrl">
          {editingKey ? (
            <>
              <div className="field" style={{ flex: "1 1 auto" }}>
                <input
                  type="password"
                  value={game.apiKey}
                  onChange={(e) => game.update({ apiKey: e.target.value })}
                  placeholder="sk-or-..."
                  autoComplete="off"
                  spellCheck="false"
                />
              </div>
              <button className="btn sm" onClick={() => setEditingKey(false)}>完成</button>
            </>
          ) : (
            <>
              <span className="mono" style={{ flex: "1 1 auto", fontSize: 12 }}>{maskedKey}</span>
              <button className="btn ghost sm" onClick={() => setEditingKey(true)}>编辑</button>
            </>
          )}
        </span>
      </div>
      <div className="s10-row">
        <span className="label">模型</span>
        <span className="ctrl">
          <select
            value={game.apiModel}
            onChange={(e) => game.update({ apiModel: e.target.value })}
          >
            <option value="deepseek/deepseek-v4-pro">deepseek-v4-pro</option>
            <option value="deepseek/deepseek-v4-flash">deepseek-v4-flash</option>
          </select>
        </span>
      </div>
      <div className="s10-row">
        <span className="label">非思考模式</span>
        <span className="ctrl">
          <Toggle on={!!game.nonThinking} onChange={(v) => game.update({ nonThinking: v })}/>
          <span className="hint">与启动屏保持同步</span>
        </span>
      </div>
    </>
  );

  const DevBody = () => (
    <>
      <div className="s10-row">
        <span className="label" style={{ flexBasis: 200 }}>启用场所传送(1-4)</span>
        <span className="ctrl">
          <Toggle on={!!s.dev.teleport} onChange={(v) => setDev({ teleport: v })}/>
          <span className="hint">开启后 S3 中按数字键直接传送</span>
        </span>
      </div>
      <div className="s10-row">
        <span className="label" style={{ flexBasis: 200 }}>档案级读心(F2)</span>
        <span className="ctrl">
          <Toggle on={!!s.dev.showArchiveMind} onChange={(v) => setDev({ showArchiveMind: v })}/>
          <span className="hint">第四批 S4 读心时显示档案级秘密</span>
        </span>
      </div>
      <div className="s10-row">
        <span className="label" style={{ flexBasis: 200 }}>调试信息(F12)</span>
        <span className="ctrl">
          <Toggle on={!!s.dev.debugInfo} onChange={(v) => setDev({ debugInfo: v })}/>
        </span>
      </div>
      <div className="s10-row">
        <span className="label" style={{ flexBasis: 200 }}>跳过启动屏检查</span>
        <span className="ctrl">
          <Toggle on={!!s.dev.skipKeyCheck} onChange={(v) => setDev({ skipKeyCheck: v })}/>
          <span className="hint">允许空 key 进入 S1</span>
        </span>
      </div>
    </>
  );

  const groups = [
    { id: "audio",   icon: "🔊", label: "音频",     hint: "v0.x 不实装",   body: AudioBody },
    { id: "keys",    icon: "⌨", label: "按键映射", hint: "",              body: KeysBody  },
    { id: "tempo",   icon: "⏱", label: "节奏",     hint: "",              body: TempoBody },
    { id: "display", icon: "🎨", label: "显示",     hint: "",              body: DisplayBody },
    { id: "ai",      icon: "🤖", label: "AI",       hint: "重要",          body: AiBody },
    { id: "dev",     icon: "🛠", label: "开发者",   hint: "默认折叠",      body: DevBody },
  ];

  return (
    <div className="ov-root">
      <div className="ov-card s10-card anim-scale">

        <header className="ov-head">
          <div className="titles">
            <div className="title">设置</div>
            <div className="subtitle">SETTINGS · MURK VALLEY</div>
          </div>
          <div className="right">
            <button className="btn ghost sm" onClick={close}>关闭 ESC</button>
          </div>
        </header>

        <div className="ov-body">
          {groups.map(g => {
            const Body = g.body;
            return (
              <div key={g.id} className={"s10-group" + (open[g.id] ? " is-open" : "")}>
                <div className="head" onClick={() => toggle(g.id)}>
                  <span className="icon">{g.icon}</span>
                  <span className="label">{g.label}</span>
                  {g.hint && <span className="hint">{g.hint}</span>}
                  <span className="chev">{open[g.id] ? "▾" : "▸"}</span>
                </div>
                <div className="body">
                  <Body/>
                </div>
              </div>
            );
          })}
        </div>

        <footer className="ov-foot">
          <button
            className="btn ghost sm dashed"
            onClick={() => { if (confirm("重置所有设置为默认值?")) game.resetSettings(); }}
          >重置默认</button>
          <div className="row gap-2">
            <button className="btn sm primary" onClick={close}>应用</button>
            <button className="btn sm" onClick={close}>关闭</button>
          </div>
        </footer>
      </div>
    </div>
  );
};
