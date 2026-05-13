/* Minimap (top-right). 4 hex nodes + edges + a small player dot.
   Click → toast S8. The "M 放大" hint mirrors the M key. */
window.MV = window.MV || {};
MV.components = MV.components || {};

/* layout coords inside the mini-canvas, in percentages */
const NODE_POS = {
  lao_song_plaza:       { x: 50, y: 50 },
  north_frost_workshop: { x: 50, y: 12 },
  warm_valley_farm:     { x: 50, y: 88 },
  silent_tower_ruin:    { x: 88, y: 50 },
};

/* edge list (rendered once; the data file's adjacency may include both
   directions which would draw duplicate lines, so we use a static list). */
const EDGES = [
  ["lao_song_plaza", "north_frost_workshop"],
  ["lao_song_plaza", "warm_valley_farm"],
  ["lao_song_plaza", "silent_tower_ruin"],
  ["north_frost_workshop", "silent_tower_ruin"],
];

MV.components.Minimap = function Minimap({ locations, currentId, playerPctInLoc }) {
  const onClick = () => MV.toast.show("S8 全屏地图将在下个 PR 实装");

  const player = NODE_POS[currentId];

  return (
    <div className="s3-mini" onClick={onClick} title="M 放大">
      <div className="mini-head">
        <span>MAP · 4 / 4</span>
        <span>M 放大</span>
      </div>
      <div className="mini-canvas">
        {EDGES.map(([a, b], i) => {
          const A = NODE_POS[a], B = NODE_POS[b];
          if (!A || !B) return null;
          const dx = B.x - A.x, dy = B.y - A.y;
          const len = Math.sqrt(dx * dx + dy * dy);
          const ang = Math.atan2(dy, dx) * (180 / Math.PI);
          return (
            <span
              key={i}
              className="mini-edge"
              style={{
                left:   A.x + "%",
                top:    A.y + "%",
                width:  len + "%",
                transform: `rotate(${ang}deg)`,
              }}
            />
          );
        })}
        {locations.map(loc => {
          const p = NODE_POS[loc.id];
          if (!p) return null;
          return (
            <span
              key={loc.id}
              className={"mini-node" + (loc.id === currentId ? " is-current" : "")}
              style={{ left: p.x + "%", top: p.y + "%" }}
              title={loc.name}
            >
              {loc.name[0]}
            </span>
          );
        })}
        {player && (
          <span
            className="mini-player"
            style={{ left: player.x + "%", top: (player.y + 14) + "%" }}
          />
        )}
      </div>
    </div>
  );
};
