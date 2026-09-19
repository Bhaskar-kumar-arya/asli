import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Page } from '../shell/components/Page';
import { Field } from '../shell/components/Field';
import { Button } from '../shell/components/Button';
import { emailSignIn } from './session';
import { useAuth } from './AuthProvider';

export function SignInScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
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
    } catch {
      setError('We could not sign you in. Check your email and password and try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Page title="Asli" subtitle={{ hi: 'दवा के बैच की जाँच', kn: 'ಔಷಧಿ ಬ್ಯಾಚ್ ಪರಿಶೀಲನೆ' }}>
      <p className="reg-prose">
        Asli checks whether a medicine your family owns has been flagged by India's drug regulator (CDSCO).
      </p>

      <div className="reg-head">
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
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error ? (
          <p role="alert" className="reg-note reg-note--flagged" style={{ margin: '0 0 1rem' }}>
            {error}
          </p>
        ) : null}
        <Button type="submit" fullWidth disabled={submitting}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
    </Page>
  );
}
