import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export default function Forbidden() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center p-6">
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-red-100 dark:bg-red-950/30 text-red-600 dark:text-red-400 mb-6 shadow-lg animate-pulse">
        <ShieldAlert className="h-10 w-10" />
      </div>
      <h1 className="text-4xl font-extrabold tracking-tight text-slate-800 dark:text-white sm:text-5xl">
        403 - Access Denied
      </h1>
      <p className="mt-4 text-base text-slate-500 dark:text-slate-400 max-w-md">
        Oops! You do not have the required permissions to view this resource. Please contact your administrator if you think this is a mistake.
      </p>
      <div className="mt-8">
        <Link
          to="/"
          className="inline-flex items-center space-x-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 shadow-md transition-all duration-300"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Return to Dashboard</span>
        </Link>
      </div>
    </div>
  );
}
