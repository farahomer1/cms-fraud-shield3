// Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

import React from 'react';

interface CMSLogoProps {
  variant?: 'light' | 'dark';
  height?: number;
}

export const CMSLogo: React.FC<CMSLogoProps> = ({ variant = 'light', height = 32 }) => {
  return (
    <img
      src="/cms-logo.svg"
      alt="Centers for Medicare & Medicaid Services Logo"
      style={{
        height,
        display: 'inline-block',
        verticalAlign: 'middle',
      }}
    />
  );
};
