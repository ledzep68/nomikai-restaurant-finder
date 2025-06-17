import React from 'react';
import { render, screen } from '@testing-library/react';
import LoadingSpinner from '../LoadingSpinner';

describe('LoadingSpinner', () => {
  it('renders with default message', () => {
    render(<LoadingSpinner />);
    expect(screen.getByText('読み込み中...')).toBeInTheDocument();
  });

  it('renders with custom message', () => {
    const customMessage = 'データを取得中...';
    render(<LoadingSpinner message={customMessage} />);
    expect(screen.getByText(customMessage)).toBeInTheDocument();
  });

  it('displays loading spinner', () => {
    render(<LoadingSpinner />);
    const spinner = screen.getByRole('progressbar');
    expect(spinner).toBeInTheDocument();
  });
});