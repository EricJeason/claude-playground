/* Game-time advancement.
   Spec: 1 real second = 1 game minute. 60 game minutes = 1 hour. 24h = 1 day.
   useGameTime({ paused }) returns { day, hour, minute } and ticks itself. */
window.MV = window.MV || {};

MV.time = (function () {
  const REAL_MS_PER_GAME_MINUTE = 1000;
  const INITIAL = { day: 1, hour: 8, minute: 0 };

  function advance({ day, hour, minute }, steps = 1) {
    let m = minute + steps;
    let h = hour;
    let d = day;
    while (m >= 60) { m -= 60; h += 1; }
    while (h >= 24) { h -= 24; d += 1; }
    return { day: d, hour: h, minute: m };
  }

  function format(t) {
    const hh = t.hour;
    let label;
    if (hh < 6)        label = `凌晨 ${hh} 时`;
    else if (hh < 12)  label = `上午 ${hh} 时`;
    else if (hh === 12) label = `中午 12 时`;
    else if (hh < 18)  label = `下午 ${hh - 12} 时`;
    else if (hh < 20)  label = `傍晚 ${hh - 12} 时`;
    else               label = `夜晚 ${hh - 12} 时`;
    return `第 ${t.day} 天 · ${label}`;
  }

  function shortClock(t) {
    return `${String(t.hour).padStart(2, "0")}:${String(t.minute).padStart(2, "0")}`;
  }

  /* progress of the current hour, 0..1 */
  function hourProgress(t) {
    return t.minute / 60;
  }

  function useGameTime({ paused }) {
    const { useState, useEffect, useRef } = React;
    const [t, setT] = useState(INITIAL);
    const lastRef = useRef(performance.now());
    const accumRef = useRef(0);
    const pausedRef = useRef(paused);
    useEffect(() => { pausedRef.current = paused; }, [paused]);

    useEffect(() => {
      let raf;
      const loop = (now) => {
        const dt = now - lastRef.current;
        lastRef.current = now;
        if (!pausedRef.current) {
          accumRef.current += dt;
          if (accumRef.current >= REAL_MS_PER_GAME_MINUTE) {
            const steps = Math.floor(accumRef.current / REAL_MS_PER_GAME_MINUTE);
            accumRef.current -= steps * REAL_MS_PER_GAME_MINUTE;
            setT(prev => advance(prev, steps));
          }
        }
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
      return () => cancelAnimationFrame(raf);
    }, []);

    return t;
  }

  return { useGameTime, advance, format, shortClock, hourProgress, INITIAL };
})();
