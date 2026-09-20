import { useEffect, useId, useRef, useState } from 'react';

export interface SuggestFieldProps {
  label: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  lowConfidence?: boolean;
  getSuggestions: (query: string) => string[];
}

/**
 * A text field with Amazon-style type-ahead: suggestions ranked by prefix match then a
 * typo-tolerant fuzzy match (the caller supplies `getSuggestions`, backed by
 * lib/typeahead.ts). An ARIA combobox (aria-activedescendant pattern) so screen reader and
 * keyboard users get the same suggestions as everyone else. Used for both "Medicine name"
 * and "Manufacturer" in MedicineIdentityForm.
 */
export function SuggestField({ label, placeholder, value, onChange, lowConfidence, getSuggestions }: SuggestFieldProps) {
  const fieldId = useId();
  const listboxId = `${fieldId}-listbox`;
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const blurTimeout = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => () => clearTimeout(blurTimeout.current), []);

  const suggestions = isOpen ? getSuggestions(value) : [];

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
        {label}
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
        placeholder={placeholder}
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
        <ul id={listboxId} role="listbox" aria-label={`${label} suggestions`} className="reg-suggest-list">
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
