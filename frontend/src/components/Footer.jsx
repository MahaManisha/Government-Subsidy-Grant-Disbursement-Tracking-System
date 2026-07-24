import React from 'react';

export default function Footer() {
  return (
    <footer className="w-full bg-white border-t border-slate-200 py-4 px-6 text-center text-xs text-slate-500">
      <div className="flex flex-col sm:flex-row items-center justify-between space-y-2 sm:space-y-0">
        <p>© 2026 Government Subsidy & Grant Disbursement System. All Rights Reserved.</p>
        <div className="flex items-center space-x-4">
          <a href="#" className="hover:text-govBlue">Security Policy</a>
          <span>•</span>
          <a href="#" className="hover:text-govBlue">Terms of Service</a>
          <span>•</span>
          <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold border border-emerald-200 px-2 py-0.5 rounded-full">
            Secure Server v3.4-PROD
          </span>
        </div>
      </div>
    </footer>
  );
}
