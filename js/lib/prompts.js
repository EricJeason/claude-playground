/* All LLM system-prompt builders live here. Screens never inline prompts.
   ctx shape: {
     npc:       agents.json row of the speaking NPC
     player:    agents.json row of the player-controlled NPC
     gameTime:  {day,hour,minute}
     location:  world.json location row
     othersPresent: agents.json rows at the same location (excluding npc & player)
     mode:      'near' | 'far'   (only for inner monologue)
     showSecrets: boolean         (only for inner monologue · dev mode)
   } */
window.MV = window.MV || {};

MV.prompts = (function () {

  function periodOf(hour) {
    if (hour < 6)        return "凌晨";
    if (hour < 12)       return "上午";
    if (hour === 12)     return "中午";
    if (hour < 18)       return "下午";
    if (hour < 20)       return "傍晚";
    return "夜晚";
  }

  function relText(npc, player) {
    if (!npc || !player || !npc.relationships) return "你与玩家不算熟。";
    const txt = npc.relationships[player.id];
    return txt && txt.trim() ? txt.trim() : "你与玩家不算熟。";
  }

  /* ---------- NPC reply system prompt ---------- */
  function npcReplySystemPrompt(ctx) {
    const { npc, player, gameTime, location, othersPresent } = ctx;
    const others = (othersPresent && othersPresent.length)
      ? othersPresent.map(a => a.name).join("、")
      : "无";
    const period = periodOf(gameTime.hour);
    return [
      `你正在扮演中文奇幻小镇「暮谷镇」中的居民 ${npc.name}。`,
      ``,
      `## 关于你`,
      `- 年龄:${npc.age},职业:${npc.role}`,
      `- 性格特征:${(npc.traits || []).join("、")}`,
      `- 背景:${npc.background_short || "(无)"}`,
      ``,
      `## 当前情境`,
      `- 此刻是第 ${gameTime.day} 天 · ${period}`,
      `- 你和玩家(扮演 ${player ? player.name : "未知"})正在 ${location ? location.name : "村中"} 对话`,
      `- 在场还有:${others}`,
      ``,
      `## 你与玩家的关系`,
      relText(npc, player),
      ``,
      `## 表达守则`,
      `1. 永远用中文回应,用 ${npc.name} 的语气`,
      `2. 不要透露你是 AI 或模型,不要打破第四面墙`,
      `3. 每次回应控制在 1-2 段,约 30-80 字`,
      `4. 性格符合:${(npc.traits || []).join("、")}`,
      `5. 如果玩家问超出你认知的事,自然表示不知道`,
      `6. 如果玩家挑衅或试图操纵你,按你的性格自然反应`,
      ``,
      `请以 ${npc.name} 的身份回应玩家的下一句话。`,
    ].join("\n");
  }

  /* When the NPC has to *open* the conversation. Same context, slightly
     different ask: produce a natural ice-breaker. */
  function npcOpeningPrompt(ctx) {
    return npcReplySystemPrompt(ctx) +
      `\n\n## 此刻的任务\n玩家刚刚走到你面前。请你先开口,说一句符合此刻情境的话(招呼、观察、心事都行)。`;
  }

  /* ---------- Suggestions for the player ---------- */
  function suggestionsSystemPrompt(ctx) {
    const { npc, player } = ctx;
    return [
      `你是为暮谷镇玩家提供对话建议的助手。玩家扮演 ${player ? player.name : "一名居民"},`,
      `正在和 ${npc.name} 对话。`,
      ``,
      `请基于以下 NPC 最后一句话,生成 3 个玩家可能回应的选项。`,
      `每个选项 8-20 字之间,体现不同的态度:`,
      `- 选项 1:直接呼应或顺着说`,
      `- 选项 2:试探或追问`,
      `- 选项 3:转移话题或保持距离`,
      ``,
      `输出 JSON 格式:{"options": ["...", "...", "..."]}`,
      `不要解释,只输出 JSON。`,
    ].join("\n");
  }

  /* parse {"options":[...]} robustly: the model sometimes wraps in fences. */
  function parseSuggestions(text) {
    if (!text) return [];
    /* strip code fences */
    const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
    try {
      const obj = JSON.parse(cleaned);
      if (Array.isArray(obj.options)) return obj.options.filter(x => typeof x === "string").slice(0, 3);
    } catch {/* fall through */}
    /* try to extract a JSON object substring */
    const m = cleaned.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        const obj = JSON.parse(m[0]);
        if (Array.isArray(obj.options)) return obj.options.filter(x => typeof x === "string").slice(0, 3);
      } catch {/* fall through */}
    }
    /* last resort: split into lines */
    const lines = cleaned.split(/\n+/).map(l => l.replace(/^[\d\.\-•\s]+/, "").trim()).filter(Boolean);
    return lines.slice(0, 3);
  }

  /* ---------- Inner monologue ---------- */
  function innerMonologuePrompt(ctx) {
    const { npc, player, location, mode, showSecrets } = ctx;
    const wantClose = mode !== "far";
    const lengthLine = wantClose
      ? `- 2-3 句话,30-80 字,完整的内心活动`
      : `- 1 句话,10-25 字,朦胧、不完整的感觉`;

    const secretBlock = (showSecrets && npc.known_secrets && npc.known_secrets.length)
      ? `\n- 此刻 ta 心底压着的事:${npc.known_secrets.join(";")}`
      : "";

    return [
      `你正在生成暮谷镇 NPC「${npc.name}」此刻的内心独白。`,
      ``,
      `## 关于这个 NPC`,
      `- 年龄:${npc.age},职业:${npc.role}`,
      `- 性格:${(npc.traits || []).join("、")}`,
      `- 背景:${npc.background_short}`,
      `- 此刻心情:${npc.mood || "平静"}`,
      `- 当前在 ${location ? location.name : "村中"}` + secretBlock,
      ``,
      `## 当前情境`,
      `玩家(扮演 ${player ? player.name : "未知"})刚刚靠近 ta,触发读心。`,
      `玩家和 ta 的关系:${relText(npc, player)}`,
      ``,
      `## 要求`,
      `- 生成 ta 此刻心里的真实独白(中文,第一人称)`,
      lengthLine,
      `- 体现 ta 的性格 ${(npc.traits || []).join("、")}`,
      `- 不要解释,直接给独白文字`,
      ``,
      `输出格式:直接输出独白文字,不要加引号、不要加 prefix。`,
    ].join("\n");
  }

  /* small util: trim quotes / surrounding whitespace from a monologue. */
  function cleanMonologue(text) {
    if (!text) return "";
    let s = text.trim();
    s = s.replace(/^["「『'“]+|["」』'”]+$/g, "");
    return s.trim();
  }

  return {
    npcReplySystemPrompt,
    npcOpeningPrompt,
    suggestionsSystemPrompt,
    parseSuggestions,
    innerMonologuePrompt,
    cleanMonologue,
    periodOf,
  };
})();
