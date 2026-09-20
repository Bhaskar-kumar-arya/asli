import { useEffect, useId, useRef, useState } from 'react';
import { getMedicineSuggestions, getRecentMedicineSearches } from '../lib/medicineNames';

export interface MedicineNameFieldProps {
  value: string;
  onChange: (value: string) => void;
  lowConfidence?: boolean;
}

/**
 * The "Medicine name" input, with Amazon-style type-ahead: the user's own recent/frequent
 * searches and a seed dictionary of common medicine names, ranked by prefix match then a
 * typo-tolerant fuzzy match (see lib/medicineNames.ts) so a few mistyped letters still
 * surface the right suggestion. An ARIA combobox (aria-activedescendant pattern) so screen
 * reader and keyboard users get the same suggestions as everyone else.
 */
export function MedicineNameField({ value, onChange, lowConfidence }: MedicineNameFieldProps) {
  const fieldId = useId();
  const listboxId = `${fieldId}-listbox`;
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const blurTimeout = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => () => clearTimeout(blurTimeout.current), []);

  const suggestions = isOpen ? getMedicineSuggestions(value, getRecentMedicineSearches()) : [];

  function selectSuggestion(name: string) {
    onChange(name);
    setIsOpen(false);
    setActiveIndex(-1);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!isOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setIsOpen(true);
      return;
    }
    if (!isOpen || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === 'Enter') {
      const active = suggestions[activeIndex];
      if (active) {
        e.preventDefault();
        selectSuggestion(active);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setActiveIndex(-1);
    }
  }

  const activeId = activeIndex >= 0 && suggestions[activeIndex] ? `${listboxId}-option-${activeIndex}` : undefined;
  const showList = isOpen && suggestions.length > 0;

  return (
    <div className="reg-field reg-field--combobox">
      <label htmlFor={fieldId} className="reg-legend">
        Medicine name
      </label>
      <input
        id={fieldId}
        type="text"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-activedescendant={activeId}
        autoComplete="off"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        placeholder="e.g. Amoxicillin 500mg Capsules"
        className="reg-field__input"
        data-low-confidence={lowConfidence ? 'true' : undefined}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setIsOpen(true);
          setActiveIndex(-1);
        }}
        onFocus={() => setIsOpen(true)}
        onBlur={() => {
          blurTimeout.current = setTimeout(() => setIsOpen(false), 120);
        }}
        onKeyDown={handleKeyDown}
      />
      {lowConfidence ? (
        <p className="reg-note reg-note--verify">Please check this - we're not fully sure we read it right.</p>
      ) : null}
      {showList ? (
        <ul id={listboxId} role="listbox" aria-label="Medicine name suggestions" className="reg-suggest-list">
          {suggestions.map((name, index) => (
            <li
              key={name}
              id={`${listboxId}-option-${index}`}
              role="option"
              aria-selected={index === activeIndex}
              className={
                index === activeIndex ? 'reg-suggest-option reg-suggest-option--active' : 'reg-suggest-option'
              }
              onMouseDown={(e) => {
                e.preventDefault();
                selectSuggestion(name);
              }}
            >
              {name}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
