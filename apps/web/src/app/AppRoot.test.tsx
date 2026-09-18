import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { AppRoot } from './AppRoot';

describe('AppRoot', () => {
  it('redirects a signed-out visitor to sign-in', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <AppRoot />
      </MemoryRouter>,
    );
    expect(await screen.findByRole('heading', { name: /sign in to asli/i })).toBeInTheDocument();
  });
});
