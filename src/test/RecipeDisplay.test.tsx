import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import InstructionDisplay from '../../components/RecipeDisplay';
import { InstructionSet } from '../../types';

const mockInstructionSet: InstructionSet = {
  title: 'Test Recipe',
  materials: ['Ingredient 1', 'Ingredient 2'],
  steps: ['Step 1', 'Step 2'],
  language: 'en-US',
  isFood: true,
};

describe('InstructionDisplay', () => {
  const defaultProps = {
    instructionSet: mockInstructionSet,
    completedSteps: [false, false],
    onToggleStep: vi.fn(),
    onReadInstructions: vi.fn(),
    onReadMaterials: vi.fn(),
    onStopReading: vi.fn(),
    readingStatus: 'idle' as const,
    isReadingMaterials: false,
    isMuted: false,
    onEcoSwitch: vi.fn(),
    onRevert: vi.fn(),
    onStartCooking: vi.fn(),
    isModifying: false,
    isEcoApplied: false,
    isCookingMode: false,
    onModify: vi.fn(),
  };

  it('renders the recipe title', () => {
    render(<InstructionDisplay {...defaultProps} />);
    expect(screen.getByText('Test Recipe')).toBeInTheDocument();
  });

  it('renders materials and steps sections', () => {
    render(<InstructionDisplay {...defaultProps} />);
    expect(screen.getByText('MATERIALS')).toBeInTheDocument();
    expect(screen.getByText('STEPS')).toBeInTheDocument();
  });

  it('calls onToggleStep when a checkbox is clicked', () => {
    render(<InstructionDisplay {...defaultProps} />);
    const checkbox = screen.getAllByRole('checkbox')[0];
    fireEvent.click(checkbox);
    expect(defaultProps.onToggleStep).toHaveBeenCalledWith(0);
  });

  it('calls onStartCooking when START button is clicked', () => {
    render(<InstructionDisplay {...defaultProps} />);
    const startButton = screen.getByText('START');
    fireEvent.click(startButton);
    expect(defaultProps.onStartCooking).toHaveBeenCalled();
  });
});
