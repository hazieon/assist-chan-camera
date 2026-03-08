
import React from 'react';

interface ActionButtonsProps {
    onModify: (prompt: string, summary: string) => void;
    disabled: boolean;
}

const ActionButton: React.FC<{ onClick: () => void; disabled: boolean; children: React.ReactNode }> = ({ onClick, disabled, children }) => (
    <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="flex-1 bg-primary text-text-primary font-semibold py-2 px-4 rounded-md hover:bg-accent hover:text-white transition-colors disabled:bg-opacity-50 disabled:text-text-secondary disabled:cursor-not-allowed text-sm"
    >
        {children}
    </button>
);

const actionGroups = [
    {
        title: 'Scale Materials',
        actions: [
            { label: '2x', prompt: 'Double all quantities.', summary: 'Scaling to 2x' },
            { label: '3x', prompt: 'Triple all quantities.', summary: 'Scaling to 3x' },
            { label: '5x', prompt: 'Quintuple all quantities.', summary: 'Scaling to 5x' },
        ]
    },
    {
        title: 'Convert Units',
        actions: [
            { label: 'To Metric', prompt: 'Convert all units to metric (grams, ml, Celsius).', summary: 'Metric conversion' },
            { label: 'To Imperial', prompt: 'Convert all units to imperial (cups, oz, Fahrenheit).', summary: 'Imperial conversion' },
        ]
    }
];

const ActionButtons: React.FC<ActionButtonsProps> = ({ onModify, disabled }) => {
    return (
        <div className="bg-secondary p-4 rounded-lg shadow-lg animate-fade-in">
             <h3 className="text-lg font-bold mb-4 text-accent border-b border-border-base pb-2">Quick Actions</h3>
            <div className="flex flex-col md:flex-row gap-8">
                {actionGroups.map((group) => (
                    <div key={group.title} className="flex-1">
                        <h4 className="text-md font-semibold mb-3 text-text-secondary">{group.title}</h4>
                        <div className={`grid ${group.actions.length === 3 ? 'grid-cols-3' : 'grid-cols-2'} gap-2`}>
                            {group.actions.map(({ label, prompt, summary }) => (
                                 <ActionButton
                                    key={label}
                                    onClick={() => onModify(prompt, summary)}
                                    disabled={disabled}
                                >
                                    {label}
                                </ActionButton>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ActionButtons;
