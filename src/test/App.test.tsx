import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import App from '../../App';

// Mock geminiService
vi.mock('../../services/geminiService', () => ({
  fetchRecipe: vi.fn(),
  adjustRecipe: vi.fn(),
}));

describe('App', () => {
  it('renders landing page initially', () => {
    render(<App />);
    const chefElements = screen.getAllByText('CHEF');
    expect(chefElements.length).toBeGreaterThan(0);
    const assistantElements = screen.getAllByText('ASSISTANT');
    expect(assistantElements.length).toBeGreaterThan(0);
  });

  it('shows tutorial on first visit', async () => {
    // Clear localStorage to ensure first visit
    localStorage.clear();
    render(<App />);
    
    // Wait for tutorial step 0 to be set (1000ms delay in App.tsx)
    await waitFor(() => {
      expect(screen.getByText(/The search bar you can type your recipe search/i)).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  it('can skip tutorial', async () => {
    localStorage.clear();
    render(<App />);
    
    // Wait for tutorial to appear
    const skipButton = await screen.findByText('Skip Tutorial', {}, { timeout: 2000 });
    fireEvent.click(skipButton);
    
    await waitFor(() => {
      expect(screen.queryByText(/The search bar you can type your recipe search/i)).not.toBeInTheDocument();
    });
  });
});
