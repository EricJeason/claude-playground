/* S1 · Startup. Two columns: LLM connect (left), perspective pick (right).
   v0.4a additions:
     - .led has four states (off / busy / ready / fail)
     - API key auto-validates on blur (uses MV.llm.validateKey + 24h cache)
     - "进入暮谷镇" gates on validation state + a confirm dialog for fail */
window.MV = window.MV || {};

MV.S1 = function S1() {
  const { useState, useEffect, useCallback, useRef } = React;
  const game = MV.useGame();
  const {
    apiKey, apiChannel, apiModel, nonThinking, viewMode, hasSaves, update, settings,
  } = game;

  /* validation status, with localStorage cache */
  /* status: 'empty' | 'validating' | 'ready' | 'fail' */
  const initialStatus = (() => {
    if (!apiKey) return { status: "empty", reason: "" };
    const cached = MV.llm.readCachedFor({ key: apiKey, channel: apiChannel, model: apiModel });
    if (!cached) return { status: "empty", reason: "" };
    return cached.ok ? { status: "ready", reason: "" } : { status: "fail", reason: cached.reason || "" };
  })();
  const [vstate, setVstate] = useState(initialStatus);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const aborterRef = useRef(null);

  const skipKeyCheck = !!(settings && settings.dev && settings.dev.skipKeyCheck);

  /* validation routine — debounced when triggered via blur or explicit call */
  const runValidate = useCallback(async (k, ch, md) => {
    if (!k) { setVstate({ status: "empty", reason: "" }); return; }
    const cached = MV.llm.readCachedFor({ key: k, channel: ch, model: md });
    if (cached) {
      setVstate(cached.ok ? { status: "ready", reason: "" } : { status: "fail", reason: cached.reason || "" });
      return;
    }
    setVstate({ status: "validating", reason: "" });
    if (aborterRef.current) aborterRef.current.abort();
    const ctrl = new AbortController();
    aborterRef.current = ctrl;
    const r = await MV.llm.validateKey(k, ch, md);
    if (ctrl.signal.aborted) return;
    MV.llm.saveCache({ key: k, channel: ch, model: md, ok: r.ok, reason: r.reason });
    if (r.ok) setVstate({ status: "ready", reason: "" });
    else      setVstate({ status: "fail", reason: r.reason || "" });
  }, []);

  /* if user pastes (sets apiKey programmatically) and didn't blur the input,
     still kick a validation after a short idle. */
  useEffect(() => {
    if (!apiKey) { setVstate({ status: "empty", reason: "" }); return; }
    const cached = MV.llm.readCachedFor({ key: apiKey, channel: apiChannel, model: apiModel });
    if (cached) {
      setVstate(cached.ok ? { status: "ready", reason: "" } : { status: "fail", reason: cached.reason || "" });
    }
    /* eslint-disable-next-line */
  }, [apiKey, apiChannel, apiModel]);

  const onPaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) update({ apiKey: text.trim() });
    } catch {/* clipboard unavailable */}
  };
  const onKeyBlur = () => runValidate(apiKey, apiChannel, apiModel);

  /* Footer LED rendering */
  const ledClass = (() => {
    if (vstate.status === "empty")      return "led off";
    if (vstate.status === "validating") return "led led-busy";
    if (vstate.status === "ready")      return "led";          /* default green pulse */
    return "led led-fail";
  })();
  const ledText = (() => {
    if (vstate.status === "empty")      return "$ 待接入";
    if (vstate.status === "validating") return "$ 验证中...";
    if (vstate.status === "ready")      return "$ 已就绪";
    return "$ key 无效";
  })();
  const ledTitle = vstate.status === "fail" ? vstate.reason : "";

  /* button gating */
  const enterDisabled = (() => {
    if (skipKeyCheck) return !viewMode;
    if (vstate.status === "empty")      return true;
    if (vstate.status === "validating") return true;
    return !viewMode;
  })();
  const enterLabel = (() => {
    if (!apiKey && !skipKeyCheck)       return "需要 API key";
    if (vstate.status === "validating") return "验证中...";
    return "进入暮谷镇 →";
  })();

  const proceed = () => {
    if (hasSaves) { MV.setHash("#/s1_5"); return; }
    MV.setHash(viewMode === "embody" ? "#/s2" : "#/s3");
  };
  const onEnter = () => {
    if (enterDisabled) return;
    if (!skipKeyCheck && vstate.status === "fail") { setConfirmOpen(true); return; }
    proceed();
  };

  return (
    <div className="screen">

      <header className="s1-header">
        <div className="title h-serif">暮谷镇</div>
        <div className="sub mono">MURK · VALLEY</div>
        <div className="rule"></div>
      </header>

      <div className="s1-body">

        {/* ---------- LLM connect ---------- */}
        <section className="s1-col s1-llm box soft">
          <h3 className="h-serif">LLM 接入</h3>
          <div className="col-sub">LLM · CONNECT</div>

          <div className="row-field">
            <label className="field-label">渠道 · CHANNEL</label>
            <div className="field">
              <select
                value={apiChannel}
                onChange={e => update({ apiChannel: e.target.value })}
              >
                <option value="openrouter">OpenRouter</option>
                <option value="deepseek">DeepSeek 官方</option>
              </select>
            </div>
          </div>

          <div className="row-field">
            <label className="field-label">模型 · MODEL</label>
            <div className="field">
              <select
                value={apiModel}
                onChange={e => update({ apiModel: e.target.value })}
              >
                <option value="deepseek/deepseek-v4-pro">deepseek-v4-pro</option>
                <option value="deepseek/deepseek-v4-flash">deepseek-v4-flash</option>
              </select>
            </div>
          </div>

          <div className="row-field">
            <label className="field-label">API KEY</label>
            <div className="field">
              <input
                type="password"
                placeholder="sk-or-..."
                value={apiKey}
                onChange={e => update({ apiKey: e.target.value })}
                onBlur={onKeyBlur}
                autoComplete="off"
                spellCheck="false"
              />
              <span className="field-paste" onClick={onPaste}>PASTE</span>
            </div>
          </div>

          <label className="check" style={{ marginTop: 6 }}>
            <span className={"gly " + (nonThinking ? "checked" : "")}>
              {nonThinking ? "✓" : ""}
            </span>
            <span style={{ fontSize: 14 }}>非思考模式</span>
            <span className="mono" style={{ fontSize: 10, color: "var(--ink-3)", letterSpacing: "0.14em" }}>
              NON-THINKING
            </span>
            <input
              type="checkbox"
              checked={nonThinking}
              onChange={e => update({ nonThinking: e.target.checked })}
              style={{ display: "none" }}
            />
          </label>

          <div className="small-note">
            key 仅保存于你的浏览器 · localStorage · 不会上传
          </div>
        </section>

        {/* ---------- Perspective pick ---------- */}
        <section className="s1-col s1-view">
          <h3 className="h-serif">选择视角</h3>
          <div className="col-sub">PERSPECTIVE</div>

          <div
            className={"view-card box" + (viewMode === "observe" ? " is-selected" : "")}
            onClick={() => update({ viewMode: "observe" })}
          >
            <div className="title-row">
              <span className="vc-title">上帝视角</span>
              <span className="vc-en">OBSERVE · NUDGE</span>
            </div>
            <div className="vc-desc">
              你将看遍 12 个人的小日子,
              可以触发情境、轻轻推一把,但不能直接搭话。
              偶尔有人会想起你。
            </div>
            <div className="vc-tags">
              <span className="tag">看遍 12 人</span>
              <span className="tag">触发情境</span>
              <span className="tag">不可直接搭话</span>
              <span className="tag k">可读心</span>
              {viewMode === "observe" && <span className="tag fill">selected</span>}
            </div>
          </div>

          <div
            className={"view-card box" + (viewMode === "embody" ? " is-selected" : "")}
            onClick={() => update({ viewMode: "embody" })}
          >
            <div className="title-row">
              <span className="vc-title">扮演视角</span>
              <span className="vc-en">EMBODY · 1 OF 12</span>
            </div>
            <div className="vc-desc">
              成为 12 个人之一,化身一具肉身。
              只看见你当下所在的场所,只听见眼前的人。
              靠近一个人,你才能听见他的心音。
            </div>
            <div className="vc-tags">
              <span className="tag">化身 1 人</span>
              <span className="tag">只见当下场所</span>
              <span className="tag k">靠近方读心</span>
              {viewMode === "embody" && <span className="tag fill">selected</span>}
            </div>
          </div>
        </section>
      </div>

      {/* ---------- Footer status ---------- */}
      <footer className="s1-footer">
        <div className={ledClass} title={ledTitle}>
          <span>{ledText}</span>
        </div>
        <div className="row gap-3">
          <button className="btn ghost sm">设置</button>
          <button
            className={"btn primary" + (enterDisabled ? " disabled" : "")}
            disabled={enterDisabled}
            onClick={onEnter}
          >
            {enterLabel}
          </button>
        </div>
      </footer>

      {confirmOpen && (
        <div className="confirm-dialog">
          <div className="box wide">
            <div className="msg">
              <strong>key 似乎无效</strong>
              <br/>{vstate.reason || "请检查后重试"}
              <br/><br/>
              仍要继续进入吗?(仅作为 UI 测试,LLM 调用会失败)
            </div>
            <div className="actions">
              <button className="btn sm" onClick={() => setConfirmOpen(false)}>返回检查</button>
              <button className="btn sm primary" onClick={() => { setConfirmOpen(false); proceed(); }}>
                继续测试
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
