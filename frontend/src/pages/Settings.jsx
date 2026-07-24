import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast, ToastContainer } from 'react-toastify';
import { Moon, Sun } from 'lucide-react';
import 'react-toastify/dist/ReactToastify.css';

export default function Settings() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Read theme state on mount
    const hasDarkClass = document.documentElement.classList.contains('dark');
    setIsDark(hasDarkClass);
  }, []);

  const toggleTheme = (checked) => {
    setIsDark(checked);
    if (checked) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      toast.success('Dark theme enabled.');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      toast.info('Light theme enabled.');
    }
  };

  const { register, handleSubmit } = useForm({
    defaultValues: {
      cron: '0 */15 * * * *',
      initiateHours: 24,
      verificationHours: 48,
      districtHours: 72,
      financeHours: 96,
      thresholdScore: 30
    }
  });

  const onSubmit = (data) => {
    toast.success('System configuration parameters saved successfully!', {
      position: "top-right",
      autoClose: 3000
    });
  };

  return (
    <div className="space-y-6">
      <ToastContainer position="top-right" autoClose={3000} />
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black tracking-tight text-slate-800">System Configurations</h1>
        <p className="text-slate-500 mt-1">Configure automated workflows, SLA timeouts, and compliance job cron triggers.</p>
      </div>

      <div className="max-w-2xl space-y-6">
        {/* Theme Preferences */}
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <h4 className="text-sm font-bold uppercase tracking-wider text-slate-800 mb-4 border-b border-slate-50 pb-2 flex items-center space-x-2">
            <span>Visual Theme Preference</span>
          </h4>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {isDark ? <Moon className="h-5 w-5 text-indigo-500" /> : <Sun className="h-5 w-5 text-amber-500" />}
              <div>
                <p className="text-sm font-semibold text-slate-700">Dark Mode Interface</p>
                <p className="text-xs text-slate-400">Enable high-contrast layout for night operations.</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isDark}
                onChange={(e) => toggleTheme(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>

        {/* Configurations Form */}
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Cron */}
            <div>
              <h4 className="text-sm font-bold uppercase tracking-wider text-slate-800 mb-2 border-b border-slate-50 pb-2">
                Compliance Reminder Schedule
              </h4>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Cron Trigger Expression</label>
                  <input
                    type="text"
                    {...register('cron')}
                    className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-mono outline-none focus:border-govBlue"
                  />
                </div>
              </div>
            </div>

            {/* SLAs */}
            <div>
              <h4 className="text-sm font-bold uppercase tracking-wider text-slate-800 mb-2 border-b border-slate-50 pb-2">
                SLA Timeout Configuration (Hours)
              </h4>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Initiation Stage SLA</label>
                  <input
                    type="number"
                    {...register('initiateHours')}
                    className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-govBlue"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Field Verification SLA</label>
                  <input
                    type="number"
                    {...register('verificationHours')}
                    className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-govBlue"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">District Review SLA</label>
                  <input
                    type="number"
                    {...register('districtHours')}
                    className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-govBlue"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Finance Review SLA</label>
                  <input
                    type="number"
                    {...register('financeHours')}
                    className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-govBlue"
                  />
                </div>
              </div>
            </div>

            {/* Thresholds */}
            <div>
              <h4 className="text-sm font-bold uppercase tracking-wider text-slate-800 mb-2 border-b border-slate-50 pb-2">
                Eligibility Thresholds
              </h4>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Suspicious Score Threshold</label>
                  <input
                    type="number"
                    {...register('thresholdScore')}
                    className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-govBlue"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="h-10 rounded-lg bg-blue-600 px-6 text-sm font-semibold text-white hover:bg-blue-700 transition-all shadow-sm"
            >
              Save Parameters
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
