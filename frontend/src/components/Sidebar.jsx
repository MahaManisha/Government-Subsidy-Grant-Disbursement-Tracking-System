import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  FileText,
  CheckSquare,
  FileCheck,
  IndianRupee,
  ShieldCheck,
  BarChart3,
  Settings,
  Flag,
  User
} from 'lucide-react';
import { useRole } from '../layouts/ProtectedLayout';

export default function Sidebar({ isCollapsed, setIsCollapsed }) {
  const auth = useRole();
  const activeRole = auth ? auth.activeRole : 'ROLE_BENEFICIARY';

  // Construct menu items based on the active role
  const getMenuItems = () => {
    switch (activeRole) {
      case 'ROLE_ADMIN':
        return [
          { path: '/', label: 'Dashboard', icon: LayoutDashboard },
          { path: '/users', label: 'Users', icon: Users },
          { path: '/beneficiaries', label: 'Beneficiaries', icon: Users },
          { path: '/schemes', label: 'Schemes', icon: BookOpen },
          { path: '/applications', label: 'Applications', icon: FileText },
          { path: '/verification', label: 'Verification', icon: FileCheck },
          { path: '/disbursement', label: 'Disbursement', icon: IndianRupee },
          { path: '/compliance', label: 'Compliance', icon: ShieldCheck },
          { path: '/analytics', label: 'Analytics', icon: BarChart3 },
          { path: '/settings', label: 'Settings', icon: Settings },
        ];
      case 'ROLE_BENEFICIARY':
        return [
          { path: '/', label: 'Dashboard', icon: LayoutDashboard },
          { path: '/beneficiaries/my-profile', label: 'My Profile', icon: User },
          { path: '/applications/my-applications', label: 'My Applications', icon: FileText },
          { path: '/eligibility', label: 'Eligibility', icon: CheckSquare },
          { path: '/disbursement/status', label: 'Disbursement Status', icon: IndianRupee },
        ];
      case 'ROLE_FIELD_OFFICER':
        return [
          { path: '/field/dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { path: '/field/assigned', label: 'Assigned Applications', icon: FileText },
          { path: '/field/verification', label: 'Verification Workflow', icon: FileCheck },
        ];
      case 'ROLE_DISTRICT_OFFICER':
        return [
          { path: '/verification/district/dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { path: '/verification/district/reviews', label: 'District Reviews', icon: FileCheck },
          { path: '/verification/district/verification', label: 'Verification History', icon: FileCheck },
        ];
      case 'ROLE_FINANCE_OFFICER':
        return [
          { path: '/finance/dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { path: '/verification/finance', label: 'Finance Review', icon: FileCheck },
          { path: '/disbursement', label: 'Disbursement', icon: IndianRupee },
          { path: '/analytics', label: 'Analytics', icon: BarChart3 },
        ];
      default:
        return [
          { path: '/', label: 'Dashboard', icon: LayoutDashboard },
        ];
    }
  };

  const menuItems = getMenuItems();

  return (
    <aside
      className={`fixed bottom-0 top-0 left-0 z-40 flex flex-col border-r border-slate-800 bg-slate-900 text-white transition-all duration-300 ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="flex h-16 items-center justify-between px-6 border-b border-slate-800">
        {!isCollapsed && (
          <div className="flex items-center space-x-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600">
              <Flag className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-black uppercase tracking-wider text-white">GovSubsidy</h1>
              <p className="text-[10px] text-blue-400 font-bold uppercase tracking-wider">Disbursement & Tracking</p>
            </div>
          </div>
        )}
        {isCollapsed && (
          <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600">
            <Flag className="h-5 w-5 text-white" />
          </div>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 space-y-1.5 px-3 py-6 overflow-y-auto">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center space-x-4 px-4 py-3 rounded-lg text-sm font-semibold transition-all group ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`
            }
          >
            <item.icon className="h-5 w-5 flex-shrink-0 group-hover:scale-110 transition-transform" />
            {!isCollapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Collapsible Switch Button at Bottom */}
      <div className="p-4 border-t border-slate-800">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="flex w-full items-center justify-center rounded-lg bg-slate-800 py-2.5 text-xs font-semibold text-slate-400 hover:bg-slate-700 hover:text-white transition-all cursor-pointer"
        >
          {isCollapsed ? '→' : '← Collapse Sidebar'}
        </button>
      </div>
    </aside>
  );
}
