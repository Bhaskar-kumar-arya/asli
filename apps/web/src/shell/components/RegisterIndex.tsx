import { Link } from 'react-router-dom';

export interface IndexEntry {
  to: string;
  name: string;
  /** One line saying what the reader will find there, and what it costs them. */
  gloss: string;
}

/**
 * The register's back matter: cross-references to the other returns Asli keeps.
 * Quieter than the primary action on purpose — these are places to look things up,
 * not the next line to fill in.
 */
export function RegisterIndex({ title, entries }: { title: string; entries: IndexEntry[] }) {
  return (
    <section aria-labelledby={`index-${title.replace(/\s+/g, '-').toLowerCase()}`}>
      <div className="reg-head">
        <h2 id={`index-${title.replace(/\s+/g, '-').toLowerCase()}`}>{title}</h2>
      </div>
      <ul className="reg-index">
        {entries.map((entry) => (
          <li key={entry.to}>
            <Link to={entry.to} className="reg-index__item">
              <span className="reg-grow">
                <span className="reg-index__name">{entry.name}</span>
                <span className="reg-index__gloss">{entry.gloss}</span>
              </span>
              <span className="reg-index__mark" aria-hidden="true">
                &rsaquo;
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
