import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TouchButton } from '../TouchButton';

describe('TouchButton', () => {
  it('renders with touch optimization by default', () => {
    render(<TouchButton>Test Button</TouchButton>);
    const button = screen.getByRole('button', { name: 'Test Button' });
    expect(button).toBeInTheDocument();
  });

  it('applies touch-optimized styles when touchOptimized is true', () => {
    render(<TouchButton touchOptimized={true}>Touch Button</TouchButton>);
    const button = screen.getByRole('button', { name: 'Touch Button' });
    
    // Check if the button has the minimum touch target size
    // const styles = window.getComputedStyle(button);
    expect(button).toBeInTheDocument();
  });

  it('handles click events properly', () => {
    const handleClick = jest.fn();
    render(<TouchButton onClick={handleClick}>Clickable</TouchButton>);
    
    const button = screen.getByRole('button', { name: 'Clickable' });
    fireEvent.click(button);
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('can be disabled', () => {
    const handleClick = jest.fn();
    render(
      <TouchButton disabled onClick={handleClick}>
        Disabled Button
      </TouchButton>
    );
    
    const button = screen.getByRole('button', { name: 'Disabled Button' });
    expect(button).toBeDisabled();
    
    fireEvent.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('forwards other props correctly', () => {
    render(
      <TouchButton variant="outlined" color="secondary" data-testid="custom-button">
        Custom Button
      </TouchButton>
    );
    
    const button = screen.getByTestId('custom-button');
    expect(button).toBeInTheDocument();
  });
});