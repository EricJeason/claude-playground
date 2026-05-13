/* Bottom-left info card. Shown when an NPC is selected.
   - The two action buttons just toast (S11 / S4 land later).
   - inRange flag controls the disabled state + the small range note. */
window.MV = window.MV || {};
MV.components = MV.components || {};

MV.components.NpcInfoCard = function NpcInfoCard({ agent, inRange, onClose }) {
  if (!agent) return null;

  const talk = () => MV.toast.show("S11 对话 UI 将在下个 PR 实装");
  const mind = () => MV.toast.show("S4 读心抽屉将在下个 PR 实装");

  return (
    <aside className="s3-info">
      <button className="close" onClick={onClose} aria-label="关闭">✕</button>

      <div className="head">
        <span className="av lg">{agent.letter}</span>
        <div className="meta">
          <span className="name">{agent.name}</span>
          <span className="sub">{agent.age} · {agent.role}</span>
        </div>
      </div>

      <div className="lines">
        <strong>心情:</strong> 平静 ·
        <strong> 关系:</strong> {agent.id === "a04" ? "你自己" : "尚未认识"}
      </div>

      {inRange && <div className="range-note">· 已在读心范围内</div>}

      <div className="actions">
        <button
          className={"btn sm" + (inRange ? "" : " disabled")}
          disabled={!inRange}
          onClick={talk}
        >
          搭话 E
        </button>
        <button
          className={"btn sm" + (inRange ? "" : " disabled")}
          disabled={!inRange}
          onClick={mind}
        >
          读心 Q
        </button>
      </div>
    </aside>
  );
};
