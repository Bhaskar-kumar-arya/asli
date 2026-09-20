import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MedicineIdentityForm } from './MedicineIdentityForm';
import type { MedicineIdentity } from '@asli/contracts';

describe('MedicineIdentityForm', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('requires a batch number', async () => {
    const onSubmit = vi.fn();
    render(<MedicineIdentityForm submitLabel="Check" onSubmit={onSubmit} />);
    await userEvent.click(screen.getByRole('button', { name: /check/i }));
    expect(screen.getByRole('alert')).toHaveTextContent(/batch number is required/i);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('flags batchEdited when the pre-filled batch number is changed', async () => {
    const onSubmit = vi.fn();
    const initial: MedicineIdentity = {
      batchNumber: 'GTL1258',
      productName: 'Amoxicillin',
      source: 'strip_vision',
      fieldConfidence: { batchNumber: 0.5 },
    };
    render(<MedicineIdentityForm initial={initial} submitLabel="Looks right" onSubmit={onSubmit} />);

    expect(screen.getByText(/we're not fully sure we read it right/i)).toBeInTheDocument();

    const batchField = screen.getByLabelText(/batch number/i);
    await userEvent.clear(batchField);
    await userEvent.type(batchField, 'GTL9999');
    await userEvent.click(screen.getByRole('button', { name: /looks right/i }));

    expect(onSubmit).toHaveBeenCalledWith(
      { productName: 'Amoxicillin', batchNumber: 'GTL9999', manufacturer: '' },
      true,
    );
  });

  it('suggests a known medicine name as the user types a prefix', async () => {
    render(<MedicineIdentityForm submitLabel="Check" onSubmit={vi.fn()} />);
    const nameField = screen.getByRole('combobox', { name: /medicine name/i });
    await userEvent.type(nameField, 'amox');
    expect(await screen.findByRole('option', { name: /amoxicillin 500mg capsules/i })).toBeInTheDocument();
  });

  it('tolerates a minor typo and still surfaces the intended name', async () => {
    render(<MedicineIdentityForm submitLabel="Check" onSubmit={vi.fn()} />);
    const nameField = screen.getByRole('combobox', { name: /medicine name/i });
    await userEvent.type(nameField, 'paracetmol');
    expect(await screen.findByRole('option', { name: /paracetamol 500mg tablets/i })).toBeInTheDocument();
  });

  it('fills the field when a suggestion is picked', async () => {
    render(<MedicineIdentityForm submitLabel="Check" onSubmit={vi.fn()} />);
    const nameField = screen.getByRole('combobox', { name: /medicine name/i });
    await userEvent.type(nameField, 'amox');
    const option = await screen.findByRole('option', { name: /amoxicillin 500mg capsules/i });
    await userEvent.click(option);
    expect(nameField).toHaveValue('Amoxicillin 500mg Capsules');
  });
});
