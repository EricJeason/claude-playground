/* Tiny imperative toast queue. Singleton.
   Usage:  MV.toast.show("S?? 将在下个 PR 实装")
           Drop <MV.toast.Host/> somewhere near the root. */
window.MV = window.MV || {};

MV.toast = (function () {
  const subs = new Set();
  const queue = [];                // {id, msg, untilMs}
  let counter = 0;
  const DEFAULT_MS = 3000;
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

  function show(msg, ms = DEFAULT_MS) {
    const id = ++counter;
    queue.push({ id, msg, untilMs: performance.now() + ms });
    if (queue.length > 4) queue.splice(0, queue.length - 4);
    emit();
    if (raf == null) raf = requestAnimationFrame(tick);
    return id;
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
          <div key={t.id} className="toast">{t.msg}</div>
        ))}
      </div>
    );
  }

  return { show, useToasts, Host };
})();
