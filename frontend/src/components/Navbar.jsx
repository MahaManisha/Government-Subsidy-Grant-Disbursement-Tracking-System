import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Search, LogOut, Shield } from 'lucide-react';
import { useRole } from '../layouts/ProtectedLayout';

export default function Navbar() {
  const auth = useRole();
  const navigate = useNavigate();

  if (!auth) return null;

  const { user, activeRole, setActiveRole, logout } = auth;

  // Generate initials for avatar
  const getInitials = () => {
    if (!user || !user.username) return 'GU';
    return user.username.slice(0, 2).toUpperCase();
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Convert ROLE_ADMIN -> Admin, etc.
  const formatRoleLabel = (roleStr) => {
    if (!roleStr) return 'Guest';
    return roleStr.replace('ROLE_', '').split('_').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' ');
  };

  // List actual roles assigned to the user
  const userRolesList = user && user.roles ? Array.from(user.roles) : [];

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white px-6 shadow-sm">
      {/* Search Bar */}
      <div className="relative flex w-80 items-center">
        <Search className="absolute left-3 h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search schemes, applications..."
          className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-4 text-sm outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* Role Switcher & User Profile */}
      <div className="flex items-center space-x-6">
        {/* Dynamic Role Selector (restricted to user's assigned roles) */}
        {userRolesList.length > 0 && (
          <div className="flex items-center space-x-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">
            <Shield className="h-3.5 w-3.5 text-blue-600" />
            <span>Role:</span>
            {userRolesList.length > 1 ? (
              <select
                value={activeRole}
                onChange={(e) => setActiveRole(e.target.value)}
                className="bg-transparent font-bold text-blue-600 outline-none cursor-pointer"
              >
                {userRolesList.map((role) => (
                  <option key={role} value={role}>
                    {formatRoleLabel(role)}
                  </option>
                ))}
              </select>
            ) : (
              <span className="font-bold text-blue-600">{formatRoleLabel(activeRole)}</span>
            )}
          </div>
        )}

        {/* Notifications Icon */}
        <button className="relative p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-50 rounded-full transition-all">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500"></span>
        </button>

        {/* User Info */}
        <div className="flex items-center space-x-3 border-l border-slate-200 pl-6">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-semibold text-slate-800 capitalize">
              {user ? user.username : 'Guest User'}
            </p>
            <p className="text-xs text-slate-500 capitalize">
              {formatRoleLabel(activeRole)} Panel
            </p>
          </div>
          
          {/* Initials Avatar */}
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white font-bold shadow-sm">
            {getInitials()}
          </div>

          {/* Logout Trigger */}
          <button
            onClick={handleLogout}
            title="Log Out"
            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-all border border-transparent hover:border-red-100 cursor-pointer"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
