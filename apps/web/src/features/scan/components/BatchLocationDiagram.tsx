/**
 * Where to find the batch number, drawn the way a lab record draws a specimen:
 * outline, leader line, label. Geometry only — no picture, no texture.
 */
export function BatchLocationDiagram({ kind }: { kind: 'strip' | 'bill' }) {
  const label = kind === 'strip' ? 'B.No / Batch' : 'Batch column';
  const caption =
    kind === 'strip'
      ? 'Printed on the foil or the carton flap, usually beside the expiry date.'
      : 'Usually a narrow column between the item name and the quantity.';

  return (
    <figure className="reg-figure">
      <svg viewBox="0 0 300 150" role="img" aria-label={`Diagram: where the ${label} appears on a ${kind}`} width="100%">
        <g fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square">
          {kind === 'strip' ? (
            <>
              {/* strip body with perforated edge */}
              <rect x="14" y="26" width="150" height="98" />
              <line x1="14" y1="75" x2="164" y2="75" strokeDasharray="3 4" opacity="0.6" />
              <line x1="89" y1="26" x2="89" y2="124" strokeDasharray="3 4" opacity="0.6" />
              {[
                [51, 50],
                [126, 50],
                [51, 99],
                [126, 99],
              ].map(([cx, cy]) => (
                <ellipse key={`${cx}-${cy}`} cx={cx} cy={cy} rx="22" ry="13" />
              ))}
              {/* printed panel carrying the batch triplet */}
              <rect x="180" y="52" width="104" height="46" />
              <line x1="180" y1="67" x2="284" y2="67" opacity="0.5" />
              <line x1="180" y1="82" x2="284" y2="82" opacity="0.5" />
              <line x1="215" y1="52" x2="215" y2="98" opacity="0.5" />
              {/* leader from the label to the batch line */}
              <path d="M232 40v12" stroke="var(--margin)" />
              <path d="M228 48l4 6 4-6" fill="var(--margin)" stroke="none" />
            </>
          ) : (
            <>
              {/* bill with a torn foot */}
              <path d="M28 20h140v104l-14-8-14 8-14-8-14 8-14-8-14 8-14-8-14 8z" />
              <line x1="44" y1="44" x2="152" y2="44" opacity="0.5" />
              <line x1="44" y1="62" x2="152" y2="62" opacity="0.5" />
              <line x1="44" y1="80" x2="152" y2="80" opacity="0.5" />
              <line x1="44" y1="98" x2="152" y2="98" opacity="0.5" />
              <line x1="112" y1="34" x2="112" y2="108" strokeDasharray="4 4" stroke="var(--margin)" />
              <rect x="186" y="52" width="98" height="46" />
              <line x1="186" y1="67" x2="284" y2="67" opacity="0.5" />
              <line x1="186" y1="82" x2="284" y2="82" opacity="0.5" />
              <path d="M235 40v12" stroke="var(--margin)" />
              <path d="M231 48l4 6 4-6" fill="var(--margin)" stroke="none" />
            </>
          )}
        </g>
        <text
          x={kind === 'strip' ? 232 : 235}
          y="32"
          textAnchor="middle"
          fill="var(--margin)"
          fontSize="12"
          fontWeight="700"
          letterSpacing="1.4"
          style={{ textTransform: 'uppercase', fontFamily: 'var(--face-print)' }}
        >
          {label}
        </text>
      </svg>
      <figcaption className="reg-note">{caption}</figcaption>
    </figure>
  );
}
