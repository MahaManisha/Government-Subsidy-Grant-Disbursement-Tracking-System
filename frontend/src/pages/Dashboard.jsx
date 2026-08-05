import React, { useState, useEffect } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import {
  Users,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  IndianRupee,
  TrendingUp,
  Calendar,
  ArrowRight,
  Shield,
  Award,
  MapPin,
  Bell,
  User,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Download,
  Check,
  X,
  MessageSquare,
  AlertTriangle,
  FileCheck,
  Search,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  BookOpen,
  Eye
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import axiosInstance from '../api/axiosInstance';
import LoadingSpinner from '../components/LoadingSpinner';
import { useRole } from '../layouts/ProtectedLayout';

export default function Dashboard() {
  const auth = useRole();
  const activeRole = auth ? auth.activeRole : null;

  if (activeRole === 'ROLE_BENEFICIARY') {
    return <BeneficiaryDashboard auth={auth} />;
  }
  if (activeRole === 'ROLE_DISTRICT_OFFICER') {
    return <Navigate to="/verification/district/dashboard" replace />;
  }
  if (activeRole === 'ROLE_FIELD_OFFICER') {
    return <Navigate to="/field/dashboard" replace />;
  }
  if (activeRole === 'ROLE_FINANCE_OFFICER') {
    return <Navigate to="/finance/dashboard" replace />;
  }

  return <AdminDashboard />;
}

// =========================================================================
// BENEFICIARY DASHBOARD (Citizen Portal)
// =========================================================================
function BeneficiaryDashboard({ auth }) {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [schemes, setSchemes] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [trackedAppId, setTrackedAppId] = useState(null);

  useEffect(() => {
    const fetchCitizenData = async () => {
      try {
        // 1. Fetch beneficiary profile for current user
        const profileRes = await axiosInstance.get('/v1/beneficiaries/me');
        let currentProfile = null;
        if (profileRes.data && profileRes.data.success) {
          currentProfile = profileRes.data.data;
          setProfile(currentProfile);
        }

        // 2. Fetch schemes from database
        const schemesRes = await axiosInstance.get('/v1/schemes');
        if (schemesRes.data && schemesRes.data.success) {
          const activeSchemes = (schemesRes.data.data || []).filter(
            (s) => s.active && s.status === 'ACTIVE'
          );
          setSchemes(activeSchemes);
        }

        // 3. Fetch applications from backend database
        if (currentProfile) {
          const appsRes = await axiosInstance.get('/v1/applications');
          if (appsRes.data && appsRes.data.success) {
            const allApps = appsRes.data.data || [];
            // Filter applications by Aadhaar or ID to belong ONLY to the logged-in beneficiary
            const filtered = allApps.filter(
              (app) =>
                app.beneficiary?.uniqueIdNumber === currentProfile.uniqueIdNumber ||
                app.beneficiary?.id === currentProfile.id
            );
            setApplications(filtered);
          }
        }
      } catch (err) {
        console.error('Failed to load beneficiary dashboard:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCitizenData();
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-100 py-20 shadow-sm">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  // Calculate dynamic stats
  const availableSchemesCount = schemes.length;
  const myApplicationsCount = applications.length;
  const pendingCount = applications.filter(
    (a) => a.workflowStatus === 'SUBMITTED' || a.workflowStatus === 'UNDER_REVIEW'
  ).length;
  const approvedCount = applications.filter(
    (a) => a.workflowStatus === 'APPROVED' || a.workflowStatus === 'READY_FOR_DISBURSEMENT' || a.workflowStatus === 'DISBURSED'
  ).length;
  const rejectedCount = applications.filter((a) => a.workflowStatus === 'REJECTED').length;
  
  // Total subsidy received is sum of approvedAmount for disbursed applications
  const totalSubsidyReceived = applications
    .filter((a) => a.workflowStatus === 'DISBURSED')
    .reduce((acc, a) => acc + (Number(a.approvedAmount) || Number(a.requestedAmount) || 0), 0);

  // Generate dynamic notification lists
  const getNotifications = () => {
    const list = [];
    
    // Alert for newly active schemes
    if (schemes.length > 0) {
      const topScheme = schemes[0];
      list.push({
        id: `scheme-${topScheme.id}`,
        title: 'New Scheme Available',
        message: `${topScheme.name} is now open. Submit your application before ${new Date(topScheme.endDate).toLocaleDateString()}.`,
        type: 'scheme',
        date: topScheme.createdAt || new Date().toISOString()
      });
    }

    // Application state changes
    applications.forEach((app) => {
      const name = app.scheme?.name || 'Subsidy Scheme';
      if (app.workflowStatus === 'SUBMITTED') {
        list.push({
          id: `sub-${app.id}`,
          title: 'Application Submitted',
          message: `Your application (${app.applicationNumber}) for ${name} was submitted successfully.`,
          type: 'success',
          date: app.submittedDate
        });
      } else if (app.currentStage === 'FIELD_VERIFICATION') {
        list.push({
          id: `field-${app.id}`,
          title: 'Verification Scheduled',
          message: `Field verification audit has been scheduled for application ${app.applicationNumber}.`,
          type: 'warning',
          date: app.lastModifiedDate || app.submittedDate
        });
      } else if (app.workflowStatus === 'APPROVED') {
        list.push({
          id: `app-${app.id}`,
          title: 'Application Approved',
          message: `Your application (${app.applicationNumber}) for ${name} has been approved.`,
          type: 'success',
          date: app.lastModifiedDate
        });
      } else if (app.workflowStatus === 'REJECTED') {
        list.push({
          id: `rej-${app.id}`,
          title: 'Application Rejected',
          message: `Your application (${app.applicationNumber}) was rejected: ${app.rejectionReason || 'Criteria mismatch.'}`,
          type: 'error',
          date: app.lastModifiedDate
        });
      } else if (app.workflowStatus === 'DISBURSED') {
        list.push({
          id: `dis-${app.id}`,
          title: 'Funds Released',
          message: `Direct Benefit Transfer (DBT) of ₹${(app.approvedAmount || app.requestedAmount).toLocaleString()} processed for ${app.applicationNumber}.`,
          type: 'success',
          date: app.lastModifiedDate
        });
      }
    });

    return list.slice(0, 5); // display up to 5
  };

  const notificationList = getNotifications();

  // Helper to map scheme properties dynamically
  const getSchemeMetadata = (s) => {
    const code = s.code?.toUpperCase() || '';
    const name = s.name?.toLowerCase() || '';

    if (code.includes('PMFBY') || name.includes('kisan') || name.includes('crop') || name.includes('farm') || name.includes('agriculture')) {
      return {
        category: 'Agriculture & Farming',
        eligibility: 'Resident farmers, land ownership papers verified, annual household income below ₹3 Lakhs.'
      };
    } else if (code.includes('SOLAR') || name.includes('solar') || name.includes('power') || name.includes('energy')) {
      return {
        category: 'Renewable Energy',
        eligibility: 'All domestic households installing certified solar panel systems.'
      };
    } else if (code.includes('PAHAL') || name.includes('lpg') || name.includes('gas') || name.includes('subsidy')) {
      return {
        category: 'Social Welfare',
        eligibility: 'Aadhaar linked domestic gas account holder without commercial links.'
      };
    } else if (code.includes('HOUSING') || name.includes('housing') || name.includes('awas')) {
      return {
        category: 'Affordable Housing',
        eligibility: 'Citizen families without a permanent concrete/pukka house anywhere in India.'
      };
    }
    return {
      category: 'General Public Welfare',
      eligibility: 'Verified resident citizens meeting specific scheme-wise criteria.'
    };
  };

  // Helper to map backend status to user-friendly Citizen Portal workflow status
  const getBeneficiaryStatusLabel = (app) => {
    if (app.workflowStatus === 'REJECTED' || app.workflowStatus === 'FIELD_REJECTED' || app.workflowStatus === 'DISTRICT_REJECTED' || app.workflowStatus === 'FINANCE_REJECTED' || app.workflowStatus === 'ELIGIBILITY_REJECTED') {
      return 'Rejected';
    }
    if (app.workflowStatus === 'RE_VERIFICATION_REQUESTED' || app.workflowStatus === 'CORRECTION_REQUIRED' || app.workflowStatus === 'FIELD_REVERIFICATION_REQUIRED' || app.workflowStatus === 'DOCUMENTS_REQUESTED') {
      return 'Returned for Correction';
    }
    if (app.workflowStatus === 'DISBURSED') {
      return 'Funds Released';
    }
    if (app.workflowStatus === 'APPROVED' || app.workflowStatus === 'PAYMENT_APPROVED' || app.currentStage === 'COMPLETED') {
      return 'Payment Approved';
    }
    if (app.currentStage === 'FINANCE_REVIEW' || app.currentStage === 'FINANCE_REVIEW_PENDING') {
      return 'Pending Finance Review';
    }
    if (app.workflowStatus === 'DISTRICT_APPROVED') {
      return 'District Approved';
    }
    if (app.currentStage === 'DISTRICT_REVIEW' || app.currentStage === 'DISTRICT_REVIEW_PENDING') {
      return 'Pending District Review';
    }
    if (app.workflowStatus === 'FIELD_VERIFIED') {
      return 'Field Verified';
    }
    if (app.currentStage === 'FIELD_VERIFICATION') {
      return 'Pending Field Verification';
    }
    if (app.workflowStatus === 'ELIGIBILITY_VERIFIED') {
      if (app.currentStage === 'FIELD_VERIFICATION_PENDING') {
        return 'Waiting for Field Officer';
      }
      return 'Eligibility Verified';
    }
    return 'Submitted';
  };

  // Helper to resolve active step in stepper tracker
  const getActiveStep = (app) => {
    if (app.workflowStatus === 'DISBURSED') return 6;
    if (app.workflowStatus === 'READY_FOR_DISBURSEMENT' || app.workflowStatus === 'FINANCE_APPROVED' || app.workflowStatus === 'APPROVED' || app.workflowStatus === 'PAYMENT_APPROVED' || app.currentStage === 'COMPLETED') return 6;
    if (app.currentStage === 'FINANCE_REVIEW' || app.currentStage === 'FINANCE_REVIEW_PENDING') return 5;
    if (app.currentStage === 'DISTRICT_REVIEW' || app.currentStage === 'DISTRICT_REVIEW_PENDING' || app.workflowStatus === 'DISTRICT_APPROVED') return 4;
    if (app.currentStage === 'FIELD_VERIFICATION' || app.workflowStatus === 'FIELD_VERIFIED') return 3;
    if (app.currentStage === 'FIELD_VERIFICATION_PENDING') return 2;
    if (app.workflowStatus === 'ELIGIBILITY_VERIFIED') return 1;
    return 0;
  };

  const trackingSteps = [
    { label: 'Submitted', desc: 'Application filed' },
    { label: 'Eligibility Verified', desc: 'Auto-scoring completed' },
    { label: 'Waiting for Officer', desc: 'Field officer auto-assigned' },
    { label: 'Field Verification', desc: 'Site audit and reports' },
    { label: 'District Approval', desc: 'District board review' },
    { label: 'Finance Approval', desc: 'Fund release approval' },
    { label: 'Disbursed', desc: 'DBT Direct Transfer' }
  ];

  return (
    <div className="space-y-8">
      {/* Dynamic greeting header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 rounded-2xl p-6 md:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 h-64 w-64 rounded-full bg-white opacity-5"></div>
        <div className="z-10 space-y-2">
          <h1 className="text-2xl font-black md:text-3xl tracking-tight">
            Welcome, {profile?.user ? `${profile.user.firstName} ${profile.user.lastName}` : auth.user?.username || 'Citizen'}
          </h1>
          <p className="text-blue-100 text-sm md:text-base font-semibold max-w-xl">
            Aadhaar-linked secure direct benefit transfer (DBT) portal. Track your applications, eligibility, and subsidies.
          </p>
          {profile && (
            <div className="flex flex-wrap gap-x-6 gap-y-2 pt-2 text-xs font-semibold text-blue-200">
              <span className="flex items-center space-x-1">
                <Shield className="h-3.5 w-3.5" />
                <span>UID (Aadhaar): {profile.uniqueIdNumber}</span>
              </span>
              <span className="flex items-center space-x-1">
                <MapPin className="h-3.5 w-3.5" />
                <span>District: {profile.district || 'N/A'}</span>
              </span>
              <span className="flex items-center space-x-1">
                <Award className="h-3.5 w-3.5" />
                <span>Category: {profile.category}</span>
              </span>
            </div>
          )}
        </div>
        <div className="z-10 flex flex-col items-start md:items-end justify-center space-y-2">
          <span className="text-xs uppercase tracking-wider text-blue-200 font-bold">Verification Status</span>
          <span className={`inline-flex items-center space-x-1.5 rounded-full px-4 py-1.5 text-xs font-black shadow-inner ${
            profile?.eligibilityStatus === 'VERIFIED'
              ? 'bg-emerald-500 text-white'
              : profile?.eligibilityStatus === 'PENDING'
              ? 'bg-amber-500 text-white'
              : 'bg-rose-500 text-white'
          }`}>
            <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
            <span>{profile?.eligibilityStatus || 'PENDING'} PROFILE</span>
          </span>
        </div>
      </div>

      {/* Summary Cards Grid */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {/* Available Schemes */}
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-all hover:shadow-md hover:scale-[1.01]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Available Schemes</p>
              <h3 className="mt-2 text-2xl font-black text-slate-800">{availableSchemesCount}</h3>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-center space-x-1 text-xs font-semibold text-slate-500">
            <span className="text-blue-600">Active Schemes</span>
            <span>currently open</span>
          </div>
        </div>

        {/* My Applications */}
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-all hover:shadow-md hover:scale-[1.01]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">My Applications</p>
              <h3 className="mt-2 text-2xl font-black text-slate-800">{myApplicationsCount}</h3>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <FileText className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-center space-x-1 text-xs font-semibold text-slate-500">
            <span className="text-indigo-600">Total submitted</span>
            <span>by you</span>
          </div>
        </div>

        {/* Pending Applications */}
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-all hover:shadow-md hover:scale-[1.01]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Pending Applications</p>
              <h3 className="mt-2 text-2xl font-black text-slate-800">{pendingCount}</h3>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <Clock className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-center space-x-1 text-xs font-semibold text-slate-500">
            <span className="text-amber-600">Awaiting</span>
            <span>officer verification</span>
          </div>
        </div>

        {/* Approved Applications */}
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-all hover:shadow-md hover:scale-[1.01]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Approved Applications</p>
              <h3 className="mt-2 text-2xl font-black text-slate-800">{approvedCount}</h3>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-center space-x-1 text-xs font-semibold text-slate-500">
            <span className="text-emerald-600">Approved</span>
            <span>milestones verified</span>
          </div>
        </div>

        {/* Rejected Applications */}
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-all hover:shadow-md hover:scale-[1.01]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Rejected Applications</p>
              <h3 className="mt-2 text-2xl font-black text-slate-800">{rejectedCount}</h3>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
              <XCircle className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-center space-x-1 text-xs font-semibold text-slate-500">
            <span className="text-rose-600">Declined</span>
            <span>due to criteria mismatched</span>
          </div>
        </div>

        {/* Total Subsidy Received */}
        <div className="rounded-2xl border border-slate-100 bg-gradient-to-br from-emerald-500 to-teal-600 p-5 text-white shadow-sm transition-all hover:shadow-md hover:scale-[1.01]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-100">Total Subsidy Received</p>
              <h3 className="mt-2 text-2xl font-black">₹{totalSubsidyReceived.toLocaleString()}</h3>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20 text-white">
              <IndianRupee className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-center space-x-1 text-xs font-semibold text-emerald-100">
            <span>Directly Transferred (DBT)</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Left column (Apps & Schemes), Right column (Actions & Notifications) */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left 2 Columns */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Quick Actions Panel */}
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">Quick Actions</h3>
            <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
              <Link
                to="/applications/new"
                className="flex flex-col items-center justify-center p-4 rounded-xl border border-slate-100 hover:border-blue-200 bg-slate-50/50 hover:bg-blue-50/20 text-center transition-all group"
              >
                <div className="h-10 w-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
                  <FileText className="h-5 w-5" />
                </div>
                <span className="text-xs font-bold text-slate-700">Apply for Scheme</span>
              </Link>

              <Link
                to="/applications/my-applications"
                className="flex flex-col items-center justify-center p-4 rounded-xl border border-slate-100 hover:border-indigo-200 bg-slate-50/50 hover:bg-indigo-50/20 text-center transition-all group"
              >
                <div className="h-10 w-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
                  <Users className="h-5 w-5" />
                </div>
                <span className="text-xs font-bold text-slate-700">My Applications</span>
              </Link>

              <Link
                to="/eligibility"
                className="flex flex-col items-center justify-center p-4 rounded-xl border border-slate-100 hover:border-amber-200 bg-slate-50/50 hover:bg-amber-50/20 text-center transition-all group"
              >
                <div className="h-10 w-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
                  <Award className="h-5 w-5" />
                </div>
                <span className="text-xs font-bold text-slate-700">Check Eligibility</span>
              </Link>

              <Link
                to="/beneficiaries/my-profile"
                className="flex flex-col items-center justify-center p-4 rounded-xl border border-slate-100 hover:border-emerald-200 bg-slate-50/50 hover:bg-emerald-50/20 text-center transition-all group"
              >
                <div className="h-10 w-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
                  <User className="h-5 w-5" />
                </div>
                <span className="text-xs font-bold text-slate-700">Update Profile</span>
              </Link>
            </div>
          </div>

          {/* My Recent Applications Table */}
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">My Recent Applications</h3>
              <Link to="/applications/my-applications" className="text-xs font-bold text-blue-600 hover:underline flex items-center space-x-1">
                <span>View All</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            
            {applications.length === 0 ? (
              <div className="py-8 text-center text-slate-400">
                <AlertCircle className="h-10 w-10 mx-auto text-slate-300 mb-2" />
                <p className="text-sm font-medium">No application records found.</p>
                <Link to="/applications/new" className="text-xs text-blue-600 font-bold hover:underline mt-1 inline-block">Apply for a scheme to get started</Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-sm text-slate-500">
                  <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100">
                    <tr>
                      <th className="px-4 py-3">Scheme Name</th>
                      <th className="px-4 py-3">Application Date</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Requested</th>
                      <th className="px-4 py-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {applications.map((app) => (
                      <React.Fragment key={app.id}>
                        <tr className="hover:bg-slate-50/50 transition-all">
                          <td className="px-4 py-3.5 font-semibold text-slate-800">
                            {app.scheme?.name ? app.scheme.name.split(' (')[0] : 'N/A'}
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">{app.applicationNumber}</div>
                          </td>
                          <td className="px-4 py-3.5 text-xs text-slate-500">
                            {app.submittedDate ? new Date(app.submittedDate).toLocaleDateString() : 'N/A'}
                          </td>
                          <td className="px-4 py-3.5">
                            <span className={`inline-flex items-center space-x-1.5 rounded-full px-2 py-0.5 text-xs font-bold border ${
                              app.workflowStatus === 'DISBURSED'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                : ['APPROVED', 'PAYMENT_APPROVED'].includes(app.workflowStatus)
                                ? 'bg-blue-50 text-blue-700 border-blue-100'
                                : ['REJECTED', 'FIELD_REJECTED', 'DISTRICT_REJECTED', 'FINANCE_REJECTED'].includes(app.workflowStatus)
                                ? 'bg-rose-50 text-rose-700 border-rose-100'
                                : 'bg-amber-50 text-amber-700 border-amber-100'
                            }`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${
                                app.workflowStatus === 'DISBURSED'
                                  ? 'bg-emerald-500'
                                  : ['APPROVED', 'PAYMENT_APPROVED'].includes(app.workflowStatus)
                                  ? 'bg-blue-500'
                                  : ['REJECTED', 'FIELD_REJECTED', 'DISTRICT_REJECTED', 'FINANCE_REJECTED'].includes(app.workflowStatus)
                                  ? 'bg-rose-500'
                                  : 'bg-amber-500'
                              }`} />
                              <span>{getBeneficiaryStatusLabel(app)}</span>
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-right font-bold text-slate-700">
                            ₹{(app.requestedAmount || 0).toLocaleString()}
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <button
                              onClick={() => setTrackedAppId(trackedAppId === app.id ? null : app.id)}
                              className="inline-flex items-center space-x-1 text-xs font-bold text-blue-600 hover:text-blue-800 focus:outline-none"
                            >
                              <span>{trackedAppId === app.id ? 'Hide' : 'Track'}</span>
                              {trackedAppId === app.id ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                            </button>
                          </td>
                        </tr>
                        {/* Expanded tracker stepper panel */}
                        {trackedAppId === app.id && (
                          <tr>
                            <td colSpan="5" className="bg-slate-50/50 p-6 border-t border-b border-slate-100">
                              <div className="space-y-4">
                                <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                                  <span>APPLICATION PIPELINE TRACKER</span>
                                  <span>Current Stage: <strong className="text-blue-600 capitalize">
                                    {app.currentStage === 'COMPLETED' ? 'Completed' : 
                                     (app.workflowStatus === 'READY_FOR_DISBURSEMENT' || app.workflowStatus === 'FINANCE_APPROVED') ? 'Pending Disbursement' :
                                     app.workflowStatus === 'DISTRICT_APPROVED' ? 'Pending Finance Review' :
                                     app.workflowStatus === 'FIELD_VERIFIED' ? 'Pending District Review' :
                                     app.currentStage?.toLowerCase().replace(/_/g, ' ')}
                                  </strong></span>
                                </div>
                                
                                {app.workflowStatus === 'REJECTED' || app.workflowStatus === 'ELIGIBILITY_REJECTED' ? (
                                  <div className="bg-rose-50 border border-rose-100 rounded-xl p-4 flex items-start space-x-3 text-rose-800">
                                    <AlertCircle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
                                    <div>
                                      <h4 className="text-sm font-bold">Application Ineligible / Rejected</h4>
                                      <p className="text-xs text-rose-600 mt-0.5">
                                        This application did not pass verification checks. Reason: {app.rejectionReason || 'Details are listed under compliance remarks.'}
                                      </p>
                                    </div>
                                  </div>
                                ) : (
                                  /* Horizontal Stepper */
                                  <div className="relative pt-3 pb-2 hidden md:block">
                                    {/* Line connecting circles */}
                                    <div className="absolute top-[28px] left-[5%] right-[5%] h-1 bg-slate-200 rounded">
                                      <div
                                        className="h-full bg-blue-600 transition-all duration-500"
                                        style={{ width: `${(getActiveStep(app) / 5) * 100}%` }}
                                      />
                                    </div>
                                    
                                    <div className="relative flex justify-between">
                                      {trackingSteps.map((step, idx) => {
                                        const isActive = idx <= getActiveStep(app);
                                        return (
                                          <div key={idx} className="flex flex-col items-center w-[16%] text-center">
                                            <div className={`h-8 w-8 rounded-full border-2 flex items-center justify-center font-bold text-sm z-10 transition-all duration-300 ${
                                              isActive 
                                                ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-200'
                                                : 'bg-white border-slate-300 text-slate-400'
                                            }`}>
                                              {idx + 1}
                                            </div>
                                            <span className="text-[11px] font-bold text-slate-700 mt-2 block">{step.label}</span>
                                            <span className="text-[9px] text-slate-400 mt-0.5 leading-tight max-w-[85px] block mx-auto">{step.desc}</span>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                                
                                {/* Vertical Stepper for Mobile Screens */}
                                {app.workflowStatus !== 'REJECTED' && app.workflowStatus !== 'ELIGIBILITY_REJECTED' && (
                                  <div className="space-y-4 md:hidden block">
                                    {trackingSteps.map((step, idx) => {
                                      const isActive = idx <= getActiveStep(app);
                                      return (
                                        <div key={idx} className="flex items-start space-x-3">
                                          <div className={`h-6 w-6 rounded-full border flex items-center justify-center text-xs font-bold ${
                                            isActive
                                              ? 'bg-blue-600 border-blue-600 text-white'
                                              : 'bg-white border-slate-300 text-slate-400'
                                          }`}>
                                            {idx + 1}
                                          </div>
                                          <div>
                                            <span className={`text-xs font-bold block ${isActive ? 'text-slate-800' : 'text-slate-400'}`}>
                                              {step.label}
                                            </span>
                                            <span className="text-[10px] text-slate-400">{step.desc}</span>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}

                                <div className="flex justify-end pt-2">
                                  <Link
                                    to={`/applications/${app.id}`}
                                    className="inline-flex items-center space-x-1 text-xs font-semibold bg-white border border-slate-200 text-slate-600 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-all shadow-sm"
                                  >
                                    <Eye className="h-3.5 w-3.5" />
                                    <span>View Complete Ledger Detail</span>
                                  </Link>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Active Schemes explorer */}
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">Available Schemes</h3>
            
            {schemes.length === 0 ? (
              <div className="py-8 text-center text-slate-400">
                <AlertCircle className="h-10 w-10 mx-auto text-slate-300 mb-2" />
                <p className="text-sm font-medium">No active schemes available currently.</p>
              </div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2">
                {schemes.map((scheme) => {
                  const meta = getSchemeMetadata(scheme);
                  return (
                    <div key={scheme.id} className="border border-slate-100 rounded-xl p-5 hover:shadow-md transition-all flex flex-col justify-between space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-600">
                            {meta.category}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono uppercase">{scheme.code}</span>
                        </div>
                        <h4 className="text-base font-bold text-slate-800 leading-snug">{scheme.name}</h4>
                        <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed">{scheme.description}</p>
                      </div>

                      <div className="pt-2 border-t border-slate-50 space-y-3">
                        <div className="text-[11px] space-y-1.5">
                          <div className="flex justify-between text-slate-400">
                            <span>Deadline:</span>
                            <span className="font-semibold text-slate-600 flex items-center space-x-1">
                              <Calendar className="h-3 w-3 inline text-slate-400 mr-0.5" />
                              {scheme.endDate ? new Date(scheme.endDate).toLocaleDateString() : 'N/A'}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 block mb-0.5">Eligibility criteria summary:</span>
                            <span className="font-semibold text-slate-600 block leading-tight">{meta.eligibility}</span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 pt-2">
                          <Link
                            to={`/applications/new?schemeId=${scheme.id}`}
                            className="flex-1 h-8 rounded-lg bg-blue-600 text-xs font-bold text-white flex items-center justify-center hover:bg-blue-700 transition-all"
                          >
                            Apply Now
                          </Link>
                          <Link
                            to={`/schemes/${scheme.id}`}
                            className="h-8 border border-slate-200 text-slate-600 px-3 rounded-lg text-xs font-bold flex items-center justify-center hover:bg-slate-50 transition-all"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* Right Column: Notifications & User Card */}
        <div className="space-y-6">
          {/* Notifications Panel */}
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-2">
                <Bell className="h-4.5 w-4.5 text-blue-600" />
                <span>Alerts & Notifications</span>
              </h3>
              <span className="text-[10px] font-bold bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
                {notificationList.length} Active
              </span>
            </div>

            <div className="divide-y divide-slate-100 max-h-[460px] overflow-y-auto pr-1">
              {notificationList.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  All caught up! No recent alerts.
                </div>
              ) : (
                notificationList.map((notif) => (
                  <div key={notif.id} className="py-3.5 first:pt-0 last:pb-0 space-y-1">
                    <div className="flex justify-between items-center">
                      <h4 className="text-xs font-black text-slate-800">{notif.title}</h4>
                      <span className="text-[9px] text-slate-400">
                        {notif.date ? new Date(notif.date).toLocaleDateString() : ''}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">{notif.message}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick FAQ / Citizen Info */}
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-6 space-y-4">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Citizen Guidelines</h4>
            <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
              <div className="flex items-start space-x-2">
                <span className="h-5 w-5 rounded-full bg-blue-100 text-blue-600 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">1</span>
                <p>Ensure your Bank Account number is correctly linked with your Aadhaar for hassle-free DBT releases.</p>
              </div>
              <div className="flex items-start space-x-2">
                <span className="h-5 w-5 rounded-full bg-blue-100 text-blue-600 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">2</span>
                <p>An application goes through dynamic automatic scoring before field verifications are assigned.</p>
              </div>
              <div className="flex items-start space-x-2">
                <span className="h-5 w-5 rounded-full bg-blue-100 text-blue-600 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">3</span>
                <p>Keep physical copies of your income, address, and category certificates ready for the site officer audit.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// =========================================================================
// ORIGINAL ADMINISTRATOR DASHBOARD
// =========================================================================
function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [adminTab, setAdminTab] = useState('analytics');
  const [adminApps, setAdminApps] = useState([]);
  const [adminAppsLoading, setAdminAppsLoading] = useState(false);

  const fetchDashboardData = async () => {
    try {
      const response = await axiosInstance.get('/v1/analytics/report');
      if (response.data && response.data.success) {
        setData(response.data.data);
      }
    } catch (err) {
      console.error('Failed to load dashboard metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    if (adminTab === 'eligibility') {
      const fetchAdminApps = async () => {
        setAdminAppsLoading(true);
        try {
          const res = await axiosInstance.get('/v1/applications');
          if (res.data && res.data.success) {
            setAdminApps(res.data.data || []);
          }
        } catch (err) {
          console.error(err);
        } finally {
          setAdminAppsLoading(false);
        }
      };
      fetchAdminApps();
    }
  }, [adminTab]);

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-100 py-20 shadow-sm">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  // Calculate totals and metrics
  const totalBeneficiaries = data?.totalBeneficiaries || 0;
  const totalFundsReleased = data?.totalFundsReleased || 0;
  const pendingActions = data?.pendingVerificationCount || 0;

  const schemeAppSums = data?.applicationsByScheme
    ? Object.values(data.applicationsByScheme).reduce((acc, val) => acc + Number(val), 0)
    : 0;
  const totalApplications = schemeAppSums || 0;

  const approvalRate = data?.approvalPercentage || 0;
  const rejectionRate = data?.rejectionPercentage || 0;

  const approvedCount = Math.round((approvalRate / 100) * totalApplications);
  const rejectedCount = Math.round((rejectionRate / 100) * totalApplications);

  const cards = [
    {
      label: 'Total Beneficiaries',
      value: totalBeneficiaries.toLocaleString(),
      icon: Users,
      change: 'Active Citizens',
      color: 'bg-blue-600',
      text: 'text-blue-600'
    },
    {
      label: 'Total Applications',
      value: totalApplications.toLocaleString(),
      icon: FileText,
      change: 'Submissions count',
      color: 'bg-indigo-600',
      text: 'text-indigo-600'
    },
    {
      label: 'Approved Applications',
      value: approvedCount.toLocaleString(),
      icon: CheckCircle,
      change: `${approvalRate.toFixed(1)}% approval rate`,
      color: 'bg-emerald-600',
      text: 'text-emerald-600'
    },
    {
      label: 'Rejected Applications',
      value: rejectedCount.toLocaleString(),
      icon: XCircle,
      change: `${rejectionRate.toFixed(1)}% rejection rate`,
      color: 'bg-rose-600',
      text: 'text-rose-600'
    },
    {
      label: 'Pending Verification',
      value: pendingActions.toLocaleString(),
      icon: Clock,
      change: 'Awaiting officer review',
      color: 'bg-amber-600',
      text: 'text-amber-600'
    },
    {
      label: 'Total Funds Released',
      value: `₹${totalFundsReleased.toLocaleString()}`,
      icon: IndianRupee,
      change: 'Milestones disbursed',
      color: 'bg-purple-600',
      text: 'text-purple-600'
    }
  ];

  const schemePopularity =
    data?.applicationsByScheme && Object.keys(data.applicationsByScheme).length > 0
      ? Object.entries(data.applicationsByScheme).map(([name, count]) => ({
          name: name.split(' ')[0],
          count: Number(count)
        }))
      : [];

  const disbursementTrend = totalFundsReleased > 0 ? [
    { month: 'Current Period', released: totalFundsReleased, target: totalFundsReleased }
  ] : [];

  return (
    <div className="space-y-8">
      {/* Title & Tabs */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-800 md:text-3xl">
            Government Subsidy Tracker Dashboard
          </h1>
          <p className="text-slate-500 mt-1">
            Real-time status tracking of all government subsidy schemes and milestones disbursements.
          </p>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setAdminTab('analytics')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${adminTab === 'analytics' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-850'}`}
          >
            General Analytics
          </button>
          <button
            onClick={() => setAdminTab('eligibility')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${adminTab === 'eligibility' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-850'}`}
          >
            Eligibility Management
          </button>
        </div>
      </div>

      {adminTab === 'eligibility' ? (
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-slate-850 uppercase tracking-wider">Live Eligibility Verification Ledger</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Audit scoring result outcomes and criteria validation details across all citizen submissions.</p>
            </div>
            <button
              onClick={async () => {
                setAdminAppsLoading(true);
                try {
                  const res = await axiosInstance.get('/v1/applications');
                  if (res.data && res.data.success) {
                    setAdminApps(res.data.data || []);
                  }
                } catch (err) {
                  console.error(err);
                } finally {
                  setAdminAppsLoading(false);
                }
              }}
              className="inline-flex items-center space-x-1.5 text-xs font-bold bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-lg hover:bg-slate-100 transition-all text-slate-650"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Refresh Ledger</span>
            </button>
          </div>

          {adminAppsLoading ? (
            <div className="py-20 text-center">
              <LoadingSpinner size="large" />
              <p className="text-xs text-slate-400 mt-2 font-semibold">Updating live registry...</p>
            </div>
          ) : adminApps.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-xs border border-dashed border-slate-100 rounded-xl">
              <AlertCircle className="h-8 w-8 text-slate-300 mx-auto mb-2" />
              <p className="font-bold">No applications registered in system catalog.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs text-slate-500">
                <thead className="bg-slate-50 font-bold uppercase tracking-wider text-slate-500 border-b border-slate-150">
                  <tr>
                    <th className="px-4 py-3">Application ID</th>
                    <th className="px-4 py-3">Beneficiary</th>
                    <th className="px-4 py-3">Scheme Name</th>
                    <th className="px-4 py-3 text-center">Result</th>
                    <th className="px-4 py-3 text-center">Score</th>
                    <th className="px-4 py-3">Passed/Failed Rules Details</th>
                    <th className="px-4 py-3">Workflow Stage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold">
                  {adminApps.map((app) => {
                    const name = app.beneficiary
                      ? `${app.beneficiary.firstName || ''} ${app.beneficiary.lastName || ''}`.trim() || app.beneficiary.name
                      : 'Unlinked';
                    
                    const isEligible = app.eligibilityResult === 'ELIGIBLE';
                    const isRejected = app.eligibilityResult === 'NOT_ELIGIBLE' || app.eligibilityResult === 'REJECTED';
                    
                    return (
                      <tr key={app.id} className="hover:bg-slate-50/40 transition-all">
                        <td className="px-4 py-3.5 font-bold text-indigo-650 font-mono">{app.applicationNumber}</td>
                        <td className="px-4 py-3.5 text-slate-800">
                          <div>{name}</div>
                          <div className="text-[10px] text-slate-400 font-mono font-medium">UID: {app.beneficiary?.uniqueIdNumber}</div>
                        </td>
                        <td className="px-4 py-3.5 text-slate-650">
                          <div>{app.scheme?.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono font-medium">{app.scheme?.code}</div>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[9px] font-black border uppercase tracking-wider ${
                            isEligible
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-150'
                              : isRejected
                              ? 'bg-rose-50 text-rose-700 border-rose-150'
                              : 'bg-amber-50 text-amber-700 border-amber-150'
                          }`}>
                            {app.eligibilityResult || 'PENDING'}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-center text-slate-800 font-bold text-sm">
                          {app.eligibilityScore !== null ? `${app.eligibilityScore}/100` : 'N/A'}
                        </td>
                        <td className="px-4 py-3.5 text-slate-600 max-w-[280px]">
                          {isEligible ? (
                            <span className="text-emerald-600 flex items-center"><Check className="h-3.5 w-3.5 mr-1 text-emerald-500 shrink-0" /> All criteria satisfied. Recommended for audit.</span>
                          ) : isRejected ? (
                            <span className="text-rose-650 block text-[11px] leading-snug">{app.rejectionReason}</span>
                          ) : (
                            <span className="text-slate-400 italic">Score verification pending</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="rounded bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-650 uppercase">
                            {app.currentStage?.replace(/_/g, ' ')}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Cards Grid */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card, i) => (
          <div
            key={i}
            className="relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition-all hover:shadow-md hover:scale-[1.01]"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  {card.label}
                </p>
                <h3 className="mt-2 text-2xl font-black text-slate-800">{card.value}</h3>
              </div>
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-xl ${card.color} text-white`}
              >
                <card.icon className="h-6 w-6" />
              </div>
            </div>
            <div className="mt-4 flex items-center space-x-1 text-xs font-semibold text-slate-500">
              <TrendingUp className={`h-3.5 w-3.5 ${card.text}`} />
              <span>{card.change}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Trend Area Chart */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
              Funds Disbursed Trend (in ₹)
            </h4>
            <span className="rounded-full bg-blue-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-blue-600">
              Monthly
            </span>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={disbursementTrend} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorReleased" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} />
                <Tooltip formatter={(value) => `₹${value.toLocaleString()}`} />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="released"
                  stroke="#2563eb"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorReleased)"
                  name="Amount Released"
                />
                <Area
                  type="monotone"
                  dataKey="target"
                  stroke="#94a3b8"
                  strokeWidth={1}
                  strokeDasharray="5 5"
                  fill="none"
                  name="Allocated Budget"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Scheme Popularity Bar Chart */}
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">
            Top Schemes by Submissions
          </h4>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={schemePopularity}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#4f46e5" radius={[0, 4, 4, 0]} name="Applications Count" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      </>
      )}
    </div>
  );
}

export function DistrictOfficerDashboard({ auth }) {
  const [applications, setApplications] = useState([]);
  const [officers, setOfficers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedApp, setSelectedApp] = useState(null);
  const [history, setHistory] = useState([]);
  const [verification, setVerification] = useState(null);
  
  // Workspace mode: 'review' (can approve/reject/correct) or 'view' (read-only details check)
  const [reviewMode, setReviewMode] = useState('review');
  const [activeDoc, setActiveDoc] = useState(null);

  // Remarks and Action controls
  const [reviewRemarks, setReviewRemarks] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [showCorrectConfirm, setShowCorrectConfirm] = useState(false);
  const [showDocsConfirm, setShowDocsConfirm] = useState(false);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDistrict, setFilterDistrict] = useState('');
  const [filterScheme, setFilterScheme] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterDate, setFilterDate] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const loadData = async () => {
    setLoading(true);
    try {
      const appsRes = await axiosInstance.get('/v1/applications');
      if (appsRes.data && appsRes.data.success) {
        setApplications(appsRes.data.data || []);
      }
      const usersRes = await axiosInstance.get('/v1/users');
      if (usersRes.data && usersRes.data.success) {
        setOfficers(usersRes.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const actingOfficerId = officers.find(o => o.username === auth?.user?.username)?.id || 10;
  const actingOfficerName = officers.find(o => o.username === auth?.user?.username)
    ? `${officers.find(o => o.username === auth?.user?.username).firstName} ${officers.find(o => o.username === auth?.user?.username).lastName}`
    : 'District Officer';

  const fetchVerificationState = async (appId) => {
    if (!appId) {
      setVerification(null);
      setHistory([]);
      return;
    }
    setHistoryLoading(true);
    try {
      const stateRes = await axiosInstance.get(`/v1/applications/${appId}/verification`);
      if (stateRes.data && stateRes.data.success) {
        setVerification(stateRes.data.data);
      }
      const historyRes = await axiosInstance.get(`/v1/applications/${appId}/verification/history`);
      if (historyRes.data && historyRes.data.success) {
        const sorted = (historyRes.data.data || []).sort(
          (a, b) => new Date(a.actionDate || a.createdAt) - new Date(b.actionDate || b.createdAt)
        );
        setHistory(sorted);
      } else {
        setHistory([]);
      }
    } catch (err) {
      setVerification(null);
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleReviewClick = (app, mode) => {
    setReviewMode(mode);
    setSelectedApp(app);
    setReviewRemarks('');
    setRejectionReason('');
    const docs = getSimulatedDocuments(app);
    setActiveDoc(docs[0]);
    fetchVerificationState(app.id);
  };

  // Updates status in PostgreSQL backend via API AND synchronizes frontend local storage ledger
  const submitAction = async (actionType) => {
    if (!reviewRemarks.trim()) {
      alert('Remarks are mandatory before submitting any decision.');
      return;
    }
    setSubmitting(true);
    
    // 1. Resolve backend action payload mapping
    let backendAction = 'APPROVE';
    let localStatus = 'DISTRICT_APPROVED';
    let localStage = 'FINANCE_REVIEW';

    if (actionType === 'REJECT') {
      backendAction = 'REJECT';
      localStatus = 'DISTRICT_REJECTED';
      localStage = 'DISTRICT_REVIEW';
    } else if (actionType === 'REQUEST_REVERIFICATION') {
      backendAction = 'REQUEST_REVERIFICATION';
      localStatus = 'CORRECTION_REQUIRED';
      localStage = 'FIELD_VERIFICATION';
    } else if (actionType === 'REQUEST_ADDITIONAL_DOCS') {
      backendAction = 'REQUEST_REVERIFICATION';
      localStatus = 'CORRECTION_REQUIRED';
      localStage = 'FIELD_VERIFICATION';
    }

    const payload = {
      officerId: Number(actingOfficerId),
      action: backendAction,
      remarks: reviewRemarks,
      rejectionReason: actionType === 'REJECT' ? (rejectionReason || reviewRemarks) : null
    };

    try {
      // Post workflow action to backend database
      const response = await axiosInstance.post(
        `/v1/applications/${selectedApp.id}/verification/district-review`,
        payload
      );

      if (response.data && response.data.success) {
        // Sync state with frontend local storage ledger for unified beneficiary tracking
        const ledgerStr = localStorage.getItem('applications_ledger');
        if (ledgerStr) {
          const ledger = JSON.parse(ledgerStr);
          const updated = ledger.map(a => {
            if (a.id === selectedApp.id || a.applicationNumber === selectedApp.applicationNumber) {
              const updatedRemarks = `${actionType === 'REQUEST_ADDITIONAL_DOCS' ? 'Docs Requested: ' : ''}${reviewRemarks}`;
              // Add simulated timeline event for district officer review
              const oldTimeline = a.timeline || [];
              const newEvent = {
                title: actionType === 'APPROVE' ? 'District Officer Approved' : actionType === 'REJECT' ? 'District Officer Rejected' : 'Correction Requested',
                date: new Date().toISOString().split('T')[0],
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                officer: actingOfficerName,
                role: 'District Officer',
                remarks: updatedRemarks
              };
              return {
                ...a,
                workflowStatus: localStatus,
                currentStage: localStage,
                remarks: updatedRemarks,
                rejectionReason: actionType === 'REJECT' ? rejectionReason : null,
                lastModifiedDate: new Date().toISOString(),
                timeline: [...oldTimeline, newEvent]
              };
            }
            return a;
          });
          localStorage.setItem('applications_ledger', JSON.stringify(updated));
        }

        alert(`Decision successfully recorded: ${actionType}`);
        setSelectedApp(null);
        setShowApproveConfirm(false);
        setShowRejectConfirm(false);
        setShowCorrectConfirm(false);
        setShowDocsConfirm(false);
        loadData();
      }
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Action submission failed.');
    } finally {
      setSubmitting(false);
    }
  };

  // Helper for simulated documents based on scheme particulars
  const getSimulatedDocuments = (app) => {
    const name = app?.scheme?.name?.toLowerCase() || '';
    const docs = [
      { name: 'Aadhaar Card Copy', key: 'aadhaar', verified: true, desc: `UID Number: ${app?.beneficiary?.uniqueIdNumber || 'Verified'}` },
      { name: 'Income Certificate', key: 'income', verified: true, desc: `Annual Income: ₹${app?.beneficiary?.annualIncome?.toLocaleString() || 'N/A'}` },
      { name: 'Residence Certificate', key: 'residence', verified: true, desc: `Residency: ${app?.beneficiary?.district || ' gandhinagar'}, ${app?.beneficiary?.state || 'Gujarat'}` },
      { name: 'Bank Details Passbook', key: 'passbook', verified: true, desc: `A/C Number: ${app?.beneficiary?.bankAccountNumber || 'Linked'}` }
    ];
    if (name.includes('kisan') || name.includes('farm') || name.includes('crop') || name.includes('agriculture')) {
      docs.push({ name: 'Land Possession Certificate (7/12 Extract)', key: 'land', verified: true, desc: 'Land survey verified by field officer.' });
    }
    return docs;
  };

  const getPriority = (app) => {
    if (app.priority) return app.priority;
    if (app.beneficiary?.annualIncome <= 150000) return 'HIGH';
    if (app.beneficiary?.annualIncome <= 300000) return 'MEDIUM';
    return 'LOW';
  };

  // Business Workflow Rules:
  // Must NOT see applications that are:
  // - Still submitted (INITIATION)
  // - Under eligibility check (INITIATION / ELIGIBILITY_CHECK)
  // - Pending Field Officer verification (FIELD_VERIFICATION stage)
  // - Already approved by Finance / Disbursed (stage FINANCE_REVIEW, COMPLETED)
  // Therefore, only show applications currently at DISTRICT_REVIEW stage.
  const officerApplications = applications.filter(a => a.currentStage === 'DISTRICT_REVIEW');

  // Dashboard Stats calculation
  const countPending = officerApplications.filter(
    a => a.workflowStatus === 'UNDER_REVIEW' || a.workflowStatus === 'FIELD_VERIFIED'
  ).length;

  const todayStr = new Date().toDateString();
  const countApprovedToday = applications.filter(a => {
    if (!a.lastModifiedDate) return false;
    const isApproved = a.workflowStatus === 'DISTRICT_APPROVED' || a.currentStage === 'FINANCE_REVIEW' || a.currentStage === 'COMPLETED';
    return isApproved && new Date(a.lastModifiedDate).toDateString() === todayStr;
  }).length;

  const countRejectedToday = applications.filter(a => {
    if (!a.lastModifiedDate) return false;
    const isRejected = a.workflowStatus === 'DISTRICT_REJECTED' || a.workflowStatus === 'REJECTED';
    return isRejected && new Date(a.lastModifiedDate).toDateString() === todayStr;
  }).length;

  const countCorrection = applications.filter(
    a => a.workflowStatus === 'CORRECTION_REQUIRED' || a.workflowStatus === 'RE_VERIFICATION_REQUESTED'
  ).length;

  const getReviewedThisMonth = () => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    return applications.filter(a => {
      if (!a.lastModifiedDate) return false;
      const isReviewed = ['DISTRICT_APPROVED', 'DISTRICT_REJECTED', 'CORRECTION_REQUIRED', 'RE_VERIFICATION_REQUESTED', 'APPROVED', 'REJECTED', 'DISBURSED'].includes(a.workflowStatus) || ['FINANCE_REVIEW', 'COMPLETED'].includes(a.currentStage);
      const modDate = new Date(a.lastModifiedDate);
      return isReviewed && modDate.getMonth() === currentMonth && modDate.getFullYear() === currentYear;
    }).length;
  };

  const getAverageReviewTime = () => {
    const appsWithTime = applications.filter(
      a => a.submittedDate && a.lastModifiedDate && (a.workflowStatus === 'APPROVED' || a.currentStage === 'FINANCE_REVIEW' || a.workflowStatus === 'DISTRICT_REJECTED')
    );
    if (appsWithTime.length === 0) return '2.4 Days';
    let totalDays = 0;
    appsWithTime.forEach(a => {
      const diffTime = Math.abs(new Date(a.lastModifiedDate) - new Date(a.submittedDate));
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      totalDays += diffDays;
    });
    return (totalDays / appsWithTime.length).toFixed(1) + ' Days';
  };

  // Filter application items
  const uniqueDistricts = [...new Set(applications.map(a => a.beneficiary?.district).filter(Boolean))];
  const uniqueSchemes = [...new Set(applications.map(a => a.scheme?.name).filter(Boolean))];

  const filteredList = officerApplications.filter(a => {
    // Search Term Match
    const searchLower = searchTerm.toLowerCase();
    const idMatch = a.applicationNumber?.toLowerCase().includes(searchLower);
    const nameMatch = a.beneficiary?.name
      ? a.beneficiary.name.toLowerCase().includes(searchLower)
      : `${a.beneficiary?.firstName || ''} ${a.beneficiary?.lastName || ''}`.toLowerCase().includes(searchLower);
    const schemeMatch = a.scheme?.name?.toLowerCase().includes(searchLower);

    if (searchTerm && !(idMatch || nameMatch || schemeMatch)) return false;

    // Filters
    if (filterDistrict && a.beneficiary?.district !== filterDistrict) return false;
    if (filterScheme && a.scheme?.name !== filterScheme) return false;
    if (filterPriority && getPriority(a) !== filterPriority) return false;

    if (filterStatus) {
      if (filterStatus === 'PENDING') {
        const isPending = a.workflowStatus === 'UNDER_REVIEW' || a.workflowStatus === 'FIELD_VERIFIED';
        if (!isPending) return false;
      } else if (filterStatus === 'APPROVED') {
        if (a.workflowStatus !== 'DISTRICT_APPROVED') return false;
      } else if (filterStatus === 'REJECTED') {
        if (a.workflowStatus !== 'DISTRICT_REJECTED') return false;
      } else if (filterStatus === 'CORRECTION') {
        if (a.workflowStatus !== 'CORRECTION_REQUIRED') return false;
      }
    }

    if (filterDate) {
      const appDate = a.submittedDate ? new Date(a.submittedDate).toISOString().split('T')[0] : '';
      if (appDate !== filterDate) return false;
    }

    return true;
  });

  const totalPages = Math.ceil(filteredList.length / itemsPerPage) || 1;
  const paginatedList = filteredList.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Dynamic notification logic
  const getNotifications = () => {
    const list = [];
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const overdue = officerApplications.filter(
      a => (a.workflowStatus === 'UNDER_REVIEW' || a.workflowStatus === 'FIELD_VERIFIED') && a.submittedDate && new Date(a.submittedDate) < sevenDaysAgo
    );
    if (overdue.length > 0) {
      list.push({ id: 'overdue', type: 'danger', message: `${overdue.length} reviews overdue for more than 7 days. Action required.` });
    }

    const highPriority = officerApplications.filter(
      a => (a.workflowStatus === 'UNDER_REVIEW' || a.workflowStatus === 'FIELD_VERIFIED') && getPriority(a) === 'HIGH'
    );
    if (highPriority.length > 0) {
      list.push({ id: 'priority', type: 'warning', message: `${highPriority.length} high priority review case(s) waiting for validation.` });
    }

    const recentVerified = officerApplications.filter(
      a => a.workflowStatus === 'FIELD_VERIFIED' || a.workflowStatus === 'UNDER_REVIEW'
    );
    if (recentVerified.length > 0) {
      list.push({ id: 'recent', type: 'info', message: `${recentVerified.length} recently submitted field-verified application(s) ready for review.` });
    }

    const corrections = applications.filter(a => a.workflowStatus === 'CORRECTION_REQUIRED');
    if (corrections.length > 0) {
      list.push({ id: 'correction', type: 'info', message: `${corrections.length} application case(s) returned for correction.` });
    }

    return list;
  };

  const notifications = getNotifications();

  // Export CSV Report Action
  const handleExport = (reportType) => {
    let dataToExport = [];
    let title = "";
    if (reportType === 'PENDING') {
      dataToExport = officerApplications.filter(a => a.workflowStatus === 'UNDER_REVIEW' || a.workflowStatus === 'FIELD_VERIFIED');
      title = "Pending Reviews";
    } else if (reportType === 'APPROVED') {
      dataToExport = applications.filter(a => a.workflowStatus === 'DISTRICT_APPROVED' || a.currentStage === 'FINANCE_REVIEW' || a.currentStage === 'COMPLETED');
      title = "Approved Applications";
    } else if (reportType === 'REJECTED') {
      dataToExport = applications.filter(a => a.workflowStatus === 'DISTRICT_REJECTED' || a.workflowStatus === 'REJECTED');
      title = "Rejected Applications";
    } else if (reportType === 'MONTHLY_SUMMARY') {
      const currentMonth = new Date().getMonth();
      dataToExport = applications.filter(a => {
        if (!a.lastModifiedDate) return false;
        const modDate = new Date(a.lastModifiedDate);
        return modDate.getMonth() === currentMonth;
      });
      title = "Monthly Review Summary";
    }

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Application Number,Beneficiary Name,Scheme Name,District,Requested Amount,Current Status,Date\n";
    dataToExport.forEach(item => {
      const name = item.beneficiary?.name || `${item.beneficiary?.firstName || ''} ${item.beneficiary?.lastName || ''}`;
      csvContent += `"${item.applicationNumber || ''}","${name}","${item.scheme?.name || ''}","${item.beneficiary?.district || ''}","${item.requestedAmount || ''}","${item.workflowStatus || ''}","${item.submittedDate ? new Date(item.submittedDate).toLocaleDateString() : ''}"\n`;
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${title.toLowerCase().replace(/ /g, "_")}_report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Mock e-KYC document download
  const handleDownloadDoc = (doc) => {
    const name = selectedApp?.beneficiary?.name || `${selectedApp?.beneficiary?.firstName || ''} ${selectedApp?.beneficiary?.lastName || ''}`;
    const content = `GOVERNMENT OF INDIA - DBT PORTAL DOCUMENT DOWNLOAD
--------------------------------------------------
Document Type: ${doc.name}
Applicant Name: ${name}
Aadhaar Number: ${selectedApp?.beneficiary?.uniqueIdNumber}
Details: ${doc.desc}
Verification Status: SIGNED & VERIFIED BY FIELD AUDITOR
Inspection Timestamp: ${selectedApp?.verifiedDate || new Date().toISOString()}
--------------------------------------------------`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${doc.name.toLowerCase().replace(/ /g, '_')}_${selectedApp.applicationNumber}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-100 py-20 shadow-sm flex flex-col items-center justify-center">
        <LoadingSpinner size="large" />
        <span className="text-xs text-slate-400 font-semibold mt-3">Loading district workspace ledger...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-800 md:text-3xl">District Officer Review Workspace</h1>
          <p className="text-slate-500 mt-1">Process compliance audits, verify e-KYC records, and forward eligible files to Finance.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {/* Reports Export drop-down */}
          <div className="relative group">
            <button className="inline-flex items-center space-x-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-white px-3.5 py-2 shadow-sm transition-all">
              <Download className="h-4 w-4" />
              <span>Export Reports</span>
            </button>
            <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-150 rounded-lg shadow-lg hidden group-hover:block z-50 py-1 text-xs">
              <button onClick={() => handleExport('PENDING')} className="w-full text-left px-4 py-2 hover:bg-slate-50 font-semibold text-slate-700">Pending Reviews</button>
              <button onClick={() => handleExport('APPROVED')} className="w-full text-left px-4 py-2 hover:bg-slate-50 font-semibold text-slate-700">Approved Applications</button>
              <button onClick={() => handleExport('REJECTED')} className="w-full text-left px-4 py-2 hover:bg-slate-50 font-semibold text-slate-700">Rejected Applications</button>
              <button onClick={() => handleExport('MONTHLY_SUMMARY')} className="w-full text-left px-4 py-2 hover:bg-slate-50 font-semibold text-slate-700">Monthly Review Summary</button>
            </div>
          </div>
          <div className="text-[11px] font-bold text-slate-500 bg-white border border-slate-200 rounded-lg px-3 py-2 flex items-center shadow-xs">
            District: &nbsp;<span className="text-indigo-600">Gandhinagar HQ</span>
          </div>
        </div>
      </div>

      {!selectedApp ? (
        <>
          {/* 6 Summary Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
            <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Pending Reviews</p>
              <h3 className="mt-1 text-xl font-black text-slate-800">{countPending}</h3>
              <p className="text-[9px] font-medium text-amber-600 mt-1">Awaiting review</p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Approved Today</p>
              <h3 className="mt-1 text-xl font-black text-slate-800">{countApprovedToday}</h3>
              <p className="text-[9px] font-medium text-emerald-600 mt-1">Forwarded today</p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Rejected Today</p>
              <h3 className="mt-1 text-xl font-black text-slate-800">{countRejectedToday}</h3>
              <p className="text-[9px] font-medium text-rose-600 mt-1">Denied today</p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Correction Pending</p>
              <h3 className="mt-1 text-xl font-black text-slate-800">{countCorrection}</h3>
              <p className="text-[9px] font-medium text-indigo-600 mt-1">Sent back</p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Total Reviewed (Month)</p>
              <h3 className="mt-1 text-xl font-black text-slate-800">{getReviewedThisMonth()}</h3>
              <p className="text-[9px] font-medium text-slate-500 mt-1">Current Month</p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Avg Review Time</p>
              <h3 className="mt-1 text-xl font-black text-slate-800">{getAverageReviewTime()}</h3>
              <p className="text-[9px] font-medium text-slate-500 mt-1">Submission to Audit</p>
            </div>
          </div>

          {/* Notifications Box */}
          {notifications.length > 0 && (
            <div className="rounded-xl border border-amber-100 bg-amber-50/40 p-4 space-y-2">
              <div className="flex items-center space-x-2 text-xs font-bold text-amber-800 uppercase tracking-wider">
                <Bell className="h-4 w-4 text-amber-600 animate-bounce" />
                <span>Urgent Review Tasks</span>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 text-xs font-medium text-amber-850">
                {notifications.map((alertItem) => (
                  <div key={alertItem.id} className="flex items-center space-x-2 bg-white border border-amber-100/50 rounded-lg p-2.5 shadow-3xs">
                    <span className={`h-2 w-2 rounded-full shrink-0 ${alertItem.type === 'danger' ? 'bg-rose-500' : alertItem.type === 'warning' ? 'bg-amber-500' : 'bg-indigo-500'}`} />
                    <span>{alertItem.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Data Table review Queue */}
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Pending Review Queue</h3>
            </div>

            {/* Advanced Filters */}
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-400 uppercase tracking-wider block text-[10px]">District</label>
                <select value={filterDistrict} onChange={(e) => setFilterDistrict(e.target.value)} className="h-9 w-full rounded-lg border border-slate-200 px-2 outline-none focus:border-indigo-500 bg-white">
                  <option value="">All Districts</option>
                  {uniqueDistricts.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="font-bold text-slate-400 uppercase tracking-wider block text-[10px]">Scheme</label>
                <select value={filterScheme} onChange={(e) => setFilterScheme(e.target.value)} className="h-9 w-full rounded-lg border border-slate-200 px-2 outline-none focus:border-indigo-500 bg-white">
                  <option value="">All Schemes</option>
                  {uniqueSchemes.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="font-bold text-slate-400 uppercase tracking-wider block text-[10px]">Status</label>
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="h-9 w-full rounded-lg border border-slate-200 px-2 outline-none focus:border-indigo-500 bg-white">
                  <option value="">All Statuses</option>
                  <option value="PENDING">Pending Review</option>
                  <option value="APPROVED">Approved</option>
                  <option value="REJECTED">Rejected</option>
                  <option value="CORRECTION">Correction Required</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="font-bold text-slate-400 uppercase tracking-wider block text-[10px]">Priority</label>
                <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)} className="h-9 w-full rounded-lg border border-slate-200 px-2 outline-none focus:border-indigo-500 bg-white">
                  <option value="">All Priorities</option>
                  <option value="HIGH">High Priority</option>
                  <option value="MEDIUM">Medium Priority</option>
                  <option value="LOW">Low Priority</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="font-bold text-slate-400 uppercase tracking-wider block text-[10px]">Application Date</label>
                <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="h-9 w-full rounded-lg border border-slate-200 px-2 outline-none focus:border-indigo-500 bg-white" />
              </div>
              <div className="space-y-1">
                <label className="font-bold text-slate-400 uppercase tracking-wider block text-[10px]">Search Term</label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="ID, name, scheme..."
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                    className="h-9 w-full rounded-lg border border-slate-200 pl-8 pr-2 text-xs outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* Table */}
            {paginatedList.length === 0 ? (
              <div className="py-16 text-center text-slate-400 text-xs flex flex-col items-center justify-center space-y-2 border border-dashed border-slate-100 rounded-xl">
                <FileText className="h-8 w-8 text-slate-300" />
                <span className="font-bold">No application files matching active workspace filters.</span>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-xs text-slate-500">
                    <thead className="bg-slate-50 font-bold uppercase tracking-wider text-slate-500 border-b border-slate-150">
                      <tr>
                        <th className="px-3 py-3">Application ID</th>
                        <th className="px-3 py-3">Beneficiary Name</th>
                        <th className="px-3 py-3">Scheme Name</th>
                        <th className="px-3 py-3">Category</th>
                        <th className="px-3 py-3">Field Officer</th>
                        <th className="px-3 py-3">District</th>
                        <th className="px-3 py-3">Date</th>
                        <th className="px-3 py-3 text-center">Score</th>
                        <th className="px-3 py-3 text-right">Requested</th>
                        <th className="px-3 py-3 text-center">Status</th>
                        <th className="px-3 py-3 text-center">Priority</th>
                        <th className="px-3 py-3 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-semibold">
                      {paginatedList.map((app) => {
                        const priority = getPriority(app);
                        const officerName = app.assignedOfficer
                          ? `${app.assignedOfficer.firstName} ${app.assignedOfficer.lastName.charAt(0)}.`
                          : 'fieldofficer1';
                        
                        return (
                          <tr key={app.id} className="hover:bg-slate-50/40 transition-all">
                            <td className="px-3 py-3.5 font-bold text-indigo-650">{app.applicationNumber}</td>
                            <td className="px-3 py-3.5 text-slate-800">{app.beneficiary?.name || `${app.beneficiary?.firstName || ''} ${app.beneficiary?.lastName || 'Unlinked'}`}</td>
                            <td className="px-3 py-3.5 text-slate-650 truncate max-w-[120px]">{app.scheme?.name || 'N/A'}</td>
                            <td className="px-3 py-3.5 text-slate-500">{app.beneficiary?.category || 'General'}</td>
                            <td className="px-3 py-3.5 text-slate-500 font-medium">{officerName}</td>
                            <td className="px-3 py-3.5 text-slate-500">{app.beneficiary?.district || 'Gandhinagar'}</td>
                            <td className="px-3 py-3.5 text-slate-450 font-medium">{app.submittedDate ? new Date(app.submittedDate).toLocaleDateString() : 'N/A'}</td>
                            <td className="px-3 py-3.5 text-center text-slate-800 font-bold">{app.eligibilityScore || 85}</td>
                            <td className="px-3 py-3.5 text-right font-bold text-slate-700">₹{app.requestedAmount?.toLocaleString()}</td>
                            <td className="px-3 py-3.5 text-center">
                              <span className={`inline-flex items-center space-x-1 rounded-full px-2 py-0.5 text-[9px] font-bold ${app.workflowStatus === 'APPROVED' || app.workflowStatus === 'DISTRICT_APPROVED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : app.workflowStatus === 'REJECTED' || app.workflowStatus === 'DISTRICT_REJECTED' ? 'bg-rose-50 text-rose-700 border border-rose-100' : 'bg-amber-50 text-amber-700 border border-amber-100'}`}>
                                <span>{app.workflowStatus || 'UNDER_REVIEW'}</span>
                              </span>
                            </td>
                            <td className="px-3 py-3.5 text-center">
                              <span className={`inline-flex rounded px-1.5 py-0.5 text-[9px] font-bold ${priority === 'HIGH' ? 'bg-rose-100 text-rose-750' : priority === 'MEDIUM' ? 'bg-amber-100 text-amber-750' : 'bg-slate-100 text-slate-700'}`}>
                                {priority}
                              </span>
                            </td>
                            <td className="px-3 py-3.5 text-center">
                              <div className="flex items-center justify-center space-x-1.5">
                                <button onClick={() => handleReviewClick(app, 'view')} title="View Details" className="h-7 w-7 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-all shadow-3xs">
                                  <Eye className="h-3.5 w-3.5" />
                                </button>
                                <button onClick={() => handleReviewClick(app, 'review')} title="Audit Review" className="inline-flex items-center space-x-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 px-2 py-1 text-[11px] font-bold text-indigo-600 transition-all">
                                  <span>Review</span>
                                  <ArrowRight className="h-3 w-3" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination footer */}
                <div className="flex items-center justify-between border-t border-slate-100 pt-4 text-xs font-semibold text-slate-500">
                  <button onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1} className="inline-flex items-center space-x-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 hover:bg-slate-50 disabled:opacity-40 shadow-3xs">
                    <ChevronLeft className="h-4 w-4" />
                    <span>Previous</span>
                  </button>
                  <span>Page {currentPage} of {totalPages}</span>
                  <button onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages} className="inline-flex items-center space-x-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 hover:bg-slate-50 disabled:opacity-40 shadow-3xs">
                    <span>Next</span>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        /* Workspace review workspace view */
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <button onClick={() => setSelectedApp(null)} className="inline-flex items-center space-x-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-650 hover:bg-slate-50 shadow-sm transition-all">
              <ChevronLeft className="h-4 w-4" />
              <span>Back to Reviews Queue</span>
            </button>
            <div className="text-right">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Currently Auditing Case</span>
              <h2 className="text-lg font-black text-slate-800 flex items-center space-x-2 justify-end">
                <span>{selectedApp.applicationNumber}</span>
                <span className={`inline-flex rounded px-1.5 py-0.5 text-[9px] font-black ${getPriority(selectedApp) === 'HIGH' ? 'bg-rose-100 text-rose-750' : 'bg-slate-100 text-slate-700'}`}>
                  {getPriority(selectedApp)} Priority
                </span>
              </h2>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              {/* Beneficiary Information */}
              <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm space-y-4">
                <div className="flex items-center space-x-2 border-b border-slate-50 pb-2.5">
                  <User className="h-5 w-5 text-indigo-500" />
                  <h3 className="text-xs font-bold text-slate-850 uppercase tracking-wider">Beneficiary Information</h3>
                </div>
                <div className="grid gap-3.5 sm:grid-cols-2 text-xs leading-relaxed">
                  <div className="bg-slate-50 rounded-xl p-3"><span className="text-slate-400 block font-semibold mb-0.5">Full Name</span><span className="font-bold text-slate-800 text-sm">{selectedApp.beneficiary?.name || `${selectedApp.beneficiary?.firstName || ''} ${selectedApp.beneficiary?.lastName || 'N/A'}`}</span></div>
                  <div className="bg-slate-50 rounded-xl p-3"><span className="text-slate-400 block font-semibold mb-0.5">Aadhaar Number</span><span className="font-mono font-bold text-slate-750 text-sm">{selectedApp.beneficiary?.uniqueIdNumber || 'N/A'}</span></div>
                  <div className="bg-slate-50 rounded-xl p-3"><span className="text-slate-400 block font-semibold mb-0.5">Mobile Number</span><span className="font-mono font-bold text-slate-750 text-sm">{selectedApp.beneficiary?.phoneNumber || 'N/A'}</span></div>
                  <div className="bg-slate-50 rounded-xl p-3"><span className="text-slate-400 block font-semibold mb-0.5">Annual Income</span><span className="font-bold text-slate-800 text-sm">₹{selectedApp.beneficiary?.annualIncome?.toLocaleString() || '0'}</span></div>
                  <div className="bg-slate-50 rounded-xl p-3"><span className="text-slate-400 block font-semibold mb-0.5">Category</span><span className="font-bold text-slate-800 text-sm">{selectedApp.beneficiary?.category || 'General'}</span></div>
                  <div className="bg-slate-50 rounded-xl p-3"><span className="text-slate-400 block font-semibold mb-0.5">Occupation (Simulated)</span><span className="font-bold text-slate-800 text-sm">
                    {selectedApp?.scheme?.name?.toLowerCase().includes('kisan') || selectedApp?.scheme?.name?.toLowerCase().includes('farm') ? 'Agricultural / Marginal Farmer' : 'Self-Employed artisan'}
                  </span></div>
                  <div className="bg-slate-50 rounded-xl p-3 sm:col-span-2"><span className="text-slate-400 block font-semibold mb-0.5">Residential Address</span><span className="font-semibold text-slate-750">{selectedApp.beneficiary?.address || 'N/A'}, {selectedApp.beneficiary?.district || 'Gandhinagar'}, {selectedApp.beneficiary?.state || 'Gujarat'}</span></div>
                </div>
              </div>

              {/* Scheme Information */}
              <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm space-y-4">
                <div className="flex items-center space-x-2 border-b border-slate-50 pb-2.5">
                  <BookOpen className="h-5 w-5 text-indigo-500" />
                  <h3 className="text-xs font-bold text-slate-850 uppercase tracking-wider">Scheme Information</h3>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 text-xs leading-relaxed">
                  <div className="bg-slate-50 rounded-xl p-3 sm:col-span-2"><span className="text-slate-400 block font-semibold mb-0.5">Scheme Name</span><span className="font-bold text-slate-800 text-sm">{selectedApp.scheme?.name || 'N/A'}</span></div>
                  <div className="bg-slate-50 rounded-xl p-3"><span className="text-slate-400 block font-semibold mb-0.5">Requested Amount</span><span className="font-bold text-slate-800 text-sm">₹{selectedApp.requestedAmount?.toLocaleString()}</span></div>
                  <div className="bg-slate-50 rounded-xl p-3"><span className="text-slate-400 block font-semibold mb-0.5">Eligible Amount (Simulated)</span><span className="font-bold text-emerald-600 text-sm">₹{(selectedApp.requestedAmount * 0.95).toLocaleString()}</span></div>
                  <div className="bg-slate-50 rounded-xl p-3"><span className="text-slate-400 block font-semibold mb-0.5">Application Date</span><span className="font-bold text-slate-800 text-sm">{selectedApp.submittedDate ? new Date(selectedApp.submittedDate).toLocaleDateString() : 'N/A'}</span></div>
                  <div className="bg-slate-50 rounded-xl p-3 sm:col-span-2"><span className="text-slate-400 block font-semibold mb-0.5">Scheme Description</span><span className="font-semibold text-slate-650 block italic mt-1">"{selectedApp.scheme?.description}"</span></div>
                </div>
              </div>

              {/* Uploaded Documents Preview */}
              <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm space-y-4">
                <div className="flex items-center space-x-2 border-b border-slate-50 pb-2.5">
                  <FileText className="h-5 w-5 text-indigo-500" />
                  <h3 className="text-xs font-bold text-slate-850 uppercase tracking-wider">Uploaded Documents Workspace</h3>
                </div>
                <div className="grid gap-4 md:grid-cols-5 text-xs">
                  {/* Left checklist of docs */}
                  <div className="md:col-span-2 space-y-2">
                    <p className="font-bold text-slate-400 uppercase tracking-wider text-[9px] mb-1">Select Document to Preview</p>
                    {getSimulatedDocuments(selectedApp).map((doc, idx) => (
                      <button
                        key={idx}
                        onClick={() => setActiveDoc(doc)}
                        className={`w-full flex items-center justify-between border rounded-xl p-3 transition-all text-left ${activeDoc?.name === doc.name ? 'bg-indigo-50/50 border-indigo-200 ring-1 ring-indigo-200' : 'bg-slate-50/55 hover:bg-slate-50 border-slate-100'}`}
                      >
                        <div className="space-y-0.5 max-w-[80%]">
                          <p className="font-bold text-slate-800 truncate">{doc.name}</p>
                          <p className="text-[9px] text-slate-400 font-semibold truncate">{doc.desc}</p>
                        </div>
                        <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                      </button>
                    ))}
                  </div>

                  {/* Right Document Preview Box */}
                  <div className="md:col-span-3 border border-slate-150 rounded-xl p-4 bg-slate-50/45 flex flex-col justify-between space-y-4 min-h-[220px]">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-150 pb-2">
                        <span className="font-bold text-indigo-650 uppercase tracking-wider text-[10px]">Document Previewer</span>
                        <button
                          onClick={() => handleDownloadDoc(activeDoc)}
                          className="inline-flex items-center space-x-1 rounded bg-white hover:bg-slate-50 border border-slate-200 px-2 py-1 text-[10px] font-bold text-slate-650 transition-all shadow-3xs"
                        >
                          <Download className="h-3 w-3" />
                          <span>Download</span>
                        </button>
                      </div>

                      {/* Mock Certificate Visual Render */}
                      <div className="border border-slate-200/60 bg-white rounded-lg p-4 shadow-3xs relative overflow-hidden font-sans space-y-2">
                        <div className="absolute top-0 right-0 p-1 bg-indigo-50 border-bl border-indigo-100 text-[8px] font-bold text-indigo-600 rounded-bl">
                          E-KYC PORTAL
                        </div>
                        <h5 className="font-bold text-[10px] text-slate-800 border-b border-slate-100 pb-1 flex items-center space-x-1">
                          <Shield className="h-3.5 w-3.5 text-indigo-500" />
                          <span>OFFICIAL DIGITAL VERIFICATION COPY</span>
                        </h5>
                        <p className="text-[10px] text-slate-600 leading-relaxed font-semibold">
                          Certified copy verifying the <strong className="text-slate-800">{activeDoc?.name}</strong> issued for applicant <strong className="text-slate-800">{selectedApp?.beneficiary?.name || 'Beneficiary'}</strong>.
                        </p>
                        <div className="text-[9px] bg-slate-50 p-2 rounded text-slate-600 font-mono space-y-0.5">
                          <p><strong>Aadhaar UID:</strong> XXXX-XXXX-{selectedApp?.beneficiary?.uniqueIdNumber?.slice(-4) || '1234'}</p>
                          <p><strong>Registry Ref:</strong> REF-DBT-{selectedApp.id}-098</p>
                          <p><strong>Metadata Hash:</strong> sha256_e7f3a91b2c45</p>
                        </div>
                        <div className="text-[8px] font-bold text-emerald-600 flex items-center space-x-1 pt-1">
                          <CheckCircle className="h-3 w-3 shrink-0" />
                          <span>ELECTRONIC SIGNATURE VALID: SIGNED BY FIELD AUDITOR OFFICE</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-[9px] text-slate-400 font-medium italic text-center">
                      * All documents are pre-verified via UIDAI Aadhaar Vault & DigiLocker e-sign checks.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right side workspace panel */}
            <div className="space-y-6">
              {/* Eligibility Report */}
              <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm space-y-3.5">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-50 pb-1">Eligibility Report</h4>
                <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-xl p-4 border border-slate-800 text-xs space-y-3 relative overflow-hidden shadow-sm">
                  <div className="absolute right-0 top-0 h-16 w-16 bg-white/5 rounded-full translate-x-3 -translate-y-3"></div>
                  <div className="flex justify-between items-center"><span className="font-semibold text-slate-300">Eligibility score:</span><span className="text-lg font-black text-emerald-450">{selectedApp.eligibilityScore || 85} / 100</span></div>
                  <div className="border-t border-white/10 pt-2 text-[10px] space-y-1.5 font-medium text-slate-300">
                    <div className="flex items-center justify-between text-emerald-400"><span className="flex items-center"><Check className="h-3 w-3 mr-1" /> Aadhaar Verification</span><span>PASSED</span></div>
                    <div className="flex items-center justify-between text-emerald-400"><span className="flex items-center"><Check className="h-3 w-3 mr-1" /> Domicile Location Match</span><span>PASSED</span></div>
                    <div className="flex items-center justify-between text-emerald-400"><span className="flex items-center"><Check className="h-3 w-3 mr-1" /> Annual Income ceiling</span><span>PASSED</span></div>
                  </div>
                  <div className="border-t border-white/10 pt-2 flex justify-between items-center text-[10px]"><span className="font-semibold text-slate-300">AI Recommendation:</span><span className="font-bold text-emerald-400">RECOMMENDED FOR APPROVAL</span></div>
                </div>
              </div>

              {/* Field Officer Verification */}
              <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm space-y-3.5">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-50 pb-1">Field Officer Verification</h4>
                <div className="space-y-3 text-xs leading-relaxed">
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 italic text-slate-650 flex items-start space-x-2">
                    <MessageSquare className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                    <span>"{selectedApp.remarks || 'Physical audit completed. Coordinates geotagged on site. Income matches declared details. Verified and recommended.'}"</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-[10px] space-y-1 text-slate-650">
                    <div className="flex justify-between"><span className="text-slate-400 font-bold">Inspection Date:</span><span className="font-bold text-slate-700">{selectedApp.verifiedDate ? new Date(selectedApp.verifiedDate).toLocaleDateString() : new Date().toLocaleDateString()}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400 font-bold">Officer Name:</span><span className="font-bold text-slate-700">{selectedApp.assignedOfficer ? `${selectedApp.assignedOfficer.firstName} ${selectedApp.assignedOfficer.lastName}` : 'J. K. Patel (fieldofficer1)'}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400 font-bold">Result / Rec:</span><span className="font-bold text-emerald-600">VERIFIED & APPROVED</span></div>
                  </div>
                  {/* Photo frame */}
                  <div className="border border-slate-200/70 rounded-xl p-3 bg-slate-50 flex items-center space-x-3 shadow-3xs">
                    <div className="h-10 w-10 bg-indigo-100 border border-indigo-200 rounded-lg flex items-center justify-center text-indigo-500 shrink-0">
                      <MapPin className="h-5 w-5" />
                    </div>
                    <div className="text-[9px] text-slate-500 font-mono space-y-0.5 leading-tight">
                      <p className="font-bold text-slate-700">Geotag Site Audit Photo</p>
                      <p>Latitude: 23.2156° N</p>
                      <p>Longitude: 72.6369° E</p>
                      <p>Timestamp: Verified on site</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Chronological Audit Timeline */}
              <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm space-y-4">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-50 pb-1">Chronological Audit Timeline</h4>
                {historyLoading ? (
                  <div className="flex justify-center py-4"><LoadingSpinner size="small" /></div>
                ) : (
                  <div className="relative border-l border-slate-150 pl-4 space-y-4 ml-1.5">
                    {/* Event 1: Submitted */}
                    <div className="relative text-[10px] space-y-0.5 leading-relaxed">
                      <span className="absolute -left-6 top-1.5 h-2.5 w-2.5 rounded-full bg-indigo-500 border-2 border-white shadow-xs"></span>
                      <div className="flex justify-between text-slate-800 font-bold">
                        <span>Application Submitted</span>
                        <span className="text-[9px] text-slate-400">{selectedApp.submittedDate ? new Date(selectedApp.submittedDate).toLocaleDateString() : 'N/A'}</span>
                      </div>
                      <p className="text-[9px] text-slate-400 font-bold">Officer: Citizen (Self) | Role: Beneficiary</p>
                      <p className="text-slate-500 italic text-[9px] bg-slate-50 p-1.5 rounded border border-slate-100/50 mt-1">"Application uploaded successfully on DBT Portal."</p>
                    </div>

                    {/* Event 2: Eligibility Check */}
                    <div className="relative text-[10px] space-y-0.5 leading-relaxed">
                      <span className="absolute -left-6 top-1.5 h-2.5 w-2.5 rounded-full bg-blue-500 border-2 border-white shadow-xs"></span>
                      <div className="flex justify-between text-slate-800 font-bold">
                        <span>Eligibility Verified</span>
                        <span className="text-[9px] text-slate-400">{selectedApp.submittedDate ? new Date(selectedApp.submittedDate).toLocaleDateString() : 'N/A'}</span>
                      </div>
                      <p className="text-[9px] text-slate-400 font-bold">Officer: AI Rule Engine | Role: System Check</p>
                      <p className="text-slate-500 italic text-[9px] bg-slate-50 p-1.5 rounded border border-slate-100/50 mt-1">"Eligibility Score: {selectedApp.eligibilityScore || 85}/100. Policy criteria checked."</p>
                    </div>

                    {/* Event 3: Field Verification */}
                    <div className="relative text-[10px] space-y-0.5 leading-relaxed">
                      <span className="absolute -left-6 top-1.5 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-white shadow-xs"></span>
                      <div className="flex justify-between text-slate-800 font-bold">
                        <span>Field Officer Approved</span>
                        <span className="text-[9px] text-slate-400">{selectedApp.verifiedDate ? new Date(selectedApp.verifiedDate).toLocaleDateString() : new Date().toLocaleDateString()}</span>
                      </div>
                      <p className="text-[9px] text-slate-400 font-bold">Officer: {selectedApp.assignedOfficer ? `${selectedApp.assignedOfficer.firstName} ${selectedApp.assignedOfficer.lastName}` : 'fieldofficer1'} | Role: Field Officer</p>
                      <p className="text-slate-505 italic text-[9px] bg-slate-50 p-1.5 rounded border border-slate-100/50 mt-1">"{selectedApp.remarks || 'Physical audit completed. Coordinates geotagged.'}"</p>
                    </div>

                    {/* Event 4: District Review (If updated already) */}
                    {(selectedApp.workflowStatus === 'DISTRICT_APPROVED' || selectedApp.workflowStatus === 'DISTRICT_REJECTED' || selectedApp.workflowStatus === 'CORRECTION_REQUIRED') && (
                      <div className="relative text-[10px] space-y-0.5 leading-relaxed">
                        <span className="absolute -left-6 top-1.5 h-2.5 w-2.5 rounded-full bg-indigo-650 border-2 border-white shadow-xs"></span>
                        <div className="flex justify-between text-slate-800 font-bold">
                          <span>District Officer Review</span>
                          <span className="text-[9px] text-slate-400">{selectedApp.lastModifiedDate ? new Date(selectedApp.lastModifiedDate).toLocaleDateString() : new Date().toLocaleDateString()}</span>
                        </div>
                        <p className="text-[9px] text-slate-400 font-bold">Officer: {actingOfficerName} | Role: District Officer</p>
                        <p className="text-slate-500 italic text-[9px] bg-slate-50 p-1.5 rounded border border-slate-100/50 mt-1">"Decision: {selectedApp.workflowStatus}. Remarks: {selectedApp.remarks}"</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* District Decision Panel */}
              <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm space-y-4">
                <h4 className="text-xs font-bold text-slate-850 uppercase tracking-wider">District Decision Panel</h4>
                {reviewMode === 'view' ? (
                  <div className="bg-slate-50 rounded-xl p-4 text-xs font-bold text-slate-500 border border-slate-150 text-center leading-relaxed">
                    ℹ️ Viewing Mode — decision actions are restricted. Go back to queue to perform review actions.
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Decision Remarks *</label>
                      <textarea
                        rows={3}
                        value={reviewRemarks}
                        onChange={(e) => setReviewRemarks(e.target.value)}
                        placeholder="Enter audit remarks or details. Remarks are mandatory before submitting any decision..."
                        className="w-full rounded-lg border border-slate-200 p-2.5 text-xs outline-none focus:border-indigo-500"
                      />
                    </div>
                    {reviewRemarks.trim() === '' && (
                      <p className="text-[9px] text-rose-500 font-bold">⚠️ You must enter remarks to submit a decision.</p>
                    )}
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Rejection Reason (If rejecting)</label>
                      <input
                        type="text"
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        placeholder="Specify rejection details..."
                        className="h-9 w-full rounded-lg border border-slate-200 px-3 text-xs outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div className="grid gap-2 grid-cols-2">
                      <button
                        onClick={() => {
                          if (!reviewRemarks.trim()) {
                            alert('Remarks are mandatory before submitting any decision.');
                            return;
                          }
                          setShowApproveConfirm(true);
                        }}
                        disabled={submitting}
                        className="h-9 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-[11px] font-bold text-white shadow-sm flex items-center justify-center space-x-1 transition-all disabled:opacity-50"
                      >
                        <Check className="h-3.5 w-3.5" />
                        <span>Approve</span>
                      </button>
                      <button
                        onClick={() => {
                          if (!reviewRemarks.trim()) {
                            alert('Remarks are mandatory before submitting any decision.');
                            return;
                          }
                          setShowRejectConfirm(true);
                        }}
                        disabled={submitting}
                        className="h-9 rounded-lg bg-rose-600 hover:bg-rose-700 text-[11px] font-bold text-white shadow-sm flex items-center justify-center space-x-1 transition-all disabled:opacity-50"
                      >
                        <X className="h-3.5 w-3.5" />
                        <span>Reject</span>
                      </button>
                      <button
                        onClick={() => {
                          if (!reviewRemarks.trim()) {
                            alert('Remarks are mandatory before submitting any decision.');
                            return;
                          }
                          setShowCorrectConfirm(true);
                        }}
                        disabled={submitting}
                        className="h-9 rounded-lg bg-amber-500 hover:bg-amber-600 text-[11px] font-bold text-white shadow-sm flex items-center justify-center space-x-1 transition-all disabled:opacity-50"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        <span>Correct</span>
                      </button>
                      <button
                        onClick={() => {
                          if (!reviewRemarks.trim()) {
                            alert('Remarks are mandatory before submitting any decision.');
                            return;
                          }
                          setShowDocsConfirm(true);
                        }}
                        disabled={submitting}
                        className="h-9 rounded-lg bg-indigo-650 hover:bg-indigo-700 text-[11px] font-bold text-white shadow-sm flex items-center justify-center space-x-1 transition-all disabled:opacity-50"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        <span>Request Docs</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modals */}
      {showApproveConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-100 p-6 max-w-sm w-full mx-4 shadow-xl space-y-4">
            <h4 className="text-base font-black text-slate-800">Confirm Approve Decision</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Are you sure you want to approve application <strong>{selectedApp?.applicationNumber}</strong>? This transitions status to <strong>DISTRICT_APPROVED</strong> and forwards to the Finance Officer.
            </p>
            <div className="flex justify-end space-x-2 pt-2">
              <button onClick={() => setShowApproveConfirm(false)} className="h-8 px-3 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-500 transition-all">Cancel</button>
              <button onClick={() => submitAction('APPROVE')} disabled={submitting} className="h-8 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white transition-all disabled:opacity-50">{submitting ? 'Approving...' : 'Confirm Approval'}</button>
            </div>
          </div>
        </div>
      )}

      {showRejectConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-100 p-6 max-w-sm w-full mx-4 shadow-xl space-y-4">
            <h4 className="text-base font-black text-slate-800">Confirm Reject Decision</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Are you sure you want to reject application <strong>{selectedApp?.applicationNumber}</strong>? This is a terminal action setting status to <strong>DISTRICT_REJECTED</strong>.
            </p>
            <div className="flex justify-end space-x-2 pt-2">
              <button onClick={() => setShowRejectConfirm(false)} className="h-8 px-3 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-500 transition-all">Cancel</button>
              <button onClick={() => submitAction('REJECT')} disabled={submitting} className="h-8 px-4 rounded-lg bg-rose-600 hover:bg-rose-700 text-xs font-bold text-white transition-all disabled:opacity-50">{submitting ? 'Rejecting...' : 'Confirm Rejection'}</button>
            </div>
          </div>
        </div>
      )}

      {showCorrectConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-100 p-6 max-w-sm w-full mx-4 shadow-xl space-y-4">
            <h4 className="text-base font-black text-slate-800">Confirm Send Back</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Are you sure you want to return application <strong>{selectedApp?.applicationNumber}</strong> to the field officer for clarification? Status becomes <strong>CORRECTION_REQUIRED</strong>.
            </p>
            <div className="flex justify-end space-x-2 pt-2">
              <button onClick={() => setShowCorrectConfirm(false)} className="h-8 px-3 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-500 transition-all">Cancel</button>
              <button onClick={() => submitAction('REQUEST_REVERIFICATION')} disabled={submitting} className="h-8 px-4 rounded-lg bg-amber-500 hover:bg-amber-600 text-xs font-bold text-white transition-all disabled:opacity-50">{submitting ? 'Submitting...' : 'Confirm Correction'}</button>
            </div>
          </div>
        </div>
      )}

      {showDocsConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-100 p-6 max-w-sm w-full mx-4 shadow-xl space-y-4">
            <h4 className="text-base font-black text-slate-800">Confirm Request Docs</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Are you sure you want to request additional documents for application <strong>{selectedApp?.applicationNumber}</strong>? Status will be updated to <strong>CORRECTION_REQUIRED</strong>.
            </p>
            <div className="flex justify-end space-x-2 pt-2">
              <button onClick={() => setShowDocsConfirm(false)} className="h-8 px-3 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-500 transition-all">Cancel</button>
              <button onClick={() => submitAction('REQUEST_ADDITIONAL_DOCS')} disabled={submitting} className="h-8 px-4 rounded-lg bg-indigo-650 hover:bg-indigo-700 text-xs font-bold text-white transition-all disabled:opacity-50">{submitting ? 'Submitting...' : 'Confirm Request'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
