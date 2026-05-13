/* Tiny typed wrapper around localStorage.
   All Murk-Valley keys are prefixed `mv_` so we can spot them in devtools. */
window.MV = window.MV || {};

MV.storage = (function () {
  function get(key, defaultVal) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null || raw === undefined) return defaultVal;
      if (typeof defaultVal === "object" && defaultVal !== null) {
        try { return JSON.parse(raw); } catch { return defaultVal; }
      }
      if (typeof defaultVal === "boolean") return raw === "1";
      return raw;
    } catch {
      return defaultVal;
    }
  }

  function set(key, val) {
    try {
      if (val === null || val === undefined) {
        localStorage.removeItem(key);
        return;
      }
      if (typeof val === "object")  localStorage.setItem(key, JSON.stringify(val));
      else if (typeof val === "boolean") localStorage.setItem(key, val ? "1" : "0");
      else localStorage.setItem(key, String(val));
    } catch {
      /* quota / private-mode: silently ignore in MVP. */
    }
  }

  const KEYS = {
    apiKey:        "mv_api_key",
    apiChannel:    "mv_api_channel",
    apiModel:      "mv_api_model",
    nonThinking:   "mv_non_thinking",
    viewMode:      "mv_view_mode",
    playingAs:     "mv_playing_as",
    saves:         "mv_saves",
    settings:      "mv_settings",
  };

  const SETTINGS_DEFAULTS = {
    tempo:           60,         // real seconds per game hour
    autoPause:       true,       // auto-pause when idle (UI only in v0.3)
    fontSize:        "medium",   // small | medium | large
    letterboxColor:  "brown",    // black | brown
    theme:           "paper",    // only one allowed in v0.3
    dev: {
      teleport:         false,
      showArchiveMind:  false,
      debugInfo:        false,
      skipKeyCheck:     false,
      llmLog:           false,
    },
  };

  function mergeSettings(stored) {
    const s = stored && typeof stored === "object" ? stored : {};
    return {
      ...SETTINGS_DEFAULTS,
      ...s,
      dev: { ...SETTINGS_DEFAULTS.dev, ...(s.dev || {}) },
    };
  }

  const DEFAULTS = {
    apiKey:       "",
    apiChannel:   "openrouter",
    apiModel:     "deepseek/deepseek-v4-pro",
    nonThinking:  true,
    viewMode:     "embody",
    playingAs:    "",
    saves:        [],
    settings:     SETTINGS_DEFAULTS,
  };

  function loadAll() {
    return {
      apiKey:       get(KEYS.apiKey,      DEFAULTS.apiKey),
      apiChannel:   get(KEYS.apiChannel,  DEFAULTS.apiChannel),
      apiModel:     get(KEYS.apiModel,    DEFAULTS.apiModel),
      nonThinking:  get(KEYS.nonThinking, DEFAULTS.nonThinking),
      viewMode:     get(KEYS.viewMode,    DEFAULTS.viewMode),
      playingAs:    get(KEYS.playingAs,   DEFAULTS.playingAs),
      saves:        get(KEYS.saves,       DEFAULTS.saves),
      settings:     mergeSettings(get(KEYS.settings, DEFAULTS.settings)),
    };
  }

  return { get, set, loadAll, mergeSettings, KEYS, DEFAULTS, SETTINGS_DEFAULTS };
})();
