/**
 * Fixed problem-type choices for "Report a problem with this medicine"
 * (plan/tasks/L-pvpi-report.md deliverable 2). Values must match
 * services/reports/src/pvpi.ts PROBLEM_TYPES - the API rejects anything else.
 */
export const PROBLEM_TYPES = [
  { value: 'side_effect', label: 'Side effect' },
  { value: 'looks_different', label: 'Looks different from usual' },
  { value: 'not_working', label: "Doesn't seem to work" },
  { value: 'packaging_problem', label: 'Packaging problem' },
  { value: 'other', label: 'Other' },
] as const;

export type ProblemTypeValue = (typeof PROBLEM_TYPES)[number]['value'];
