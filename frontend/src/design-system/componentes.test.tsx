import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MarketplaceCard, TimelineStatusPedido, Preco, QuantityStepper, proporcoes } from '.';
import { formatarMoeda, formatarData } from '../lib/formato';

const prato = {
  id: 'p1', nome: 'Frango Grelhado Fitness', imagemUrl: '/x.jpg', categoria: 'Alta Proteína', preco: 24.9, nota: 4.9,
  restaurante: { nome: 'Sabor Natural', distanciaKm: 1.2 },
  macros: { calorias: 420, proteinas: 38, carboidratos: 32, gorduras: 12 },
};

describe('formatos pt-BR', () => {
  it('formata moeda e data', () => {
    expect(formatarMoeda(1234.56)).toBe('R$ 1.234,56');
    expect(formatarData('2026-11-22T01:00:00Z')).toBe('21/11/2026'); // fuso America/Recife (UTC-3)
  });
});

describe('MarketplaceCard (CE-4)', () => {
  it('mostra kcal, proteínas, carboidratos e preço', () => {
    render(<MemoryRouter><MarketplaceCard prato={prato} /></MemoryRouter>);
    expect(screen.getByText('420kcal')).toBeInTheDocument();
    expect(screen.getByText('38g')).toBeInTheDocument();
    expect(screen.getByText('32g')).toBeInTheDocument();
    expect(screen.getByLabelText('R$ 24,90')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Frango Grelhado Fitness' })).toHaveAttribute('href', '/app/marmitas/p1');
  });

  it('calcula a proporção da barra como nas telas (46/39/15)', () => {
    expect(proporcoes(prato.macros)).toEqual({ p: 46, c: 39, g: 15 });
  });
});

describe('TimelineStatusPedido (CE-14)', () => {
  it('marca a etapa atual', () => {
    render(<TimelineStatusPedido statusAtual="PREPARANDO" historico={[]} />);
    expect(screen.getByText('Em preparo').closest('li')).toHaveAttribute('aria-current', 'step');
  });
  it('mostra pedido cancelado', () => {
    render(<TimelineStatusPedido statusAtual="CANCELADO" historico={[]} />);
    expect(screen.getByRole('status')).toHaveTextContent('Pedido cancelado');
  });
});

describe('Preco e QuantityStepper', () => {
  it('separa os centavos', () => {
    const { container } = render(<Preco valor={24.9} />);
    expect(container.querySelector('small')).toHaveTextContent(',90');
  });
  it('respeita o mínimo', () => {
    const onChange = vi.fn();
    render(<QuantityStepper valor={1} onChange={onChange} />);
    expect(screen.getByLabelText('Diminuir quantidade')).toBeDisabled();
    fireEvent.click(screen.getByLabelText('Aumentar quantidade'));
    expect(onChange).toHaveBeenCalledWith(2);
  });
});
