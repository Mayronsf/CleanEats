import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './design-system/global.css';
import { App } from './app/App';
import { aplicarLembrarDeMim } from './services/conta';

// "Lembrar de mim" (tela 02): encerra a sessão de quem não marcou e fechou o navegador.
aplicarLembrarDeMim().finally(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
