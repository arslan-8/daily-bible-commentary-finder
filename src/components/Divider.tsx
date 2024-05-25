// src/DividerWithLabel.tsx
import React from 'react';

interface DividerWithLabelProps {
  label: string;
}

const DividerWithLabel: React.FC<DividerWithLabelProps> = ({ label }) => {
  return (
    <div className="relative flex items-center mt-10 mb-8">
      <div className="flex-grow border-t border-gray-300"></div>
      <span className="flex-shrink mx-4 text-gray-500 text-sm">{label}</span>
      <div className="flex-grow border-t border-gray-300"></div>
    </div>
  );
};

export default DividerWithLabel;