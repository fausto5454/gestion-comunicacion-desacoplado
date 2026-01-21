import React from 'react';

export const COLOR_IE_GREEN = '#4caf50';
export const COLOR_IE_GREEN_DARK = '#388e3c';
export const COLOR_SECONDARY_RED = '#ef5350';
export const COLOR_IE_GREEN_LIGHT = '#d1e7c5';

const CustomStyles = () => (
    <style>
        {`
            :root {
                --ie-green: ${COLOR_IE_GREEN};
                --ie-green-dark: ${COLOR_IE_GREEN_DARK};
                --ie-green-light: ${COLOR_IE_GREEN_LIGHT};
                --secondary-red: ${COLOR_SECONDARY_RED};
            }
            .rounded-4xl { border-radius: 2rem; }
            .w-22 { width: 5.5rem; }
            .h-20 { height: 5rem; }
            .focus-ring-ie-green:focus { --tw-ring-color: var(--ie-green); }
            .focus-border-ie-green:focus { border-color: var(--ie-green); }
            html, body, #root, .app-container {
                height: 100%;
                margin: 0;
                padding: 0;
                font-family: 'Inter', sans-serif;
            }
        `}
    </style>
);

export default CustomStyles;