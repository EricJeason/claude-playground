/* Per-NPC dialogue history stored at localStorage.mv_dialogue_history.
   Shape: { [npc_id]: Message[] }   Message = {role, content, timestamp}
   Cap: 40 messages per NPC (= 20 turns). Sliding window when over. */
window.MV = window.MV || {};

MV.dialogue = (function () {
  const KEY = "mv_dialogue_history";
  const MAX_PER_NPC = 40;
  const LLM_CONTEXT_TURNS = 6;   /* sent to the model: last 6 turns = 12 messages */

  function readAll() {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  }
  function writeAll(obj) {
    try { localStorage.setItem(KEY, JSON.stringify(obj)); } catch {/* quota */}
  }

  function get(npcId) {
    const all = readAll();
    return Array.isArray(all[npcId]) ? all[npcId] : [];
  }

  function append(npcId, msg) {
    const all = readAll();
    const list = Array.isArray(all[npcId]) ? all[npcId] : [];
    const m = { role: msg.role, content: msg.content, timestamp: msg.timestamp || Date.now() };
    list.push(m);
    if (list.length > MAX_PER_NPC) list.splice(0, list.length - MAX_PER_NPC);
    all[npcId] = list;
    writeAll(all);
    return list;
  }

  function clear(npcId) {
    const all = readAll();
    delete all[npcId];
    writeAll(all);
  }
  function clearAll() { writeAll({}); }

  /* slice last N turns for the model context. role is 'player' or 'npc'.
     The mapper assigns the speaker's pronoun in the user / assistant
     channels so the model can follow the back-and-forth. */
  function toLLMMessages(history) {
    const cutoff = LLM_CONTEXT_TURNS * 2;
    const tail = history.slice(-cutoff);
    return tail.map(m => ({
      role: m.role === "player" ? "user" : "assistant",
      content: m.content,
    }));
  }

  return { get, append, clear, clearAll, toLLMMessages, MAX_PER_NPC, LLM_CONTEXT_TURNS };
})();
