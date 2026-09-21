/** Renders 4 metallic corner bolts. Parent element must be `relative`. */
export function CornerBolts({ inset = 6 }: { inset?: number }) {
  const pos = `${inset}px`;
  return (
    <>
      <span className="bolt absolute" style={{ top: pos, left: pos }} />
      <span className="bolt absolute" style={{ top: pos, right: pos }} />
      <span className="bolt absolute" style={{ bottom: pos, left: pos }} />
      <span className="bolt absolute" style={{ bottom: pos, right: pos }} />
    </>
  );
}
