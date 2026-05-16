/* Chat bubble for S11.
   Props:
     side:    'me' | 'them'
     letter:  string  (single char for the avatar)
     name:    string
     subtitle:string  (e.g. "32 · 村医" or "你 · 艾琳")
     mood:    string | undefined
     content: string
     thinking: boolean  -> shows pulsing breathing avatar + animated dots */
window.MV = window.MV || {};
MV.components = MV.components || {};

MV.components.ChatBubble = function ChatBubble(props) {
  const { side, letter, name, subtitle, mood, content, thinking } = props;
  const isMe = side === "me";
  return (
    <div className={"bubble-row " + (isMe ? "is-me" : "")}>
      <span className={"av lg" + (thinking ? " thinking" : "")}>{letter}</span>
      <div className="col">
        <span className="meta">
          {name}{subtitle ? " · " + subtitle : ""}
          {mood && !isMe && <span className="mood" style={{ marginLeft: 8 }}>{mood}</span>}
        </span>
        <span className={"bubble " + (isMe ? "is-me" : "") + (thinking ? " is-think" : "")}>
          {thinking ? <>思考中<span className="dots">···</span></> : content}
        </span>
      </div>
    </div>
  );
};
