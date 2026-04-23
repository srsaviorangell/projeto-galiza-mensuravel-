import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CircularProgress } from '../components/CircularProgress';

describe('CircularProgress', () => {
  it('renders with 0% when current is 0', () => {
    render(<CircularProgress current={0} total={100} />);
    expect(screen.getByText('0%')).toBeInTheDocument();
    expect(screen.getByText('Concluído')).toBeInTheDocument();
  });

  it('renders with 50% when current is half of total', () => {
    render(<CircularProgress current={50} total={100} />);
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('renders with 100% when current equals total', () => {
    render(<CircularProgress current={100} total={100} />);
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('handles zero total without division error', () => {
    render(<CircularProgress current={0} total={0} />);
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('applies custom color when provided', () => {
    const { container } = render(<CircularProgress current={75} total={100} color="#ff0000" />);
    const fillCircle = container.querySelector('.fill');
    expect(fillCircle).toHaveStyle({ stroke: '#ff0000' });
  });
});
