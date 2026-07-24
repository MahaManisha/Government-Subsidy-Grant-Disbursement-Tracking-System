import React from 'react';

export default function LoadingSpinner({ size = 'medium' }) {
  const sizes = {
    small: 'h-5 w-5 border-2',
    medium: 'h-10 w-10 border-3',
    large: 'h-16 w-16 border-4'
  };

  return (
    <div className="flex items-center justify-center p-6">
      <div
        className={`${sizes[size]} animate-spin rounded-full border-t-blue-600 border-slate-200`}
        role="status"
        aria-label="loading"
      />
    </div>
  );
}
