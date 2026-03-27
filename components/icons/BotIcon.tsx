
import React from 'react';

export const BotIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        {/* Chef Hat */}
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c-2.5 0-4.5 1.5-4.5 3.5 0 .5.1 1 .3 1.5C6.5 8.5 5 10.5 5 13c0 1.5.5 3 1.5 4v2h11v-2c1-1 1.5-2.5 1.5-4 0-2.5-1.5-4.5-2.8-5-.2-.5-.3-1-.3-1.5 0-2-2-3.5-4.5-3.5z" />
        {/* Robot Face Eyes */}
        <circle cx="9.5" cy="13" r="1" fill="currentColor" />
        <circle cx="14.5" cy="13" r="1" fill="currentColor" />
        {/* Robot Mouth */}
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 16h6" />
    </svg>
);
