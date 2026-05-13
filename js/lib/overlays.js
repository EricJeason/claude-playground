/* Global overlay stack. Each entry is a name from KNOWN.
   - push(name): add to top
   - pop():      remove top
   - close(name): remove that one specifically (no-op if not top)
   - clear():    remove all
   - useStack(): React hook returning the live stack array
   - useTop():   the topmost name or null
   Time pauses whenever the stack is non-empty. */
window.MV = window.MV || {};

/* MV.session: imperative callbacks that S3 publishes on mount so overlays
   can request location switches, captures, etc. without prop drilling. */
MV.session = MV.session || {
  requestLocation: null,   /* (locId) => void          — S3 sets this */
  isAdjacent:      null,   /* (toId) => bool           — S3 sets this */
  currentLocation: null,   /* () => locationId         — S3 sets this */
};

MV.overlays = (function () {
  const KNOWN = new Set(["pause", "settings", "map", "saves", "help"]);
  let stack = [];
  const subs = new Set();
  function emit() { subs.forEach(fn => fn(stack.slice())); }

  function push(name) {
    if (!KNOWN.has(name)) throw new Error("unknown overlay: " + name);
    /* never stack the same overlay twice */
    if (stack[stack.length - 1] === name) return;
    /* if it's already lower in the stack, bring it to top by removing duplicates */
    stack = stack.filter(x => x !== name);
    stack.push(name);
    emit();
  }
  function pop() {
    if (!stack.length) return null;
    const top = stack.pop();
    emit();
    return top;
  }
  function close(name) {
    if (!stack.includes(name)) return;
    stack = stack.filter(x => x !== name);
    emit();
  }
  function clear() {
    if (!stack.length) return;
    stack = [];
    emit();
  }
  function top()    { return stack[stack.length - 1] || null; }
  function isOpen() { return stack.length > 0; }
  function has(name) { return stack.includes(name); }

  function useStack() {
    const { useState, useEffect } = React;
    const [s, setS] = useState(stack.slice());
    useEffect(() => {
      const fn = (next) => setS(next);
      subs.add(fn);
      return () => subs.delete(fn);
    }, []);
    return s;
  }
  function useTop() {
    const s = useStack();
    return s[s.length - 1] || null;
  }

  return { push, pop, close, clear, top, isOpen, has, useStack, useTop, KNOWN };
})();
