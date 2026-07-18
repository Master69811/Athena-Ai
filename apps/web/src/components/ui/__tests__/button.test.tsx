import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '../button';

describe('Button', () => {
  it('renders its children', () => {
    render(<Button>Salva</Button>);
    expect(screen.getByRole('button', { name: 'Salva' })).toBeInTheDocument();
  });

  it('is disabled while loading', () => {
    render(<Button loading>Salva</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('respects the disabled prop', () => {
    render(<Button disabled>Salva</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('fires onClick when enabled', () => {
    const onClick = jest.fn();
    render(<Button onClick={onClick}>Salva</Button>);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('does not fire onClick while loading', () => {
    const onClick = jest.fn();
    render(
      <Button loading onClick={onClick}>
        Salva
      </Button>,
    );
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
  });
});
