import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Shield, Eye, EyeOff, Lock, User, AlertCircle, Loader2 } from 'lucide-react';
import axiosInstance from '../api/axiosInstance';
import { useRole } from '../layouts/ProtectedLayout';

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  
  // Expose the evolved context methods. Temporarily check if the hook exists
  const auth = useRole();

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm({
    defaultValues: {
      username: '',
      password: '',
      rememberMe: true
    }
  });

  const onSubmit = async (data) => {
    setLoading(true);
    setApiError('');
    try {
      const response = await axiosInstance.post('/v1/auth/login', {
        username: data.username,
        password: data.password
      });

      if (response.data && response.data.success) {
        const { token, id, username, roles } = response.data.data;
        
        // Evolve and store state
        if (auth && auth.login) {
          auth.login(token, { id, username, roles }, data.rememberMe);
        } else {
          // Fallback if context not fully loaded/injected
          const storage = data.rememberMe ? localStorage : sessionStorage;
          storage.setItem('jwt_token', token);
          storage.setItem('user_info', JSON.stringify({ id, username, roles }));
          storage.setItem('active_role', roles && roles.length > 0 ? Array.from(roles)[0] : 'ROLE_BENEFICIARY');
        }
        
        navigate('/');
      } else {
        setApiError(response.data?.message || 'Authentication failed. Please try again.');
      }
    } catch (err) {
      setApiError(err.message || 'Invalid username or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-slate-950 px-4 py-12 sm:px-6 lg:px-8 overflow-hidden">
      {/* Decorative Glowing Orbs */}
      <div className="absolute top-[-10%] left-[-10%] h-[500px] w-[500px] rounded-full bg-blue-600/10 blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] h-[500px] w-[500px] rounded-full bg-indigo-600/10 blur-[120px]" />

      <div className="w-full max-w-md space-y-8 z-10">
        {/* Brand Header */}
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 shadow-lg shadow-blue-500/30">
            <Shield className="h-7 w-7 text-white" />
          </div>
          <h2 className="mt-6 text-3xl font-extrabold tracking-tight text-white">
            National Subsidy Portal
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            Sign in to access your administrative panel or beneficiary workspace
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl">
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            {/* Global API Error Alert */}
            {apiError && (
              <div className="flex items-center space-x-2 rounded-xl bg-red-950/30 border border-red-800/50 p-4 text-sm text-red-400">
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                <span>{apiError}</span>
              </div>
            )}

            {/* Username Input */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-500">
                  <User className="h-5 w-5" />
                </div>
                <input
                  type="text"
                  placeholder="Enter your username"
                  className={`block w-full h-11 rounded-xl border bg-slate-950/50 pl-11 pr-4 text-sm text-white placeholder-slate-500 outline-none transition-all ${
                    errors.username
                      ? 'border-red-500/50 focus:border-red-500'
                      : 'border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                  }`}
                  {...register('username', { required: 'Username is required' })}
                />
              </div>
              {errors.username && (
                <p className="text-xs text-red-500">{errors.username.message}</p>
              )}
            </div>

            {/* Password Input */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-500">
                  <Lock className="h-5 w-5" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className={`block w-full h-11 rounded-xl border bg-slate-950/50 pl-11 pr-12 text-sm text-white placeholder-slate-500 outline-none transition-all ${
                    errors.password
                      ? 'border-red-500/50 focus:border-red-500'
                      : 'border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                  }`}
                  {...register('password', {
                    required: 'Password is required',
                    minLength: {
                      value: 6,
                      message: 'Password must be at least 6 characters'
                    }
                  })}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-red-500">{errors.password.message}</p>
              )}
            </div>

            {/* Remember Me Options */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="rememberMe"
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-800 bg-slate-950 text-blue-600 focus:ring-0 cursor-pointer"
                  {...register('rememberMe')}
                />
                <label htmlFor="rememberMe" className="ml-2.5 text-sm text-slate-400 cursor-pointer">
                  Remember me on this device
                </label>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="flex w-full h-11 items-center justify-center rounded-xl bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700 active:bg-blue-800 transition-all shadow-md shadow-blue-500/10 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <span>Sign In</span>
              )}
            </button>

            {/* Registration Link */}
            <div className="text-center text-sm text-slate-400 mt-4">
              New Beneficiary?{' '}
              <Link to="/register" className="font-bold text-blue-500 hover:text-blue-400 hover:underline transition-all">
                Register Here
              </Link>
            </div>
          </form>

        </div>
      </div>
    </div>
  );
}
