import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { OptimizedImage } from '../OptimizedImage';

// Mock IntersectionObserver
const mockIntersectionObserver = jest.fn();
mockIntersectionObserver.mockReturnValue({
  observe: () => null,
  unobserve: () => null,
  disconnect: () => null,
});
window.IntersectionObserver = mockIntersectionObserver;

describe('OptimizedImage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with required props', () => {
    render(
      <OptimizedImage 
        src="https://example.com/image.jpg" 
        alt="Test image" 
      />
    );
    
    // Should show skeleton initially
    expect(screen.getByTestId('skeleton')).toBeInTheDocument();
  });

  it('shows skeleton while loading', () => {
    render(
      <OptimizedImage 
        src="https://example.com/image.jpg" 
        alt="Test image" 
      />
    );
    
    // Skeleton should be present initially
    const skeleton = document.querySelector('.MuiSkeleton-root');
    expect(skeleton).toBeInTheDocument();
  });

  it('handles image load event', async () => {
    const onLoad = jest.fn();
    render(
      <OptimizedImage 
        src="https://example.com/image.jpg" 
        alt="Test image"
        lazy={false}
        onLoad={onLoad}
      />
    );
    
    const image = document.querySelector('img');
    if (image) {
      fireEvent.load(image);
      expect(onLoad).toHaveBeenCalledTimes(1);
    }
  });

  it('handles image error event', async () => {
    const onError = jest.fn();
    render(
      <OptimizedImage 
        src="https://example.com/invalid-image.jpg" 
        alt="Test image"
        lazy={false}
        onError={onError}
      />
    );
    
    const image = document.querySelector('img');
    if (image) {
      fireEvent.error(image);
      expect(onError).toHaveBeenCalledTimes(1);
    }
  });

  it('shows error message when image fails to load', async () => {
    render(
      <OptimizedImage 
        src="https://example.com/invalid-image.jpg" 
        alt="Test image"
        lazy={false}
      />
    );
    
    const image = document.querySelector('img');
    if (image) {
      fireEvent.error(image);
      
      await waitFor(() => {
        expect(screen.getByText('画像を読み込めませんでした')).toBeInTheDocument();
      });
    }
  });

  it('respects custom dimensions', () => {
    const { container } = render(
      <OptimizedImage 
        src="https://example.com/image.jpg" 
        alt="Test image"
        width={200}
        height={150}
      />
    );
    
    const imageContainer = container.firstChild as HTMLElement;
    expect(imageContainer).toBeInTheDocument();
  });

  it('sets up intersection observer for lazy loading', () => {
    render(
      <OptimizedImage 
        src="https://example.com/image.jpg" 
        alt="Test image"
        lazy={true}
      />
    );
    
    expect(mockIntersectionObserver).toHaveBeenCalled();
  });

  it('loads immediately when lazy is false', () => {
    render(
      <OptimizedImage 
        src="https://example.com/image.jpg" 
        alt="Test image"
        lazy={false}
      />
    );
    
    const image = document.querySelector('img');
    expect(image).toBeInTheDocument();
    expect(image?.getAttribute('loading')).toBe('eager');
  });
});