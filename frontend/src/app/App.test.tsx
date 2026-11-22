import { render, screen } from '@testing-library/react';
import { App } from './App';

describe('App (smoke)', () => {
  it('renderiza a vitrine do design system em /design-system', async () => {
    window.history.pushState({}, '', '/design-system');
    render(<App />);
    expect(await screen.findByRole('heading', { level: 1 }, { timeout: 5000 })).toHaveTextContent('Design');
  });
});
