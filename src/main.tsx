import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { ProgressStore } from './progress/store';
import './styles/global.css';

const store = new ProgressStore();
const root = createRoot(document.getElementById('root')!);

store.init().finally(() => {
  root.render(
    <StrictMode>
      <App store={store} />
    </StrictMode>,
  );
});
