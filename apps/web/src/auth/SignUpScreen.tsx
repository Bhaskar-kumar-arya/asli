import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Page } from '../shell/components/Page';
import { Field } from '../shell/components/Field';
import { Button } from '../shell/components/Button';
import {
  PASSWORD_RULE,
  authErrorMessage,
  confirmEmail,
  emailSignIn,
  emailSignUp,
  passwordProblem,
  resendEmailCode,
} from './session';
import { useAuth } from './AuthProvider';

type Stage = 'particulars' | 'confirm';

interface LocationState {
  /** Sign-in hands an unconfirmed account straight to the code step. */
  confirmEmail?: string;
}

/**
 * Opening an account is the register's own first entry: particulars first, then the
 * counterfoil code that proves the address. Cognito self sign-up is already enabled on
 * the pool (infra/lib/shared-stack.ts) and verifies by emailed code.
 */
export function SignUpScreen() {
  const location = useLocation();
  const handed = (location.state as LocationState | null)?.confirmEmail;

  const [stage, setStage] = useState<Stage>(handed ? 'confirm' : 'particulars');
  const [email, setEmail] = useState(handed ?? '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [code, setCode] = useState('');
  const [passwordError, setPasswordError] = useState<string>();
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const { refresh } = useAuth();
  const navigate = useNavigate();

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    setNotice(undefined);

    const problem = passwordProblem(password);
    setPasswordError(problem);
    if (problem) return;

    setSubmitting(true);
    try {
      const outcome = await emailSignUp(email, password);
      if (outcome === 'DONE') {
        await finishSignIn();
        return;
      }
      setStage('confirm');
      setNotice(`We emailed a 6-digit code to ${email}.`);
    } catch (err) {
      setError(authErrorMessage(err, 'We could not create your account. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  }

  /** The account is live; sign in with the password still held in this form. */
  async function finishSignIn() {
    try {
      await emailSignIn(email, password);
      refresh();
      navigate('/');
    } catch {
      navigate('/sign-in');
    }
  }

  async function handleConfirm(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    setNotice(undefined);
    setSubmitting(true);
    try {
      await confirmEmail(email, code.trim());
      if (password) {
        await finishSignIn();
      } else {
        navigate('/sign-in');
      }
    } catch (err) {
      setError(authErrorMessage(err, 'We could not confirm that code. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend() {
    setError(undefined);
    setNotice(undefined);
    try {
      await resendEmailCode(email);
      setNotice(`We emailed a new code to ${email}.`);
    } catch (err) {
      setError(authErrorMessage(err, 'We could not send a new code right now.'));
    }
  }

  return (
    <Page title="Asli" subtitle={{ hi: 'दवा के बैच की जाँच', kn: 'ಔಷಧಿ ಬ್ಯಾಚ್ ಪರಿಶೀಲನೆ' }}>
      {stage === 'particulars' ? (
        <>
          <p className="reg-prose">
            An account keeps your family's medicines in one cabinet, so every new CDSCO list is checked against
            them without you scanning again.
          </p>

          <div className="reg-head">
            <h2>Create an account</h2>
          </div>

          <form onSubmit={(e) => void handleCreate(e)} style={{ marginTop: '1.4rem' }}>
            <Field
              label="Email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              hint="We send your confirmation code here."
            />
            <Field
              label="Password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (passwordError) setPasswordError(undefined);
              }}
              hint={PASSWORD_RULE}
              error={passwordError}
            />
            <button type="button" className="reg-textbtn" onClick={() => setShowPassword((v) => !v)}>
              {showPassword ? 'Hide password' : 'Show password'}
            </button>

            {error ? (
              <p role="alert" className="reg-note reg-note--flagged" style={{ margin: '0.6rem 0 1rem' }}>
                {error}
              </p>
            ) : null}

            <Button type="submit" fullWidth disabled={submitting} style={{ marginTop: '1rem' }}>
              {submitting ? 'Creating your account…' : 'Create account'}
            </Button>
          </form>

          <p className="reg-prose reg-prose--muted" style={{ margin: '1.8rem 0 0.4rem' }}>
            Already have an account?
          </p>
          <Link to="/sign-in" className="reg-btn reg-btn--wide">
            Sign in
          </Link>
        </>
      ) : (
        <>
          <div className="reg-head">
            <h2>Confirm your email</h2>
          </div>

          <p className="reg-prose" style={{ marginTop: '1rem' }}>
            Enter the 6-digit code we emailed to <strong>{email}</strong>. It can take a minute to arrive, and it
            may land in your spam folder.
          </p>

          <form onSubmit={(e) => void handleConfirm(e)}>
            <Field
              label="Confirmation code"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />

            {notice ? (
              <p role="status" className="reg-note" style={{ margin: '0 0 0.6rem' }}>
                {notice}
              </p>
            ) : null}
            {error ? (
              <p role="alert" className="reg-note reg-note--flagged" style={{ margin: '0 0 0.6rem' }}>
                {error}
              </p>
            ) : null}

            <Button type="submit" fullWidth disabled={submitting} style={{ marginTop: '0.6rem' }}>
              {submitting ? 'Confirming…' : 'Confirm and continue'}
            </Button>
          </form>

          <div className="reg-stack">
            <Button variant="secondary" onClick={() => void handleResend()}>
              Send a new code
            </Button>
            <Button variant="secondary" onClick={() => setStage('particulars')}>
              Use a different email
            </Button>
          </div>
        </>
      )}
    </Page>
  );
}
