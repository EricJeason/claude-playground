/* Suggest chip for S11.
   Props:
     text:     string             (the suggestion)
     onSend:   () => void          fired when the chip body is clicked
     onEdit:   () => void          fired when the pencil is clicked
     loading:  boolean             dim + placeholder when generating
     placeholder: boolean          dashed empty slot (3 placeholder chips on first paint) */
window.MV = window.MV || {};
MV.components = MV.components || {};

MV.components.SuggestChip = function SuggestChip(props) {
  const { text, onSend, onEdit, loading, placeholder } = props;
  if (placeholder) {
    return <span className="suggest-chip placeholder">建议生成中…</span>;
  }
  if (loading) {
    return <span className="suggest-chip is-loading">…</span>;
  }
  return (
    <span
      className="suggest-chip"
      title={text}
      onClick={() => onSend && onSend()}
    >
      <span className="text">{text}</span>
      <span
        className="pencil"
        onClick={(e) => { e.stopPropagation(); onEdit && onEdit(); }}
        title="编辑后再发送"
      >✎</span>
    </span>
  );
};
