import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center text-center p-6 space-y-6">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 border border-rose-100 animate-bounce">
        <ShieldAlert className="h-8 w-8" />
      </div>
      <div className="space-y-2">
        <h1 className="text-4xl font-black text-slate-800 tracking-tight">404 - File Not Found</h1>
        <p className="text-slate-500 max-w-md text-sm mx-auto leading-relaxed">
          The requested administrative module or file record does not exist on the subsidy dispatch server.
        </p>
      </div>
      <Link
        to="/"
        className="flex h-10 items-center justify-center space-x-2 rounded-xl bg-blue-600 px-6 text-sm font-semibold text-white hover:bg-blue-700 transition-all shadow-sm"
      >
        <Home className="h-4 w-4" />
        <span>Return to Dashboard</span>
      </Link>
    </div>
  );
}
