import React, { ReactNode } from 'react';

interface ContainerWithLabelProps {
  label: string;
  labelColor: string;
  borderColor: string;
  children: ReactNode;
}

const ContainerWithLabel: React.FC<ContainerWithLabelProps> = ({ label, labelColor, borderColor, children }) => {    
  return (
    <div className="relative">
      <div className={`border ${borderColor} px-4 py-8 rounded-lg relative`}>
        {children}
      </div>
      <div className="absolute top-0 left-6 bg-white px-2 transform -translate-y-1/2">
        <span className={`text-xs ${labelColor}`}>{label}</span>
      </div>
    </div>
  );
};

export default ContainerWithLabel;