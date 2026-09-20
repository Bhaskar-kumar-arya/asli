import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Page } from '../shell/components/Page';
import { Field } from '../shell/components/Field';
import { Button } from '../shell/components/Button';
import { RegisterIndex } from '../shell/components/RegisterIndex';
import { UNCONFIRMED, authErrorMessage, emailSignIn, errorName } from './session';
import { useAuth } from './AuthProvider';
import { DEMO_EMAIL, DEMO_PASSWORD } from './demoAccount';

export function SignInScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const [demoOpening, setDemoOpening] = useState(false);
  const [demoError, setDemoError] = useState<string>();
  const { refresh } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(undefined);
    try {
      await emailSignIn(email, password);
      refresh();
      navigate('/');
    } catch (err) {
      // An account that never finished confirming belongs on the code step, not
      // stranded behind a wrong-password message it can never satisfy.
      if (errorName(err) === UNCONFIRMED) {
        navigate('/sign-up', { state: { confirmEmail: email } });
        return;
      }
      setError(
        authErrorMessage(err, 'We could not sign you in. Check your email and password and try again.'),
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDemo() {
    setDemoOpening(true);
    setDemoError(undefined);
    try {
      await emailSignIn(DEMO_EMAIL, DEMO_PASSWORD);
      refresh();
      navigate('/');
    } catch (err) {
      setDemoError(authErrorMessage(err, 'Guest mode could not open just now. Please try again in a moment.'));
    } finally {
      setDemoOpening(false);
    }
  }

  return (
    <Page title="Asli" subtitle={{ hi: 'दवा के बैच की जाँच', kn: 'ಔಷಧಿ ಬ್ಯಾಚ್ ಪರಿಶೀಲನೆ' }}>
      <p className="reg-prose">
        Asli checks whether a medicine your family owns has been flagged by India's drug regulator (CDSCO).
      </p>

      <Button
        type="button"
        fullWidth
        disabled={submitting || demoOpening}
        onClick={() => void handleDemo()}
        style={{ marginTop: '1.2rem' }}
      >
        {demoOpening ? 'Opening guest mode…' : 'Continue as guest'}
      </Button>
      <p className="reg-prose reg-prose--muted" style={{ margin: '0.6rem 0 0' }}>
        No sign-up. Guest mode opens a sample family's cabinet, with sample data only.
      </p>
      {demoError ? (
        <p role="alert" className="reg-note reg-note--flagged" style={{ margin: '0.6rem 0 0' }}>
          {demoError}
        </p>
      ) : null}

      <div className="reg-head" style={{ marginTop: '1.8rem' }}>
        <h2>Sign in</h2>
      </div>

      <form onSubmit={(e) => void handleSubmit(e)} style={{ marginTop: '1.4rem' }}>
        <Field
          label="Email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Field
          label="Password"
          type={showPassword ? 'text' : 'password'}
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button type="button" className="reg-textbtn" onClick={() => setShowPassword((v) => !v)}>
          {showPassword ? 'Hide password' : 'Show password'}
        </button>
        {error ? (
          <p role="alert" className="reg-note reg-note--flagged" style={{ margin: '0.6rem 0 1rem' }}>
            {error}
          </p>
        ) : null}
        <Button type="submit" fullWidth disabled={submitting || demoOpening} style={{ marginTop: '1rem' }}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>

      {/* A new user has no other way in, so this is a struck action, not an inline link. */}
      <p className="reg-prose reg-prose--muted" style={{ margin: '1.8rem 0 0.4rem' }}>
        New to Asli?
      </p>
      <Link to="/sign-up" className="reg-btn reg-btn--wide">
        Create an account
      </Link>

      <RegisterIndex
        title="Open to anyone"
        entries={[
          {
            to: '/insights',
            name: 'How common is this?',
            gloss: 'CDSCO alert counts by month and reason. No sign-in needed.',
          },
          {
            to: '/dashboard',
            name: 'How well does Asli work?',
            gloss: 'Measured accuracy and running cost. No sign-in needed.',
          },
        ]}
      />
    </Page>
  );
}
