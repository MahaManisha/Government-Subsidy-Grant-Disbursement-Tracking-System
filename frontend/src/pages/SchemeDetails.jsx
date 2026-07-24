import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Edit3, Calendar, Award, DollarSign, ShieldAlert, Sparkles } from 'lucide-react';
import axiosInstance from '../api/axiosInstance';
import LoadingSpinner from '../components/LoadingSpinner';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function SchemeDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [scheme, setScheme] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetails = async () => {
      setLoading(true);
      try {
        const response = await axiosInstance.get(`/v1/schemes/${id}`);
        if (response.data && response.data.success) {
          setScheme(response.data.data);
        } else {
          toast.error('Failed to retrieve scheme details.');
          navigate('/schemes');
        }
      } catch (err) {
        toast.error(err.message || 'Error occurred while loading scheme.');
        navigate('/schemes');
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [id]);

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-100 py-20 shadow-sm">
        <LoadingSpinner size="large" />
        <p className="text-center text-xs font-semibold text-slate-400 mt-4">Retrieving scheme catalog metrics...</p>
      </div>
    );
  }

  if (!scheme) return null;

  // Calculate budget utilization math
  const budgetAllocation = scheme.budgetAllocation || 1;
  const remainingBudget = scheme.remainingBudget || 0;
  const disbursedAmount = budgetAllocation - remainingBudget;
  const utilizationPercent = Math.min(100, Math.max(0, (disbursedAmount / budgetAllocation) * 100));

  return (
    <div className="space-y-6">
      <ToastContainer position="top-right" autoClose={3000} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div className="flex items-center space-x-4">
          <Link
            to="/schemes"
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-slate-800 transition-all shadow-sm"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-800">Scheme Parameters</h1>
            <p className="text-slate-500 mt-1">Configure criteria, budgets, and validity bounds for grant programs.</p>
          </div>
        </div>

        <Link
          to={`/schemes/edit/${scheme.id}`}
          className="flex h-10 items-center justify-center space-x-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 transition-all shadow-sm"
        >
          <Edit3 className="h-4 w-4" />
          <span>Edit Scheme</span>
        </Link>
      </div>

      {/* Detail Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Column: Summary Card */}
        <div className="md:col-span-1 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-blue-600 inline-block">
              {scheme.code}
            </span>
            <h2 className="text-xl font-bold text-slate-800 leading-snug">{scheme.name}</h2>
            <div className="flex items-center space-x-2">
              <span
                className={`inline-flex items-center space-x-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                  scheme.active
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                    : 'bg-slate-50 text-slate-500 border border-slate-200'
                }`}
              >
                <Award className="h-3.5 w-3.5" />
                <span>{scheme.active ? 'Accepting Applications' : 'Suspended'}</span>
              </span>
            </div>
          </div>

          {/* Audit parameters */}
          <div className="border-t border-slate-50 pt-4 text-left space-y-2 text-[11px] text-slate-400 font-semibold">
            <div className="flex items-center justify-between">
              <span>Operational Status:</span>
              <span className="text-slate-700 font-bold uppercase">{scheme.status}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Created By:</span>
              <span className="text-slate-600">{scheme.createdBy || 'SYSTEM'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Created At:</span>
              <span className="text-slate-600">
                {scheme.createdAt ? new Date(scheme.createdAt).toLocaleDateString() : 'N/A'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Updated At:</span>
              <span className="text-slate-600">
                {scheme.updatedAt ? new Date(scheme.updatedAt).toLocaleDateString() : 'N/A'}
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Full Details */}
        <div className="md:col-span-2 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm space-y-8">
          {/* Objectives */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-50 pb-2 mb-4">
              Scheme Description & Objective
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">{scheme.description}</p>
          </div>

          {/* Eligibility Criteria */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-50 pb-2 mb-4 flex items-center space-x-2">
              <Award className="h-4 w-4 text-blue-600" />
              <span>Configured Eligibility Criteria</span>
            </h3>
            <div className="grid gap-4 sm:grid-cols-2 text-sm">
              <div>
                <p className="text-slate-400 text-xs">Age Limit</p>
                <p className="font-semibold text-slate-800 mt-0.5">
                  {scheme.minAge || 'Any'} to {scheme.maxAge || 'Any'} years
                </p>
              </div>
              <div>
                <p className="text-slate-400 text-xs">Maximum Annual Income</p>
                <p className="font-semibold text-slate-800 mt-0.5">
                  {scheme.maxAnnualIncome ? `₹${scheme.maxAnnualIncome.toLocaleString()}` : 'No ceiling'}
                </p>
              </div>
              <div>
                <p className="text-slate-400 text-xs">Maximum Grant Amount</p>
                <p className="font-semibold text-slate-800 mt-0.5">
                  {scheme.maxGrantAmount ? `₹${scheme.maxGrantAmount.toLocaleString()}` : 'No ceiling'}
                </p>
              </div>
              <div>
                <p className="text-slate-400 text-xs">Gender & Category</p>
                <p className="font-semibold text-slate-800 mt-0.5">
                  Gender: <span className="uppercase">{scheme.gender || 'ANY'}</span> | Category: <span className="uppercase">{scheme.category || 'ANY'}</span>
                </p>
              </div>
              <div>
                <p className="text-slate-400 text-xs">Occupation & Location</p>
                <p className="font-semibold text-slate-800 mt-0.5">
                  Job: {scheme.occupation || 'Any'} | Region: {scheme.district || 'Any District'}, {scheme.state || 'Any State'}
                </p>
              </div>
              <div>
                <p className="text-slate-400 text-xs">Required Documents</p>
                <p className="font-semibold text-slate-800 mt-0.5 text-xs">
                  {scheme.requiredDocuments || 'None required'}
                </p>
              </div>
            </div>
          </div>

          {/* Dates */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-50 pb-2 mb-4 flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-blue-600" />
              <span>Operational Validity Window</span>
            </h3>
            <div className="grid gap-4 sm:grid-cols-2 text-sm">
              <div>
                <p className="text-slate-400 text-xs">Start Date</p>
                <p className="font-semibold text-slate-800 mt-0.5">{scheme.startDate}</p>
              </div>
              <div>
                <p className="text-slate-400 text-xs">End Date</p>
                <p className="font-semibold text-slate-800 mt-0.5">{scheme.endDate}</p>
              </div>
            </div>
          </div>

          {/* Financials & Utilization Progress Bar */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-50 pb-2 mb-4 flex items-center space-x-2">
              <DollarSign className="h-4 w-4 text-blue-600" />
              <span>Budget Allocations & Utilization Index</span>
            </h3>
            <div className="grid gap-6 sm:grid-cols-3 text-sm mb-6">
              <div>
                <p className="text-slate-400 text-xs">Total Allocated Budget</p>
                <p className="font-black text-slate-800 text-lg mt-0.5">₹{scheme.budgetAllocation?.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-slate-400 text-xs">Remaining Balance</p>
                <p className="font-black text-slate-800 text-lg mt-0.5">₹{scheme.remainingBudget?.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-slate-400 text-xs">Total Disbursed Funds</p>
                <p className="font-black text-emerald-600 text-lg mt-0.5">₹{disbursedAmount.toLocaleString()}</p>
              </div>
            </div>

            {/* Progress Meter */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-500">Budget Utilization Rate</span>
                <span className="text-blue-600 font-bold">{utilizationPercent.toFixed(2)}%</span>
              </div>
              <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden border border-slate-50">
                <div
                  className="h-full bg-blue-600 rounded-full transition-all duration-500"
                  style={{ width: `${utilizationPercent}%` }}
                ></div>
              </div>
              <p className="text-[10px] text-slate-400 font-medium">
                Calculated dynamically from live applications ledger records.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
