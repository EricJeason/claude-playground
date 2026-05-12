/* Stage = the playable area of the current location.
   Renders the header, NPC sprites, the player sprite, and edge prompts. */
window.MV = window.MV || {};
MV.components = MV.components || {};

/* deterministic-ish layout per location: positions in 0..1 relative coords.
   Order matters; assigned by NPC index in location. */
const NPC_LAYOUTS = {
  lao_song_plaza: [
    { x: 0.22, y: 0.30 }, { x: 0.62, y: 0.22 },
    { x: 0.78, y: 0.55 }, { x: 0.30, y: 0.70 },
    { x: 0.55, y: 0.60 }, { x: 0.45, y: 0.42 },
  ],
  north_frost_workshop: [
    { x: 0.30, y: 0.40 }, { x: 0.55, y: 0.30 },
    { x: 0.72, y: 0.62 }, { x: 0.42, y: 0.65 },
  ],
  warm_valley_farm: [
    { x: 0.28, y: 0.35 }, { x: 0.58, y: 0.32 },
    { x: 0.50, y: 0.65 }, { x: 0.78, y: 0.55 },
  ],
  silent_tower_ruin: [
    { x: 0.35, y: 0.55 }, { x: 0.62, y: 0.38 },
    { x: 0.55, y: 0.70 },
  ],
};
MV.NPC_LAYOUTS = NPC_LAYOUTS;

MV.components.Stage = function Stage(props) {
  const {
    fadeKey, location, playerLetter, playerPos, npcs, selectedId,
    edges, activeEdge, onNpcClick, onStageClick, children,
  } = props;

  const stageRef = React.useRef(null);
  React.useEffect(() => { props.onMount && props.onMount(stageRef.current); }, []);

  return (
    <div
      className={"s3-stage anim-fade"}
      key={fadeKey}
      ref={stageRef}
      onClick={(e) => { if (e.target === stageRef.current) onStageClick && onStageClick(); }}
    >
      <div className="stage-header">
        <div className="ln">{location.name}</div>
        <div className="le">{location.short}</div>
        <div className="lc">此刻在场 {npcs.length + 1} 人</div>
      </div>

      {edges.map(edge => (
        <div
          key={edge.dir}
          className={"edge " + edge.dir + (activeEdge === edge.dir ? " active" : "")}
        >
          <span className="glow"/>
          <span className="label">[E] 进入 → {edge.target.name}</span>
        </div>
      ))}

      {npcs.map(n => (
        <div
          key={n.agent.id}
          className={"sprite npc" + (selectedId === n.agent.id ? " is-selected" : "")}
          style={{ left: n.x + "px", top: n.y + "px" }}
          onClick={(e) => { e.stopPropagation(); onNpcClick && onNpcClick(n.agent.id); }}
        >
          <span className="av lg">{n.agent.letter}</span>
          <span className="label">{n.agent.name}</span>
          <span className="mood">平静</span>
        </div>
      ))}

      <div
        className="sprite is-player"
        style={{ left: playerPos.x + "px", top: playerPos.y + "px" }}
      >
        <span className="av xl me">{playerLetter}</span>
        <span className="label">你</span>
      </div>

      {children}
    </div>
  );
};
