import React from 'react';
import { TbDownload } from 'react-icons/tb';

interface ButtonProps {
  className?: string;
  onClick: () => void;
  disabled: boolean;
  children: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({ className, onClick, disabled, children }) => {
  return (
    <button
      className={`w-3/4 md:w-2/5 bg-blue-500 text-white p-2 rounded flex justify-center text-sm ${
        disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
      } ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      <TbDownload className="mr-1 md:mr-2" size={20} />
      <span>{children}</span>
    </button>
  );
};

export default Button;