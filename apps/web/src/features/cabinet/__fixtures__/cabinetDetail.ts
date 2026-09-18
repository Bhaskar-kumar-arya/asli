import type { CabinetDetail, CabinetList } from '@asli/contracts';

// API-shaped fixtures mirroring packages/contracts/fixtures/cabinets.json (docs/PERMISSIONS.md demo:
// Asha OWNER, Vikram EDITOR, Priya VIEWER on "Mom's medicines").
export const cabinetDetailFixture: CabinetDetail = {
  cabinet: {
    cabinetId: 'cab-mom-001',
    name: "Mom's medicines",
    createdBy: 'user-asha-001',
    createdAt: '2026-09-10T08:15:00.000Z',
  },
  members: [
    { userId: 'user-asha-001', role: 'OWNER', alertsEnabled: true, joinedAt: '2026-09-10T08:15:00.000Z' },
    { userId: 'user-vikram-002', role: 'EDITOR', alertsEnabled: true, joinedAt: '2026-09-10T09:00:00.000Z' },
    { userId: 'user-priya-003', role: 'VIEWER', alertsEnabled: true, joinedAt: '2026-09-10T09:05:00.000Z' },
  ],
  medicines: [
    {
      medId: 'med-glimepiride-001',
      identity: {
        productName: 'Amoxicillin 500mg Capsules',
        batchNumber: 'GTL 1258',
        manufacturer: 'Gidsha Pharmaceuticals',
        source: 'strip_vision',
        fieldConfidence: { batchNumber: 0.95, manufacturer: 0.9 },
      },
      label: 'Mom - morning tablet',
      forPerson: 'Mom',
      addedBy: 'user-asha-001',
      addedAt: '2026-09-15T07:30:00.000Z',
      lastCheckedAt: '2026-09-15T07:30:05.000Z',
      latestTier: 'FLAGGED',
    },
    {
      medId: 'med-paracetamol-002',
      identity: {
        productName: 'Paracetamol 500mg Tablets',
        batchNumber: 'XZ9981',
        manufacturer: 'Cipla Ltd',
        source: 'manual',
      },
      label: 'Mom - fever tablet',
      forPerson: 'Mom',
      addedBy: 'user-vikram-002',
      addedAt: '2026-09-16T11:00:00.000Z',
      lastCheckedAt: '2026-09-16T11:00:03.000Z',
      latestTier: 'NO_ALERT_FOUND',
    },
  ],
  matches: [
    {
      medId: 'med-glimepiride-001',
      alertRef: 'alert-nsq-001',
      tier: 'FLAGGED',
      category: 'NSQ',
      alertMonth: '2025-03',
      createdAt: '2026-09-15T07:30:05.000Z',
    },
    {
      medId: 'med-glimepiride-001',
      alertRef: 'alert-spurious-001',
      tier: 'FLAGGED',
      category: 'SPURIOUS',
      alertMonth: '2025-05',
      createdAt: '2026-09-15T07:30:05.000Z',
    },
  ],
};

export const cabinetListFixture: CabinetList = {
  cabinets: [{ ...cabinetDetailFixture.cabinet, role: 'OWNER' }],
};

export const alertSummaryFixtures = {
  'alert-nsq-001': {
    alertRef: 'alert-nsq-001',
    alertMonth: '2025-03',
    category: 'NSQ' as const,
    productName: 'Amoxicillin 500mg Capsules',
    batchRaw: 'GTL1258',
    manufacturerRaw: 'Gidsha Pharmaceuticals',
    reasonCode: 'ASSAY' as const,
    reasonRaw: 'Assay content of active ingredient outside limits',
    reportingSource: 'State Drug Testing Laboratory, Chandigarh',
    sourceUrl: 'https://cdsco.gov.in/opencms/opencms/en/Alerts/NSQ-Alerts/',
    demo: false,
  },
  'alert-spurious-001': {
    alertRef: 'alert-spurious-001',
    alertMonth: '2025-05',
    category: 'SPURIOUS' as const,
    productName: 'Amoxicillin 500mg Capsules',
    batchRaw: 'GTL1258',
    manufacturerRaw: 'Gidsha Pharmaceuticals',
    reasonCode: 'SPURIOUS' as const,
    reasonRaw: 'Spurious drug',
    reportingSource: 'Central Drugs Laboratory',
    sourceUrl: 'https://cdsco.gov.in/opencms/opencms/en/Alerts/Spurious-Alerts/',
    demo: false,
  },
};
