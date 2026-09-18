import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './theme/tokens.css';
import './i18n';
import { AppRoot } from './app/AppRoot';
import { enableMocking } from './mocks/enableMocking';
import { getStoredTextSize, applyTextSize } from './theme/textSize';

applyTextSize(getStoredTextSize());

const rootEl = document.getElementById('root');
if (!rootEl) {
  throw new Error('#root element not found');
}

void enableMocking().then(() => {
  createRoot(rootEl).render(
    <StrictMode>
      <BrowserRouter>
        <AppRoot />
      </BrowserRouter>
    </StrictMode>,
  );
});
