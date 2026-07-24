import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Edit3, User, Mail, CreditCard, Shield, Calendar, MapPin, DollarSign, Clock } from 'lucide-react';
import axiosInstance from '../api/axiosInstance';
import LoadingSpinner from '../components/LoadingSpinner';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function BeneficiaryDetails({ isSelfProfile }) {
  const { id: paramId } = useParams();
  const id = isSelfProfile ? 1 : paramId;
  const navigate = useNavigate();
  const [beneficiary, setBeneficiary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetails = async () => {
      setLoading(true);
      try {
        const url = isSelfProfile ? '/v1/beneficiaries/me' : `/v1/beneficiaries/${id}`;
        const response = await axiosInstance.get(url);
        if (response.data && response.data.success) {
          setBeneficiary(response.data.data);
        } else {
          toast.error('Failed to load beneficiary details.');
          navigate(isSelfProfile ? '/' : '/beneficiaries');
        }
      } catch (err) {
        toast.error(err.message || 'Error occurred while loading profile.');
        navigate(isSelfProfile ? '/' : '/beneficiaries');
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
        <p className="text-center text-xs font-semibold text-slate-400 mt-4">Retrieving profile database records...</p>
      </div>
    );
  }

  if (!beneficiary) return null;

  return (
    <div className="space-y-6">
      <ToastContainer position="top-right" autoClose={3000} />
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div className="flex items-center space-x-4">
          <Link
            to={isSelfProfile ? "/" : "/beneficiaries"}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-slate-800 transition-all shadow-sm"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-800">Beneficiary Profile</h1>
            <p className="text-slate-500 mt-1">Detailed demographic, regional, and billing information records.</p>
          </div>
        </div>

        <Link
          to={`/beneficiaries/edit/${beneficiary.id}`}
          className="flex h-10 items-center justify-center space-x-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 transition-all shadow-sm"
        >
          <Edit3 className="h-4 w-4" />
          <span>Edit Profile</span>
        </Link>
      </div>

      {/* Profile Layout Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        
        {/* Left Column: Summary Card */}
        <div className="md:col-span-1 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm flex flex-col items-center justify-between text-center space-y-6">
          <div className="space-y-4 flex flex-col items-center w-full">
            {/* Avatar */}
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-50 border border-blue-100 text-blue-600 font-black text-2xl">
              {beneficiary.user ? beneficiary.user.firstName?.[0] + beneficiary.user.lastName?.[0] : 'C'}
            </div>
            
            {/* Name & Account Email */}
            <div>
              <h2 className="text-xl font-bold text-slate-800">
                {beneficiary.user
                  ? `${beneficiary.user.firstName || ''} ${beneficiary.user.lastName || ''}`
                  : 'Unlinked Citizen'}
              </h2>
              <p className="text-xs text-slate-400 font-mono mt-1">UID: {beneficiary.uniqueIdNumber}</p>
            </div>

            {/* Verification Status Badge */}
            <div className="pt-2">
              <span
                className={`inline-flex items-center space-x-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                  beneficiary.eligibilityStatus === 'VERIFIED'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                    : beneficiary.eligibilityStatus === 'PENDING'
                    ? 'bg-amber-50 text-amber-700 border border-amber-100'
                    : 'bg-rose-50 text-rose-700 border border-rose-100'
                }`}
              >
                <Shield className="h-3.5 w-3.5" />
                <span>{beneficiary.eligibilityStatus}</span>
              </span>
            </div>
          </div>

          {/* Audit Logs Metadata info */}
          <div className="w-full border-t border-slate-50 pt-4 text-left space-y-2 text-[11px] text-slate-400 font-semibold">
            <div className="flex items-center justify-between">
              <span>Created By:</span>
              <span className="text-slate-600">{beneficiary.createdBy || 'SYSTEM'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Created At:</span>
              <span className="text-slate-600">
                {beneficiary.createdAt ? new Date(beneficiary.createdAt).toLocaleDateString() : 'N/A'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Updated At:</span>
              <span className="text-slate-600">
                {beneficiary.updatedAt ? new Date(beneficiary.updatedAt).toLocaleDateString() : 'N/A'}
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Full Details */}
        <div className="md:col-span-2 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm space-y-8">
          
          {/* Linked Account parameters */}
          {beneficiary.user && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-50 pb-2 mb-4 flex items-center space-x-2">
                <User className="h-4 w-4 text-blue-600" />
                <span>Associated User Details</span>
              </h3>
              <div className="grid gap-4 sm:grid-cols-2 text-sm">
                <div>
                  <p className="text-slate-400 text-xs">Username / ID</p>
                  <p className="font-semibold text-slate-800 mt-0.5">{beneficiary.user.username}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs flex items-center space-x-1">
                    <Mail className="h-3.5 w-3.5" />
                    <span>Email Address</span>
                  </p>
                  <p className="font-semibold text-slate-800 mt-0.5">{beneficiary.user.email}</p>
                </div>
              </div>
            </div>
          )}

          {/* Personal attributes */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-50 pb-2 mb-4 flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-blue-600" />
              <span>Demographic & Social Parameters</span>
            </h3>
            <div className="grid gap-4 sm:grid-cols-3 text-sm">
              <div>
                <p className="text-slate-400 text-xs">Date of Birth</p>
                <p className="font-semibold text-slate-800 mt-0.5">{beneficiary.dateOfBirth || 'N/A'}</p>
              </div>
              <div>
                <p className="text-slate-400 text-xs">Gender</p>
                <p className="font-semibold text-slate-800 mt-0.5 capitalize">{beneficiary.gender?.toLowerCase() || 'N/A'}</p>
              </div>
              <div>
                <p className="text-slate-400 text-xs">Social Class Category</p>
                <p className="font-semibold text-slate-800 mt-0.5">{beneficiary.category || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Regional params */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-50 pb-2 mb-4 flex items-center space-x-2">
              <MapPin className="h-4 w-4 text-blue-600" />
              <span>Residential & Address Location</span>
            </h3>
            <div className="grid gap-4 sm:grid-cols-2 text-sm">
              <div>
                <p className="text-slate-400 text-xs">District / State</p>
                <p className="font-semibold text-slate-800 mt-0.5">
                  {beneficiary.district ? `${beneficiary.district}, ${beneficiary.state}` : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-slate-400 text-xs">Permanent Address</p>
                <p className="font-semibold text-slate-800 mt-0.5 leading-relaxed">{beneficiary.address}</p>
              </div>
            </div>
          </div>

          {/* Financial & billing parameters */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-50 pb-2 mb-4 flex items-center space-x-2">
              <CreditCard className="h-4 w-4 text-blue-600" />
              <span>Banking & Subsidy Direct Transfer (DBT)</span>
            </h3>
            <div className="grid gap-4 sm:grid-cols-3 text-sm">
              <div>
                <p className="text-slate-400 text-xs flex items-center space-x-1">
                  <DollarSign className="h-3.5 w-3.5" />
                  <span>Annual Income</span>
                </p>
                <p className="font-semibold text-slate-800 mt-0.5">₹{beneficiary.annualIncome?.toLocaleString() || '0'}</p>
              </div>
              <div>
                <p className="text-slate-400 text-xs">Bank Account Number</p>
                <p className="font-semibold text-slate-800 mt-0.5 font-mono">{beneficiary.bankAccountNumber}</p>
              </div>
              <div>
                <p className="text-slate-400 text-xs">IFSC Code</p>
                <p className="font-semibold text-slate-800 mt-0.5 font-mono uppercase">{beneficiary.bankIfscCode}</p>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
