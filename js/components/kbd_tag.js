/* Tiny <Kbd>X</Kbd> chip used across S12 / S14 / S10. */
window.MV = window.MV || {};
MV.components = MV.components || {};

MV.components.Kbd = function Kbd({ children, dim }) {
  return (
    <span className={"kbd-tag" + (dim ? " dim" : "")}>{children}</span>
  );
};
