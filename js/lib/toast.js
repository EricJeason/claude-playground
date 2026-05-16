/* Imperative toast queue. Singleton.
   Usage:  MV.toast.show("简单消息")
           MV.toast.show({ msg, type:'error', actions:[{label,onClick}], ms })
           MV.toast.error(err, { retry: fn })   // shortcut for LLMError-style
           Drop <MV.toast.Host/> near the root once. */
window.MV = window.MV || {};

MV.toast = (function () {
  const subs = new Set();
  const queue = [];                // {id, msg, untilMs, type, actions[]}
  let counter = 0;
  const DEFAULT_MS = 3000;
  const STICKY_MS  = 8000;
  let raf = null;

  function emit() { subs.forEach(fn => fn(queue.slice())); }

  function tick() {
    const now = performance.now();
    const before = queue.length;
    for (let i = queue.length - 1; i >= 0; i--) {
      if (queue[i].untilMs <= now) queue.splice(i, 1);
    }
    if (queue.length !== before) emit();
    if (queue.length > 0) raf = requestAnimationFrame(tick);
    else                  raf = null;
  }

  /* show(string)  → simple toast
     show({msg, type, actions, ms}) → rich toast */
  function show(payload, ms) {
    const id = ++counter;
    let entry;
    if (typeof payload === "string") {
      entry = { id, msg: payload, type: "info", actions: [], untilMs: performance.now() + (ms || DEFAULT_MS) };
    } else {
      entry = {
        id,
        msg:     payload.msg || "",
        type:    payload.type || "info",
        actions: payload.actions || [],
        untilMs: performance.now() + (payload.ms || ms || (payload.type === "error" ? STICKY_MS : DEFAULT_MS)),
      };
    }
    queue.push(entry);
    if (queue.length > 4) queue.splice(0, queue.length - 4);
    emit();
    if (raf == null) raf = requestAnimationFrame(tick);
    return id;
  }

  function dismiss(id) {
    const i = queue.findIndex(t => t.id === id);
    if (i >= 0) { queue.splice(i, 1); emit(); }
  }

  /* friendly wrapper for LLMError: maps .type to the canonical user message
     and gives the caller a slot for [重试] + always-present [详情]. */
  const ERROR_LABELS = {
    auth:       "API key 无效,请检查",
    rate_limit: "请求太频繁,请稍后重试",
    server:     "LLM 服务暂时不可用",
    network:    "网络错误,请重试",
    timeout:    "网络错误,请重试",
    parse:      "服务回包异常",
    aborted:    "调用已取消",
  };
  function error(err, opts) {
    opts = opts || {};
    const type = (err && err.type) || "network";
    const msg  = opts.msg || ERROR_LABELS[type] || (err && err.message) || "发生错误";
    const actions = [];
    if (opts.retry && type !== "auth" && type !== "aborted") {
      actions.push({ label: "重试", onClick: opts.retry });
    }
    actions.push({
      label: "详情",
      onClick: () => {
        /* eslint-disable-next-line no-console */
        console.error("[mv-llm-error]", { type, err, opts });
      },
    });
    return show({ msg, type: "error", actions });
  }

  function useToasts() {
    const { useState, useEffect } = React;
    const [list, setList] = useState(queue.slice());
    useEffect(() => {
      const fn = (next) => setList(next);
      subs.add(fn);
      return () => subs.delete(fn);
    }, []);
    return list;
  }

  function Host() {
    const list = useToasts();
    if (!list.length) return null;
    return (
      <div className="toast-host">
        {list.map(t => (
          <div key={t.id} className={"toast" + (t.type === "error" ? " is-error" : "")}>
            <span className="toast-msg">{t.msg}</span>
            {(t.actions || []).map((a, i) => (
              <button
                key={i}
                className="toast-action"
                onClick={() => { try { a.onClick && a.onClick(); } finally { dismiss(t.id); } }}
              >{a.label}</button>
            ))}
          </div>
        ))}
      </div>
    );
  }

  return { show, error, dismiss, useToasts, Host };
})();
