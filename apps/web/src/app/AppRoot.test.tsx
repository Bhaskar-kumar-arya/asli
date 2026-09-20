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
    expect(await screen.findByRole('heading', { name: /^sign in$/i })).toBeInTheDocument();
  });

  // /insights and /dashboard were registered as routes but nothing linked to them,
  // and there was no way to register at all. Both are regressions worth catching.
  it('offers registration and the public pages from the doorstep', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <AppRoot />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('link', { name: /create an account/i })).toHaveAttribute('href', '/sign-up');
    expect(screen.getByRole('link', { name: /how common is this/i })).toHaveAttribute('href', '/insights');
    expect(screen.getByRole('link', { name: /how well does asli work/i })).toHaveAttribute('href', '/dashboard');
  });
});
