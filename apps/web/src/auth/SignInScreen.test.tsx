import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SignInScreen } from './SignInScreen';
import { DEMO_EMAIL, DEMO_PASSWORD } from './demoAccount';

const emailSignIn = vi.fn();

vi.mock('./session', async () => {
  const actual = await vi.importActual<typeof import('./session')>('./session');
  return { ...actual, emailSignIn: (...args: unknown[]) => emailSignIn(...args) };
});

function renderScreen() {
  return render(
    <MemoryRouter initialEntries={['/sign-in']}>
      <Routes>
        <Route path="/sign-in" element={<SignInScreen />} />
        <Route path="/" element={<h1>Home</h1>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  emailSignIn.mockResolvedValue(undefined);
});

describe('SignInScreen guest mode', () => {
  it('signs in as the seeded sample account and opens Home, with no typing', async () => {
    const user = userEvent.setup();
    renderScreen();

    await user.click(screen.getByRole('button', { name: /continue as guest/i }));

    expect(emailSignIn).toHaveBeenCalledWith(DEMO_EMAIL, DEMO_PASSWORD);
    expect(await screen.findByRole('heading', { name: 'Home' })).toBeInTheDocument();
  });

  it('stays on the sign-in screen and says so when guest mode cannot open', async () => {
    emailSignIn.mockRejectedValue(new Error('network'));
    const user = userEvent.setup();
    renderScreen();

    await user.click(screen.getByRole('button', { name: /continue as guest/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/guest mode could not open/i);
    expect(screen.queryByRole('heading', { name: 'Home' })).not.toBeInTheDocument();
    // The ordinary form is still there to fall back on.
    expect(screen.getByRole('button', { name: /^sign in$/i })).toBeInTheDocument();
  });
});
