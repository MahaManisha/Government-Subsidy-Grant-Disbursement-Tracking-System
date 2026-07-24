import React, { createContext, useContext, useState, useEffect } from 'react';
import { Outlet, Navigate } from 'react-router-dom';

const RoleContext = createContext(null);

export function useRole() {
  return useContext(RoleContext);
}

export default function ProtectedLayout() {
  const [token, setToken] = useState(() => {
    return localStorage.getItem('jwt_token') || sessionStorage.getItem('jwt_token') || null;
  });
  
  const [user, setUser] = useState(() => {
    const localUser = localStorage.getItem('user_info') || sessionStorage.getItem('user_info');
    return localUser ? JSON.parse(localUser) : null;
  });

  const [activeRole, setActiveRoleState] = useState(() => {
    return localStorage.getItem('active_role') || sessionStorage.getItem('active_role') || null;
  });

  const [loading, setLoading] = useState(false);

  const setActiveRole = (role) => {
    setActiveRoleState(role);
    if (localStorage.getItem('jwt_token')) {
      localStorage.setItem('active_role', role);
    } else {
      sessionStorage.setItem('active_role', role);
    }
  };

  const login = (jwtToken, userDetails, rememberMe) => {
    setLoading(true);
    const storage = rememberMe ? localStorage : sessionStorage;
    
    storage.setItem('jwt_token', jwtToken);
    storage.setItem('user_info', JSON.stringify(userDetails));
    
    // Auto map backend roles to the activeRole context
    const defaultRole = userDetails.roles && userDetails.roles.length > 0 
      ? Array.from(userDetails.roles)[0] 
      : 'ROLE_BENEFICIARY';
      
    storage.setItem('active_role', defaultRole);
    
    setToken(jwtToken);
    setUser(userDetails);
    setActiveRoleState(defaultRole);
    setLoading(false);
  };

  const logout = () => {
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('user_info');
    localStorage.removeItem('active_role');
    sessionStorage.removeItem('jwt_token');
    sessionStorage.removeItem('user_info');
    sessionStorage.removeItem('active_role');
    
    setToken(null);
    setUser(null);
    setActiveRoleState(null);
  };

  useEffect(() => {
    const handleAuthError = () => {
      logout();
    };
    window.addEventListener('auth-error', handleAuthError);
    return () => window.removeEventListener('auth-error', handleAuthError);
  }, []);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return (
    <RoleContext.Provider value={{ token, user, activeRole, setActiveRole, login, logout, loading }}>
      <Outlet />
    </RoleContext.Provider>
  );
}
