import { useState } from 'react';
import type { MedicineIdentity } from '@asli/contracts';
import { Field } from '../../../shell/components/Field';
import { Button } from '../../../shell/components/Button';
import { SuggestField } from './SuggestField';
import { getMedicineSuggestions, getRecentMedicineSearches, recordMedicineSearch } from '../lib/medicineNames';
import {
  getManufacturerSuggestions,
  getRecentManufacturerSearches,
  recordManufacturerSearch,
} from '../lib/manufacturerNames';

const LOW_CONFIDENCE_THRESHOLD = 0.7;

export interface MedicineIdentityFormValue {
  productName: string;
  batchNumber: string;
  manufacturer: string;
}

export interface MedicineIdentityFormProps {
  initial?: MedicineIdentity;
  submitLabel: string;
  onSubmit: (value: MedicineIdentityFormValue, batchEdited: boolean) => void;
}

function isLowConfidence(identity: MedicineIdentity | undefined, field: 'productName' | 'batchNumber' | 'manufacturer'): boolean {
  const score = identity?.fieldConfidence?.[field];
  return score !== undefined && score < LOW_CONFIDENCE_THRESHOLD;
}

/** Screens 5 (confirm) and manual entry (docs/UX.md) share this form. */
export function MedicineIdentityForm({ initial, submitLabel, onSubmit }: MedicineIdentityFormProps) {
  const [productName, setProductName] = useState(initial?.productName ?? '');
  const [batchNumber, setBatchNumber] = useState(initial?.batchNumber ?? '');
  const [manufacturer, setManufacturer] = useState(initial?.manufacturer ?? '');
  const [batchEdited, setBatchEdited] = useState(false);
  const [batchError, setBatchError] = useState<string>();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!batchNumber.trim()) {
      setBatchError('The batch number is required - it is usually labelled "B.No" or "Batch".');
      return;
    }
    const trimmedProductName = productName.trim();
    const trimmedManufacturer = manufacturer.trim();
    recordMedicineSearch(trimmedProductName);
    recordManufacturerSearch(trimmedManufacturer);
    onSubmit({ productName: trimmedProductName, batchNumber: batchNumber.trim(), manufacturer: trimmedManufacturer }, batchEdited);
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <SuggestField
        label="Medicine name"
        placeholder="e.g. Amoxicillin 500mg Capsules"
        value={productName}
        onChange={setProductName}
        lowConfidence={isLowConfidence(initial, 'productName')}
        getSuggestions={(query) => getMedicineSuggestions(query, getRecentMedicineSearches())}
      />
      <Field
        label="Batch number"
        required
        value={batchNumber}
        onChange={(e) => {
          setBatchNumber(e.target.value);
          setBatchEdited(true);
          setBatchError(undefined);
        }}
        lowConfidence={isLowConfidence(initial, 'batchNumber')}
        error={batchError}
        hint='Usually labelled "B.No", "Batch" or "Lot", near the expiry date.'
      />
      <SuggestField
        label="Manufacturer"
        placeholder="e.g. Cipla Ltd"
        value={manufacturer}
        onChange={setManufacturer}
        lowConfidence={isLowConfidence(initial, 'manufacturer')}
        getSuggestions={(query) => getManufacturerSuggestions(query, getRecentManufacturerSearches())}
      />
      <Button type="submit" fullWidth>
        {submitLabel}
      </Button>
    </form>
  );
}
