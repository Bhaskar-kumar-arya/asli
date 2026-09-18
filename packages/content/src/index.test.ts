import { describe, expect, it } from 'vitest';
import {
  ALL_TEMPLATES,
  CONTENT_LANGS,
  GUIDANCE_KEYS,
  NOTIFICATION_KEYS,
  findBannedWording,
  reasonPlainText,
  render,
  toGuidanceTemplate,
  uiString,
} from './index';
import { REASON_PLAIN_TEXT_EN, REASON_PLAIN_TEXT_HI, REASON_PLAIN_TEXT_KN } from './reasons';
import { UI_STRINGS } from './ui-strings';
import type { ContentLang } from './keys';

function reasonTableFor(lang: ContentLang): Record<string, string> {
  if (lang === 'hi') return REASON_PLAIN_TEXT_HI as Record<string, string>;
  if (lang === 'kn') return REASON_PLAIN_TEXT_KN as Record<string, string>;
  return REASON_PLAIN_TEXT_EN;
}

function uiStringsFor(lang: ContentLang): Record<string, string> {
  return UI_STRINGS[lang];
}

describe('render()', () => {
  it('interpolates placeholders and reports reviewed=true for the English source of truth', () => {
    const result = render('result.flagged.nsq', 'en', {
      batch: 'GTL 1258',
      product: 'Amoxicillin 500mg',
      alertMonth: 'March 2025',
      reportingLab: 'State Drug Testing Laboratory, Chandigarh',
      reasonPlain: reasonPlainText('ASSAY', 'en'),
    });
    expect(result.title).toBe('This batch is on a CDSCO alert list');
    expect(result.body).toContain('GTL 1258');
    expect(result.body).toContain('Amoxicillin 500mg');
    expect(result.body).not.toContain('{');
    expect(result.reviewed).toBe(true);
  });

  it('falls back to English for an unreviewed language draft', () => {
    // hi/kn drafts are hand-authored and unreviewed until a native speaker signs off
    // (scripts/content/review.md) - render() must not surface them as final copy.
    const hi = render('result.no_alert_found', 'hi', { monthCount: 24, latestMonth: 'August 2025', product: 'this medicine' });
    expect(hi.lang).toBe('en');
    expect(hi.reviewed).toBe(true);
    expect(hi.title).toBe('No alert found for this batch');
  });

  it('leaves an unknown placeholder token untouched rather than dropping it silently', () => {
    const result = render('result.no_alert_found', 'en', { monthCount: 24 });
    expect(result.body).toContain('{latestMonth}');
  });

  it('throws for an unknown key', () => {
    expect(() => render('not.a.real.key', 'en')).toThrow();
  });
});

describe('toGuidanceTemplate()', () => {
  it('returns the raw (uninterpolated) GuidanceTemplate contract shape', () => {
    const template = toGuidanceTemplate('result.verify.near_batch', 'en');
    expect(template).toMatchObject({ key: 'result.verify.near_batch', lang: 'en' });
    expect(template?.body).toContain('close but not an exact match');
    expect(template?.whatToDoNext.length).toBeGreaterThan(0);
    expect(template?.reviewedBy).toBeTruthy();
  });

  it('returns undefined for an unknown key', () => {
    expect(toGuidanceTemplate('nope', 'en')).toBeUndefined();
  });
});

describe('coverage', () => {
  it('every guidance and notification key has an English template', () => {
    for (const key of [...GUIDANCE_KEYS, ...NOTIFICATION_KEYS]) {
      expect(ALL_TEMPLATES[key]?.en, `missing en template for ${key}`).toBeDefined();
    }
  });

  it('every reason code has reviewed English plain text', () => {
    const codes: (keyof typeof REASON_PLAIN_TEXT_EN)[] = [
      'DISSOLUTION', 'ASSAY', 'IDENTIFICATION', 'DISINTEGRATION', 'STERILITY', 'PARTICULATE',
      'MICROBIAL', 'RELATED_SUBSTANCES', 'PH', 'DESCRIPTION', 'UNIFORMITY', 'LABELLING', 'SPURIOUS', 'OTHER',
    ];
    for (const code of codes) {
      expect(REASON_PLAIN_TEXT_EN[code].length).toBeGreaterThan(0);
    }
  });
});

describe('banned-words test (deliverable 6): every template, every language', () => {
  for (const lang of CONTENT_LANGS) {
    it(`no template body/title/step contains banned wording in ${lang}`, () => {
      for (const key of Object.keys(ALL_TEMPLATES)) {
        const template = ALL_TEMPLATES[key]?.[lang];
        if (!template) continue; // draft not yet written for this key/lang - not a failure
        for (const text of [template.title, template.body, ...template.steps]) {
          expect(findBannedWording(text, lang), `${key}/${lang}: "${text}"`).toEqual([]);
        }
      }
    });

    it(`no reason plain-text contains banned wording in ${lang}`, () => {
      const table = lang === 'en' ? REASON_PLAIN_TEXT_EN : reasonTableFor(lang);
      for (const [code, text] of Object.entries(table)) {
        expect(findBannedWording(text, lang), `${code}/${lang}: "${text}"`).toEqual([]);
      }
    });

    it(`no UI string contains banned wording in ${lang}`, () => {
      for (const [id, text] of Object.entries(uiStringsFor(lang))) {
        expect(findBannedWording(text, lang), `${id}/${lang}: "${text}"`).toEqual([]);
      }
    });
  }

  it('never says "safe" (English)', () => {
    expect(findBannedWording('Everything looks safe', 'en')).toContain('\\bsafe\\b');
  });

  it('never advises stopping a medicine outright (English)', () => {
    expect(findBannedWording('You should stop taking this medicine', 'en')).not.toEqual([]);
  });

  it('allows the reviewed "do not stop" safety instruction (English)', () => {
    expect(findBannedWording("Don't stop taking a prescribed medicine on your own.", 'en')).toEqual([]);
  });

  it('SPURIOUS wording never blames the manufacturer directly', () => {
    const en = render('result.flagged.spurious', 'en', { batch: 'X', manufacturer: 'M', alertMonth: 'Mar 2025' });
    expect(en.body).not.toMatch(/made fake medicine/i);
    expect(en.body).toMatch(/may not have made it/i);
  });
});

describe('uiString()', () => {
  it('fills placeholders and falls back to English for missing ids', () => {
    expect(uiString('readAloud', 'en')).toBe('Read aloud');
    expect(uiString('sourceAttribution', 'en', { lab: 'Central Drugs Lab' })).toContain('Central Drugs Lab');
  });
});
