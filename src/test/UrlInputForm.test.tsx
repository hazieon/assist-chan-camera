import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import UrlInputForm from '../../components/UrlInputForm';

describe('UrlInputForm', () => {
  const defaultProps = {
    onFetch: vi.fn(),
    isLoading: false,
    isLandingPage: true,
    suggestions: ['Suggestion 1', 'Suggestion 2'],
  };

  it('renders correctly on landing page', () => {
    render(<UrlInputForm {...defaultProps} />);
    expect(screen.getByText('CHEF')).toBeInTheDocument();
    expect(screen.getByText('ASSISTANT')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search, paste a URL, or scan instructions')).toBeInTheDocument();
  });

  it('renders correctly on adjustment page', () => {
    render(<UrlInputForm {...defaultProps} isLandingPage={false} />);
    expect(screen.getByText('ADJUST')).toBeInTheDocument();
    expect(screen.getByText('RECIPE')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g. Make it gluten free...')).toBeInTheDocument();
  });

  it('calls onFetch when form is submitted', () => {
    render(<UrlInputForm {...defaultProps} />);
    const input = screen.getByPlaceholderText('Search, paste a URL, or scan instructions');
    fireEvent.change(input, { target: { value: 'Test Recipe' } });
    const submitButton = screen.getByText('Search');
    fireEvent.click(submitButton);
    expect(defaultProps.onFetch).toHaveBeenCalledWith('Test Recipe');
  });

  it('renders suggestions when not on landing page', () => {
    render(<UrlInputForm {...defaultProps} isLandingPage={false} />);
    expect(screen.getByText('Suggestion 1')).toBeInTheDocument();
    expect(screen.getByText('Suggestion 2')).toBeInTheDocument();
  });

  it('calls onFetch when a suggestion is clicked', () => {
    render(<UrlInputForm {...defaultProps} isLandingPage={false} />);
    const suggestion = screen.getByText('Suggestion 1');
    fireEvent.click(suggestion);
    expect(defaultProps.onFetch).toHaveBeenCalledWith('Suggestion 1');
  });

  it('calls onFetch with a random recipe when Random Recipe button is clicked', () => {
    render(<UrlInputForm {...defaultProps} />);
    const randomButton = screen.getByText('Random Recipe');
    fireEvent.click(randomButton);
    expect(defaultProps.onFetch).toHaveBeenCalled();
    // Since it's random, we just check it was called with a string
    expect(typeof defaultProps.onFetch.mock.calls[0][0]).toBe('string');
  });
});
