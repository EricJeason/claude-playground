/* Global keyboard state + one-shot subscriptions.
   Usage:
     const keys = MV.keyboard.useKeys();             // live Set of held keys
     MV.keyboard.useKeyDown('Escape', () => ...);    // single press handler
   Normalisation: WASD becomes their lowercase form ('w','a','s','d');
   arrows become 'up'/'down'/'left'/'right'; letter keys lowercase. */
window.MV = window.MV || {};

MV.keyboard = (function () {
  const held = new Set();
  const listeners = new Set();
  const downHandlers = new Map();   // key -> Set<fn>

  function norm(e) {
    if (e.key === "ArrowUp")    return "up";
    if (e.key === "ArrowDown")  return "down";
    if (e.key === "ArrowLeft")  return "left";
    if (e.key === "ArrowRight") return "right";
    if (e.key === "Escape")     return "escape";
    if (e.key === " ")          return "space";
    if (e.key.length === 1)     return e.key.toLowerCase();
    return e.key;
  }

  function emit() { listeners.forEach(fn => fn(held)); }

  function onDown(e) {
    /* swallow only the gameplay-relevant keys to avoid stealing browser shortcuts */
    const k = norm(e);
    const gameKeys = new Set([
      "w","a","s","d","up","down","left","right",
      "e","q","m","c","escape","f1",
    ]);
    if (gameKeys.has(k)) e.preventDefault();
    if (held.has(k)) return;
    held.add(k);
    emit();
    const handlers = downHandlers.get(k);
    if (handlers) handlers.forEach(fn => fn());
  }

  function onUp(e) {
    const k = norm(e);
    if (!held.has(k)) return;
    held.delete(k);
    emit();
  }

  function onBlur() {
    if (!held.size) return;
    held.clear();
    emit();
  }

  let installed = false;
  function install() {
    if (installed) return;
    installed = true;
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup",   onUp);
    window.addEventListener("blur",    onBlur);
  }

  /* React hooks */
  function useKeys() {
    install();
    const { useState, useEffect } = React;
    const [snapshot, setSnapshot] = useState(() => new Set(held));
    useEffect(() => {
      const fn = (next) => setSnapshot(new Set(next));
      listeners.add(fn);
      return () => listeners.delete(fn);
    }, []);
    return snapshot;
  }

  function useKeyDown(key, handler, deps) {
    install();
    const { useEffect } = React;
    useEffect(() => {
      const set = downHandlers.get(key) || new Set();
      set.add(handler);
      downHandlers.set(key, set);
      return () => set.delete(handler);
    }, deps || []);
  }

  /* Imperative `isDown(key)` for animation frames (avoids re-render thrash). */
  function isDown(key) { return held.has(key); }

  return { useKeys, useKeyDown, isDown, install };
})();
