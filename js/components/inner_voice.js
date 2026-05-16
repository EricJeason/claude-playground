/* Inner-voice block for S4.
   Props:
     loading: boolean
     text:    string
     mode:    'near' | 'far' */
window.MV = window.MV || {};
MV.components = MV.components || {};

MV.components.InnerVoice = function InnerVoice(props) {
  const { loading, text, mode } = props;
  return (
    <div className="inner-voice">
      <div className="head">
        <span className={"dot" + (loading ? " is-loading" : "")}/>
        <span>READ · {mode === "near" ? "她此刻在想……" : "你听到一些断片……"}</span>
      </div>
      <div className={"text" + (loading ? " is-loading" : "")}>
        {loading ? "生成中…" : (text || "(无)")}
      </div>
    </div>
  );
};
