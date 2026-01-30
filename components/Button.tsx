import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  fullWidth = false, 
  className = '', 
  ...props 
}) => {
  const baseStyles = "px-6 py-3 rounded-xl font-semibold transition-all duration-300 transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-[#99FFB6] text-[#141C4D] hover:bg-[#7FE69E] shadow-lg shadow-[#99FFB6]/20",
    secondary: "bg-transparent border-2 border-[#13808E] text-[#13808E] hover:bg-[#13808E] hover:text-white",
    danger: "bg-red-100 text-red-600 hover:bg-red-200"
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};