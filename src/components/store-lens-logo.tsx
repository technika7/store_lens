import React from 'react';

interface StoreLensLogoProps {
  className?: string;
}

export function StoreLensLogo({ className = "w-6 h-6" }: StoreLensLogoProps) {
  return (
    <svg 
      viewBox="0 0 24 24" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="storeLensLogoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>
      </defs>
      
      {/* The Lens (Magnifying glass frame) */}
      <circle 
        cx="10" 
        cy="10" 
        r="7" 
        stroke="url(#storeLensLogoGrad)" 
        strokeWidth="2.2" 
        strokeLinecap="round"
      />
      
      {/* Lens Handle */}
      <path 
        d="M15 15L21 21" 
        stroke="url(#storeLensLogoGrad)" 
        strokeWidth="2.5" 
        strokeLinecap="round"
      />
      
      {/* Inner App Store Grid inside the lens */}
      <rect x="7.5" y="7.5" width="2" height="2" rx="0.4" fill="#10b981" />
      <rect x="10.5" y="7.5" width="2" height="2" rx="0.4" fill="#06b6d4" />
      <rect x="7.5" y="10.5" width="2" height="2" rx="0.4" fill="#06b6d4" />
      <rect x="10.5" y="10.5" width="2" height="2" rx="0.4" fill="#10b981" />
    </svg>
  );
}
