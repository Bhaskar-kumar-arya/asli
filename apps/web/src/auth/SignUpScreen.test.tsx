import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SignUpScreen } from './SignUpScreen';

const emailSignUp = vi.fn();
const confirmEmail = vi.fn();
const emailSignIn = vi.fn();

// The password rules stay real so this exercises the policy the pool actually enforces.
vi.mock('./session', async () => {
  const actual = await vi.importActual<typeof import('./session')>('./session');
  return {
    ...actual,
    emailSignUp: (...args: unknown[]) => emailSignUp(...args),
    confirmEmail: (...args: unknown[]) => confirmEmail(...args),
    emailSignIn: (...args: unknown[]) => emailSignIn(...args),
    resendEmailCode: vi.fn().mockResolvedValue(undefined),
  };
});

function renderAt(entry = '/sign-up') {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/sign-up" element={<SignUpScreen />} />
        <Route path="/" element={<h1>Home</h1>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  emailSignUp.mockResolvedValue('CONFIRM');
  confirmEmail.mockResolvedValue(undefined);
  emailSignIn.mockResolvedValue(undefined);
});

describe('SignUpScreen', () => {
  it('refuses a password the user pool would reject, without calling Cognito', async () => {
    const user = userEvent.setup();
    renderAt();

    await user.type(screen.getByLabelText(/email/i), 'asha@example.com');
    await user.type(screen.getByLabelText(/password/i), 'short');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/at least 8 characters/i);
    expect(emailSignUp).not.toHaveBeenCalled();
  });

  it('creates the account, then confirms the emailed code and signs the user in', async () => {
    const user = userEvent.setup();
    renderAt();

    await user.type(screen.getByLabelText(/email/i), 'asha@example.com');
    await user.type(screen.getByLabelText(/password/i), 'goodpass1');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => expect(emailSignUp).toHaveBeenCalledWith('asha@example.com', 'goodpass1'));
    expect(await screen.findByRole('heading', { name: /confirm your email/i })).toBeInTheDocument();

    await user.type(screen.getByLabelText(/confirmation code/i), '123456');
    await user.click(screen.getByRole('button', { name: /confirm and continue/i }));

    await waitFor(() => expect(confirmEmail).toHaveBeenCalledWith('asha@example.com', '123456'));
    await waitFor(() => expect(emailSignIn).toHaveBeenCalledWith('asha@example.com', 'goodpass1'));
    expect(await screen.findByRole('heading', { name: 'Home' })).toBeInTheDocument();
  });

  it('opens straight on the code step for an account sign-in found unconfirmed', async () => {
    render(
      <MemoryRouter initialEntries={[{ pathname: '/sign-up', state: { confirmEmail: 'vikram@example.com' } }]}>
        <Routes>
          <Route path="/sign-up" element={<SignUpScreen />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: /confirm your email/i })).toBeInTheDocument();
    expect(screen.getByText('vikram@example.com')).toBeInTheDocument();
  });

  it('reports an existing account in plain words rather than a Cognito exception', async () => {
    const user = userEvent.setup();
    const err = new Error('User already exists');
    err.name = 'UsernameExistsException';
    emailSignUp.mockRejectedValue(err);
    renderAt();

    await user.type(screen.getByLabelText(/email/i), 'asha@example.com');
    await user.type(screen.getByLabelText(/password/i), 'goodpass1');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/an account already exists for this email/i);
  });
});
