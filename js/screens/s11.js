/* S11 · Dialogue overlay.
   Full-screen takeover. Three regions: scene snapshot (28%), chat history,
   and the input pane (textarea + 3 suggest chips). All LLM calls go via
   MV.llm with prompts from MV.prompts. */
window.MV = window.MV || {};

MV.S11 = function S11() {
  const { useState, useEffect, useRef, useMemo, useCallback } = React;
  const game = MV.useGame();
  const world = MV.data.cache.world;
  const allAgents = MV.data.cache.agents;

  /* dialogue target & context */
  const npcId = MV.session.dialogueWith;
  const npc   = npcId ? MV.data.agentById(npcId) : null;
  const player = (game.playingAs && MV.data.agentById(game.playingAs)) || null;
  const locationId = (MV.session.currentLocation && MV.session.currentLocation()) || (npc && npc.location);
  const location   = MV.data.locationById(locationId);
  const others = useMemo(() => {
    if (!locationId) return [];
    return allAgents.filter(a =>
      a.location === locationId && (!npc || a.id !== npc.id) && (!player || a.id !== player.id)
    );
  }, [allAgents, locationId, npc, player]);
  const time = MV.time.useGameTime({ paused: true });   /* time pauses while S11 is open */

  /* state */
  const [history,     setHistory]     = useState(() => npcId ? MV.dialogue.get(npcId) : []);
  const [suggestions, setSuggestions] = useState([]);
  const [sugLoading,  setSugLoading]  = useState(false);
  const [npcThinking, setNpcThinking] = useState(false);
  const [input,       setInput]       = useState("");
  const [error,       setError]       = useState(null);

  const abortRef = useRef(null);   /* AbortController for in-flight calls */
  const historyEl = useRef(null);

  const isTop = MV.overlays.useTop() === "dialogue";

  /* ----- prompt context ----- */
  const promptCtx = useMemo(() => ({
    npc, player, gameTime: time, location, othersPresent: others,
  }), [npc, player, time, location, others]);

  /* ----- LLM helpers ----- */
  async function llmReply({ opening }) {
    if (!npc) return;
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setNpcThinking(true);
    setError(null);
    try {
      const system = opening
        ? MV.prompts.npcOpeningPrompt(promptCtx)
        : MV.prompts.npcReplySystemPrompt(promptCtx);
      const messages = [{ role: "system", content: system }];
      const tail = MV.dialogue.toLLMMessages(MV.dialogue.get(npc.id));
      messages.push(...tail);
      if (opening && messages.length === 1) {
        messages.push({ role: "user", content: "(玩家走到面前,等你开口)" });
      }
      const { text } = await MV.llm.complete({
        messages, signal: ctrl.signal, temperature: 0.85, maxTokens: 320,
      });
      const clean = (text || "").trim();
      if (!clean) throw new MV.llm.LLMError("parse", "空回复");
      const updated = MV.dialogue.append(npc.id, { role: "npc", content: clean });
      setHistory(updated);
    } catch (e) {
      if (e && e.type === "aborted") return;
      console.error("[s11] npc reply error", e);
      setError(e);
      MV.toast.error(e, { retry: () => llmReply({ opening }) });
    } finally {
      setNpcThinking(false);
    }
  }

  async function llmSuggestions() {
    if (!npc) return;
    const ctrl = new AbortController();
    setSugLoading(true);
    try {
      const system = MV.prompts.suggestionsSystemPrompt(promptCtx);
      const tail = MV.dialogue.toLLMMessages(MV.dialogue.get(npc.id));
      const last = tail[tail.length - 1];
      const lastNpcLine = last && last.role === "assistant" ? last.content : "(NPC 还没开口)";
      const messages = [
        { role: "system", content: system },
        { role: "user", content: `NPC 最后一句:${lastNpcLine}\n请输出 3 个回复选项。` },
      ];
      const { text } = await MV.llm.complete({
        messages, signal: ctrl.signal, temperature: 0.9, maxTokens: 240,
        responseFormat: { type: "json_object" },
      });
      const opts = MV.prompts.parseSuggestions(text);
      if (opts.length === 0) throw new MV.llm.LLMError("parse", "建议解析失败");
      setSuggestions(opts);
    } catch (e) {
      if (e && e.type === "aborted") return;
      console.warn("[s11] suggestions error", e);
      /* keep suggestions empty; the player can still type freely */
      setSuggestions([]);
    } finally {
      setSugLoading(false);
    }
  }

  /* ----- on mount: if history empty, NPC opens; always refresh suggestions ----- */
  useEffect(() => {
    if (!npc) return;
    const run = async () => {
      if (history.length === 0) {
        await llmReply({ opening: true });
      }
      await llmSuggestions();
    };
    run();
    return () => { if (abortRef.current) abortRef.current.abort(); };
    /* eslint-disable-next-line */
  }, []);

  /* ----- auto-scroll ----- */
  useEffect(() => {
    if (!historyEl.current) return;
    historyEl.current.scrollTop = historyEl.current.scrollHeight;
  }, [history, npcThinking]);

  /* ----- send a player message ----- */
  const send = useCallback(async (textToSend) => {
    if (!npc) return;
    const t = (textToSend || "").trim();
    if (!t) return;
    const updated = MV.dialogue.append(npc.id, { role: "player", content: t });
    setHistory(updated);
    setInput("");
    setSuggestions([]);
    await llmReply({ opening: false });
    await llmSuggestions();
    /* eslint-disable-next-line */
  }, [npc]);

  /* keyboard / lifecycle */
  const close = () => {
    if (abortRef.current) abortRef.current.abort();
    MV.overlays.close("dialogue");
    MV.session.dialogueWith = null;
  };
  MV.keyboard.useKeyDown("escape", () => { if (isTop) close(); }, [isTop]);

  /* Enter (no shift) sends; everything else bubbles so ESC closes the overlay
     and the underlying S3 hotkeys still gate on `noOverlay` anyway. */
  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  if (!npc) {
    /* No target — close ourselves cleanly. */
    return null;
  }

  /* ----- render ----- */
  const otherTitle  = `${npc.name} · ${npc.age} · ${npc.role}`;

  return (
    <div className="ov-root s11-root">
      <div className="ov-full s11-full anim-fade">

        <header className="s11-head">
          <div className="left">
            <button className="btn ghost sm" onClick={close}>← 离开对话</button>
            <span className="who">{npc.name}</span>
            <span className="meta">· {location ? location.name : ""}</span>
          </div>
          <div className="right">
            <span className="cap">{MV.time.format(time)}</span>
            <button className="btn ghost sm" onClick={close}>× ESC</button>
          </div>
        </header>

        {/* scene snapshot */}
        <div className="s11-scene">
          <div className="label">
            {location ? location.name : ""}
            <span className="en">{location ? location.short : ""}</span>
          </div>
          {/* a single static NPC sprite + player sprite */}
          <div
            className="sprite npc is-selected"
            style={{ left: "30%", top: "55%" }}
          >
            <span className={"av lg" + (npcThinking ? " thinking" : "")}>{npc.letter}</span>
            <span className="label" style={{ position: "static", color: "var(--ink-3)" }}>{npc.name}</span>
          </div>
          {player && (
            <div className="sprite is-player" style={{ left: "60%", top: "55%" }}>
              <span className="av lg me">{player.letter}</span>
              <span className="label" style={{ position: "static", color: "var(--accent-copper)" }}>你</span>
            </div>
          )}
        </div>

        {/* history */}
        <div className="s11-history" ref={historyEl}>
          {history.length === 0 && !npcThinking && (
            <div className="cap" style={{ textAlign: "center", padding: "20px 0" }}>
              对话尚未开始 · WAITING FOR FIRST LINE
            </div>
          )}
          {history.map((m, i) => (
            m.role === "npc" ? (
              <MV.components.ChatBubble
                key={i}
                side="them"
                letter={npc.letter}
                name={npc.name}
                subtitle={`${npc.age} · ${npc.role}`}
                mood={npc.mood}
                content={m.content}
              />
            ) : (
              <MV.components.ChatBubble
                key={i}
                side="me"
                letter={player ? player.letter : "你"}
                name={"你"}
                subtitle={player ? player.name : ""}
                content={m.content}
              />
            )
          ))}
          {npcThinking && (
            <MV.components.ChatBubble
              side="them"
              letter={npc.letter}
              name={npc.name}
              subtitle={`${npc.age} · ${npc.role}`}
              mood={npc.mood}
              content=""
              thinking
            />
          )}
        </div>

        {/* input */}
        <div className="s11-input">
          <div className="you-line">
            <span>你 · {player ? player.name : ""}</span>
            <span className="hint" style={{ marginLeft: 12 }}>
              建议来自 LLM · 点击直发 · ✎ 可编辑
            </span>
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="你想说..."
            autoFocus
          />
          <div className="send-hint">Enter 发送 · Shift+Enter 换行</div>

          <div className="s11-suggests">
            {sugLoading && [0,1,2].map(i => (
              <MV.components.SuggestChip key={i} placeholder/>
            ))}
            {!sugLoading && suggestions.map((s, i) => (
              <MV.components.SuggestChip
                key={i}
                text={s}
                onSend={() => send(s)}
                onEdit={() => { setInput(s); /* textarea focus */ }}
              />
            ))}
            {!sugLoading && suggestions.length === 0 && (
              <span className="cap" style={{ color: "var(--ink-4)" }}>
                NO SUGGESTIONS · 直接写你想说的话
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
