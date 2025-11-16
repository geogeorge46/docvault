import React from 'react';

export const ZipIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    strokeWidth="1.5"
    stroke="currentColor"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
    <path d="M16 12v-6a2 2 0 1 0 -4 0v6"></path>
    <path d="M12 12h-8a2 2 0 0 0 -2 2v4a2 2 0 0 0 2 2h8"></path>
    <path d="M14 18h2a2 2 0 0 0 2 -2v-4a2 2 0 0 0 -2 -2h-2"></path>
    <path d="M4 14h6"></path>
    <path d="M4 18h6"></path>
  </svg>
);
