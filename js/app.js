/* Root <App/>: hash router + game-state Context + boot.
   Hash routes:  #/s1  #/s1_5  #/s2  #/s3   (empty hash defaults to #/s1) */
const { useState, useEffect, useCallback, useMemo, createContext, useContext } = React;

const ROUTES = ["#/s1", "#/s1_5", "#/s2", "#/s3"];
const DEFAULT_ROUTE = "#/s1";

function readHash() {
  const h = window.location.hash || DEFAULT_ROUTE;
  return ROUTES.includes(h) ? h : DEFAULT_ROUTE;
}

function setHash(path) {
  if (window.location.hash !== path) window.location.hash = path;
}

/* ---------- Game context ---------- */
const GameCtx = createContext(null);
MV.useGame = function useGame() {
  const ctx = useContext(GameCtx);
  if (!ctx) throw new Error("useGame() outside <GameProvider>");
  return ctx;
};
MV.setHash = setHash;

function GameProvider({ children }) {
  const initial = MV.storage.loadAll();
  const [state, setState] = useState(initial);

  /* generic field setter that also writes through to localStorage */
  const update = useCallback((patch) => {
    setState(prev => {
      const next = { ...prev, ...patch };
      const K = MV.storage.KEYS;
      if ("apiKey"      in patch) MV.storage.set(K.apiKey,      next.apiKey);
      if ("apiChannel"  in patch) MV.storage.set(K.apiChannel,  next.apiChannel);
      if ("apiModel"    in patch) MV.storage.set(K.apiModel,    next.apiModel);
      if ("nonThinking" in patch) MV.storage.set(K.nonThinking, next.nonThinking);
      if ("viewMode"    in patch) MV.storage.set(K.viewMode,    next.viewMode);
      if ("playingAs"   in patch) MV.storage.set(K.playingAs,   next.playingAs);
      if ("saves"       in patch) MV.storage.set(K.saves,       next.saves);
      if ("settings"    in patch) MV.storage.set(K.settings,    next.settings);
      return next;
    });
  }, []);

  const hasSaves = Array.isArray(state.saves) && state.saves.length > 0;

  const value = useMemo(() => ({ ...state, hasSaves, update }),
                        [state, hasSaves, update]);

  return <GameCtx.Provider value={value}>{children}</GameCtx.Provider>;
}

/* ---------- Router ---------- */
function Router() {
  const [route, setRoute] = useState(readHash());
  const [dataReady, setDataReady] = useState(!!MV.data.cache);

  useEffect(() => {
    const onChange = () => setRoute(readHash());
    window.addEventListener("hashchange", onChange);
    if (!window.location.hash) setHash(DEFAULT_ROUTE);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);

  useEffect(() => {
    if (dataReady) return;
    MV.data.load().then(() => setDataReady(true));
  }, [dataReady]);

  if (!dataReady) {
    return (
      <div className="screen center">
        <div className="cap">LOADING · MURK VALLEY</div>
      </div>
    );
  }

  switch (route) {
    case "#/s1":   return <MV.S1 />;
    case "#/s1_5": return <MV.S1_5 />;
    case "#/s2":   return <MV.S2 />;
    case "#/s3":   return <MV.S3 />;
    default:       return <MV.S1 />;
  }
}

/* ---------- Mount ---------- */
function App() {
  return (
    <GameProvider>
      <Router />
    </GameProvider>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
