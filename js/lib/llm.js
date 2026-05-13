/* LLM fetch wrapper: complete() + validateKey(). One transport for the whole
   game. Reads channel / key / model / non-thinking from localStorage at call
   time so live settings changes apply immediately. */
window.MV = window.MV || {};

MV.llm = (function () {
  const DEFAULT_TIMEOUT_MS = 30_000;
  const RETRY_BACKOFF_MS   = 2_000;

  /* ---------- error class ---------- */
  class LLMError extends Error {
    constructor(type, message, opts) {
      super(message);
      this.type   = type;                /* auth|rate_limit|server|network|timeout|parse|aborted */
      this.status = opts && opts.status;
      this.detail = opts && opts.detail;
    }
  }

  /* ---------- mock hook ---------- */
  let _mockHandler = null;
  function __setMock(fn) { _mockHandler = fn; }
  function __clearMock()  { _mockHandler = null; }

  /* ---------- key/channel utilities ---------- */
  function getConfig() {
    return {
      key:         MV.storage.get(MV.storage.KEYS.apiKey,      ""),
      channel:     MV.storage.get(MV.storage.KEYS.apiChannel,  "openrouter"),
      model:       MV.storage.get(MV.storage.KEYS.apiModel,    "deepseek/deepseek-v4-pro"),
      nonThinking: MV.storage.get(MV.storage.KEYS.nonThinking, true),
    };
  }
  function endpointFor(channel) {
    if (channel === "deepseek") return "https://api.deepseek.com/chat/completions";
    return "https://openrouter.ai/api/v1/chat/completions";
  }

  /* hash for the validation cache. NOT cryptographic — just an identifier
     that survives in localStorage without storing the full key. */
  function keyFingerprint(key) {
    if (!key) return "";
    if (key.length <= 16) return key;
    return key.slice(0, 12) + ".." + key.slice(-4);
  }

  /* ---------- logging ---------- */
  function logEnabled() {
    try {
      const s = MV.storage.get(MV.storage.KEYS.settings, {});
      return !!(s && s.dev && s.dev.llmLog);
    } catch { return false; }
  }
  function log(label, payload) {
    if (!logEnabled()) return;
    /* eslint-disable-next-line no-console */
    console.log("[mv-llm] " + label, payload);
  }

  /* ---------- the call ---------- */
  async function doFetch({ key, channel, model, body, signal, timeoutMs }) {
    const url = endpointFor(channel);
    const headers = {
      "Authorization": "Bearer " + key,
      "Content-Type":  "application/json",
    };
    if (channel === "openrouter") {
      headers["HTTP-Referer"] = location.origin + location.pathname;
      headers["X-Title"]      = "暮谷镇 Murk Valley";
    }

    /* compose AbortController with caller's signal so both can cancel us. */
    const ctrl = new AbortController();
    const onAbort = () => ctrl.abort();
    if (signal) {
      if (signal.aborted) ctrl.abort();
      else signal.addEventListener("abort", onAbort, { once: true });
    }
    const timer = setTimeout(() => ctrl.abort("__mv_timeout__"), timeoutMs || DEFAULT_TIMEOUT_MS);

    const t0 = performance.now();
    let resp;
    try {
      resp = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });
    } catch (e) {
      clearTimeout(timer);
      if (signal && signal.aborted) throw new LLMError("aborted", "调用被中止");
      if (ctrl.signal.reason === "__mv_timeout__" || /abort/i.test(String(e))) {
        throw new LLMError("timeout", "请求超时");
      }
      throw new LLMError("network", "网络错误: " + (e.message || e), { detail: e });
    } finally {
      if (signal) signal.removeEventListener("abort", onAbort);
    }
    clearTimeout(timer);

    if (resp.status === 401 || resp.status === 403) {
      throw new LLMError("auth", "API key 无效", { status: resp.status });
    }
    if (resp.status === 429) {
      throw new LLMError("rate_limit", "请求太频繁", { status: resp.status });
    }
    if (resp.status >= 500) {
      throw new LLMError("server", "LLM 服务暂时不可用", { status: resp.status });
    }
    if (!resp.ok) {
      const txt = await resp.text().catch(() => "");
      throw new LLMError("network", "HTTP " + resp.status, { status: resp.status, detail: txt });
    }

    let json;
    try { json = await resp.json(); }
    catch (e) { throw new LLMError("parse", "服务回包异常", { detail: e }); }

    const durationMs = Math.round(performance.now() - t0);
    return { json, durationMs };
  }

  /* Body builder for chat completions. Most providers follow OpenAI shape. */
  function buildBody({ messages, model, nonThinking, opts }) {
    const body = {
      model,
      messages,
      temperature: (opts && opts.temperature !== undefined) ? opts.temperature : 0.8,
      max_tokens:  (opts && opts.maxTokens   !== undefined) ? opts.maxTokens   : 600,
    };
    if (opts && opts.responseFormat) body.response_format = opts.responseFormat;
    /* OpenRouter accepts a reasoning block; off for non-thinking mode. */
    if (nonThinking) body.reasoning = { enabled: false };
    return body;
  }

  /* parse completion → plain text. Handles standard OpenAI shape + reasoning. */
  function extractText(json) {
    if (!json || !Array.isArray(json.choices) || !json.choices.length) return "";
    const c = json.choices[0];
    if (c.message && typeof c.message.content === "string") return c.message.content;
    if (typeof c.text === "string") return c.text;
    return "";
  }

  /* ---------- public: complete() ---------- */
  async function complete({ messages, signal, onChunk, ...opts } = {}) {
    if (_mockHandler) {
      log("complete (mocked)", { messages, opts });
      return await _mockHandler({ messages, signal, ...opts });
    }
    if (!Array.isArray(messages) || !messages.length) {
      throw new LLMError("parse", "messages required");
    }

    const cfg = getConfig();
    if (!cfg.key) throw new LLMError("auth", "API key 未配置");

    /* model normalisation for OpenRouter (`deepseek/deepseek-v4-pro`) vs
       DeepSeek official (whatever the user pasted). */
    let model = (opts.model || cfg.model || "").trim();
    if (cfg.channel === "openrouter" && model && !model.includes("/")) {
      model = "deepseek/" + model;
    }
    const body = buildBody({ messages, model, nonThinking: cfg.nonThinking, opts });
    log("complete request", { url: endpointFor(cfg.channel), body });

    /* retry loop: at most one auto-retry on transient errors. */
    let lastError = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const { json, durationMs } = await doFetch({
          key: cfg.key, channel: cfg.channel, model,
          body, signal,
          timeoutMs: opts.timeoutMs,
        });
        log("complete response", { durationMs, json });
        const text = extractText(json);
        return {
          text,
          finishReason: json.choices && json.choices[0] && json.choices[0].finish_reason,
          usage: json.usage || null,
          durationMs,
          raw: json,
        };
      } catch (e) {
        lastError = e;
        if (e.type === "auth")    break;     /* never retry auth */
        if (e.type === "aborted") break;
        if (e.type === "parse")   break;
        if (attempt === 0 && (e.type === "rate_limit" || e.type === "server" ||
                              e.type === "network"     || e.type === "timeout")) {
          log("retrying after error", e.type);
          await new Promise(r => setTimeout(r, RETRY_BACKOFF_MS));
          continue;
        }
        break;
      }
    }
    throw lastError;
  }

  /* ---------- public: validateKey() ---------- */
  async function validateKey(key, channel, model) {
    if (!key) return { ok: false, reason: "key 未填写", type: "auth" };
    /* one cheap call. We accept any 2xx response as proof of working creds. */
    try {
      if (_mockHandler) {
        const r = await _mockHandler({
          __validate: true, key, channel, model,
          messages: [{ role: "user", content: "hi" }],
        });
        if (r && r.ok === false) return r;
        return { ok: true };
      }
      const url = endpointFor(channel);
      const headers = {
        "Authorization": "Bearer " + key,
        "Content-Type":  "application/json",
      };
      if (channel === "openrouter") {
        headers["HTTP-Referer"] = location.origin + location.pathname;
        headers["X-Title"]      = "暮谷镇 Murk Valley";
      }
      const m = channel === "openrouter" && model && !model.includes("/") ? "deepseek/" + model : model;
      const body = { model: m, messages: [{ role: "user", content: "hi" }], max_tokens: 1 };
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort("__mv_timeout__"), 12_000);
      let resp;
      try {
        resp = await fetch(url, { method: "POST", headers, body: JSON.stringify(body), signal: ctrl.signal });
      } catch (e) {
        clearTimeout(timer);
        return { ok: false, reason: "网络错误", type: "network", detail: String(e) };
      }
      clearTimeout(timer);
      if (resp.status === 401 || resp.status === 403) return { ok: false, reason: "key 无效", type: "auth", status: resp.status };
      if (resp.status === 429) return { ok: false, reason: "调用频率超限", type: "rate_limit", status: resp.status };
      if (resp.status >= 500)  return { ok: false, reason: "服务暂不可用", type: "server", status: resp.status };
      if (!resp.ok)            return { ok: false, reason: "HTTP " + resp.status, type: "network", status: resp.status };
      return { ok: true };
    } catch (e) {
      return { ok: false, reason: e.message || "未知错误", type: "network", detail: e };
    }
  }

  /* ---------- validation cache (24h) ---------- */
  const CACHE_KEY = "mv_key_validated";
  const CACHE_TTL_MS = 24 * 3600 * 1000;
  function readCache() {
    try { const raw = localStorage.getItem(CACHE_KEY); return raw ? JSON.parse(raw) : null; }
    catch { return null; }
  }
  function writeCache(v) {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(v)); } catch {}
  }
  function readCachedFor({ key, channel, model }) {
    const c = readCache();
    if (!c) return null;
    const fp = keyFingerprint(key);
    if (c.hash !== fp) return null;
    if (c.channel !== channel) return null;
    if (c.model !== model) return null;
    if (Date.now() - c.validatedAt > CACHE_TTL_MS) return null;
    return c;
  }
  function saveCache({ key, channel, model, ok, reason }) {
    writeCache({
      hash: keyFingerprint(key),
      channel, model,
      validatedAt: Date.now(),
      ok: !!ok,
      reason: reason || null,
    });
  }

  return {
    LLMError,
    complete, validateKey,
    __setMock, __clearMock,
    keyFingerprint, readCachedFor, saveCache,
    getConfig, endpointFor,
  };
})();
