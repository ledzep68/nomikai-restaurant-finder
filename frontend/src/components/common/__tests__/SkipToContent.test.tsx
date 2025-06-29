import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SkipToContent } from '../SkipToContent';

describe('SkipToContent', () => {
  beforeEach(() => {
    // Create a mock main content element
    const mainContent = document.createElement('div');
    mainContent.id = 'main-content';
    mainContent.tabIndex = -1;
    document.body.appendChild(mainContent);
  });

  afterEach(() => {
    // Clean up
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
      document.body.removeChild(mainContent);
    }
  });

  it('renders skip to content button', () => {
    render(<SkipToContent />);
    const button = screen.getByRole('button', { name: 'メインコンテンツへスキップ' });
    expect(button).toBeInTheDocument();
  });

  it('focuses main content when clicked', () => {
    render(<SkipToContent />);
    const button = screen.getByRole('button', { name: 'メインコンテンツへスキップ' });
    const mainContent = document.getElementById('main-content');
    
    fireEvent.click(button);
    
    expect(document.activeElement).toBe(mainContent);
  });
});