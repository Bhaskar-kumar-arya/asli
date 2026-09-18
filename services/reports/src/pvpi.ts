import type { ProblemReportResponse } from '@asli/contracts';

/**
 * Official PvPI consumer reporting routes (docs/SAFETY_AND_CONTENT.md, plan/tasks/L-pvpi-report.md
 * deliverable 1). Verified 2026-09-18 against:
 *  - https://www.ipc.gov.in/PvPI/adr.html (toll-free helpline, consumer reporting overview)
 *  - https://www.ipc.gov.in/mandates/pvpi/pharmacovigilance-skill-development-programme/8-category-en/429-pvpi-frequently-asked-questions.html
 *    (confirms the same helpline number and the "ADR PvPI" Android app)
 *  - https://cdsco.gov.in/opencms/export/sites/CDSCO_WEB/Pdf-documents/Consumer_Section_PDFs/ADRRF_2.pdf
 *    (official Suspected Adverse Drug Reaction Reporting Form, live PDF)
 * No NCC-PvPI email address is shipped: the addresses on ipc.gov.in are spambot-obfuscated and
 * could not be confirmed byte-for-byte, and CLAUDE.md forbids shipping unverified links/numbers.
 */
export const PVPI_TOLL_FREE_HELPLINE = '1800-180-3024';
export const PVPI_HELPLINE_HOURS = 'Mon–Fri, 9:00 AM–5:30 PM IST (voicemail outside these hours)';
export const PVPI_APP_NAME = 'ADR PvPI (Android, Google Play)';

export const PVPI_LINKS: readonly string[] = [
  'https://www.ipc.gov.in/PvPI/adr.html',
  'https://cdsco.gov.in/opencms/export/sites/CDSCO_WEB/Pdf-documents/Consumer_Section_PDFs/ADRRF_2.pdf',
];

export const PVPI_HOW_TO_REPORT =
  `Call the PvPI toll-free helpline ${PVPI_TOLL_FREE_HELPLINE} (${PVPI_HELPLINE_HOURS}), ` +
  `use the "${PVPI_APP_NAME}" app, or fill the official Suspected Adverse Drug Reaction ` +
  `Reporting Form and send it to your nearest ADR Monitoring Centre.`;

export function pvpiResponse(): ProblemReportResponse['pvpi'] {
  return {
    howToReport: PVPI_HOW_TO_REPORT,
    links: [...PVPI_LINKS],
  };
}

/** docs/SAFETY_AND_CONTENT.md wording rule - shown wherever a report is submitted. */
export const PVPI_DISCLAIMER = 'Asli does not investigate reports. PvPI is the official channel.';

/** Fixed problem-type choices for the report form (plan/tasks/L-pvpi-report.md deliverable 2). */
export const PROBLEM_TYPES = [
  { value: 'side_effect', label: 'Side effect' },
  { value: 'looks_different', label: 'Looks different from usual' },
  { value: 'not_working', label: "Doesn't seem to work" },
  { value: 'packaging_problem', label: 'Packaging problem' },
  { value: 'other', label: 'Other' },
] as const;

export type ProblemTypeValue = (typeof PROBLEM_TYPES)[number]['value'];

export function isKnownProblemType(value: string): value is ProblemTypeValue {
  return PROBLEM_TYPES.some((p) => p.value === value);
}
