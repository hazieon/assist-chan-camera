import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ChatInterface from '../../components/ChatInterface';
import { Role } from '../../types';

describe('ChatInterface', () => {
  const defaultProps = {
    chatHistory: [
      { role: Role.ASSISTANT, content: 'Hello! How can I help you?' },
      { role: Role.USER, content: 'Can you make this vegan?' },
    ],
    onSendMessage: vi.fn(),
    isAnswering: false,
    isCookingMode: false,
    isContinuousListening: false,
    onToggleListening: vi.fn(),
    isMuted: false,
    speakingMessageIndex: null,
    onToggleMessageSpeech: vi.fn(),
    pendingMod: null,
    onConfirmMod: vi.fn(),
    onCancelMod: vi.fn(),
    suggestions: ['Suggestion 1', 'Suggestion 2'],
  };

  it('renders chat history', () => {
    render(<ChatInterface {...defaultProps} />);
    expect(screen.getByText('Hello! How can I help you?')).toBeInTheDocument();
    expect(screen.getByText('Can you make this vegan?')).toBeInTheDocument();
  });

  it('calls onSendMessage when form is submitted', () => {
    render(<ChatInterface {...defaultProps} />);
    const input = screen.getByPlaceholderText('e.g. Make it gluten free...');
    fireEvent.change(input, { target: { value: 'Test Message' } });
    const submitButton = screen.getByTitle('Send Message');
    fireEvent.click(submitButton);
    expect(defaultProps.onSendMessage).toHaveBeenCalledWith('Test Message');
  });

  it('renders suggestion buttons when not in cooking mode', () => {
    render(<ChatInterface {...defaultProps} />);
    expect(screen.getByText('Suggestion 1')).toBeInTheDocument();
    expect(screen.getByText('Suggestion 2')).toBeInTheDocument();
  });

  it('calls onSendMessage when a suggestion is clicked', () => {
    render(<ChatInterface {...defaultProps} />);
    const suggestion = screen.getByText('Suggestion 1');
    fireEvent.click(suggestion);
    expect(defaultProps.onSendMessage).toHaveBeenCalledWith('Suggestion 1');
  });

  it('renders confirmation buttons when pendingMod is present', () => {
    render(<ChatInterface {...defaultProps} pendingMod={{ prompt: 'test', summary: 'test summary' }} />);
    expect(screen.getByText('Confirm')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });
});
