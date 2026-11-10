const TILE_A = "/brand/login-pattern-a.svg";
const TILE_B = "/brand/login-pattern-b.svg";

function PatternRow({ tiles, className }: { tiles: number; className?: string }) {
  return (
    <div className={`pdv-login-pattern__row${className ? ` ${className}` : ""}`}>
      {Array.from({ length: tiles }, (_, index) => (
        <img key={index} src={index % 2 === 0 ? TILE_A : TILE_B} alt="" />
      ))}
    </div>
  );
}

/** Motif « pd » Figma 145:20643 / 145:14999 — 5 rangées 152×196, gap 12. */
export default function LoginPattern() {
  return (
    <div className="pdv-login-pattern" aria-hidden>
      <PatternRow tiles={5} />
      <PatternRow tiles={7} className="pdv-login-pattern__row--2" />
      <PatternRow tiles={5} className="pdv-login-pattern__row--3" />
      <PatternRow tiles={7} className="pdv-login-pattern__row--4" />
      <PatternRow tiles={5} />
    </div>
  );
}
