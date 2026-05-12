/* Right-side event stream. Collapsible; filter chips: all / me / others.
   Event shape: { id, ts:'08:01', text, kind:'me'|'other'|'divider' } */
window.MV = window.MV || {};
MV.components = MV.components || {};

MV.components.EventStream = function EventStream({ events, collapsed, onToggle }) {
  const [filter, setFilter] = React.useState("all");

  const shown = events.filter(ev => {
    if (ev.kind === "divider") return true;
    if (filter === "all")  return true;
    if (filter === "me")   return ev.kind === "me";
    if (filter === "other") return ev.kind === "other";
    return true;
  });

  const chip = (key, label) => (
    <span
      className={"tag" + (filter === key ? " is-active" : "")}
      onClick={() => setFilter(key)}
    >{label}</span>
  );

  return (
    <aside className={"s3-events" + (collapsed ? " collapsed" : "")}>
      <div className="ev-head">
        <span className="title">事件流 · LIVE</span>
        <button className="collapse" onClick={onToggle} title="折叠">
          {collapsed ? "›" : "‹"}
        </button>
      </div>

      <div className="ev-filters">
        {chip("all", "全部")}
        {chip("me", "我")}
        {chip("other", "他人")}
      </div>

      <div className="ev-body">
        {shown.map(ev => {
          if (ev.kind === "divider") return (
            <div key={ev.id} className="ev divider">{ev.text}</div>
          );
          return (
            <div key={ev.id} className={"ev " + (ev.kind === "me" ? "is-me" : "is-other")}>
              <span className="ts">{ev.ts}</span>
              <span className="msg">{ev.text}</span>
            </div>
          );
        })}
      </div>
    </aside>
  );
};
