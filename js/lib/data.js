/* JSON loader for agents.json + world.json. Cached after first fetch. */
window.MV = window.MV || {};

MV.data = (function () {
  let cache = null;
  let pending = null;

  async function load() {
    if (cache) return cache;
    if (pending) return pending;
    pending = (async () => {
      const [agents, world] = await Promise.all([
        fetch("data/agents.json").then(r => r.json()),
        fetch("data/world.json").then(r => r.json()),
      ]);
      cache = { agents, world };
      return cache;
    })();
    return pending;
  }

  function agentById(id) {
    if (!cache) return null;
    return cache.agents.find(a => a.id === id) || null;
  }

  function locationById(id) {
    if (!cache) return null;
    return cache.world.locations.find(l => l.id === id) || null;
  }

  return { load, agentById, locationById, get cache() { return cache; } };
})();
