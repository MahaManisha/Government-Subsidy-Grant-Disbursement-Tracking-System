import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Shield, Eye, EyeOff, Lock, User, Mail, Phone, CreditCard, Home, Calendar, Hash, Loader2, Info } from 'lucide-react';
import axiosInstance from '../api/axiosInstance';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function Register() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors }
  } = useForm({
    defaultValues: {
      fullName: '',
      username: '',
      password: '',
      confirmPassword: '',
      email: '',
      mobileNumber: '',
      aadhaarNumber: '',
      gender: 'MALE',
      category: 'GENERAL',
      dateOfBirth: '',
      address: '',
      bankAccountNumber: '',
      ifscCode: ''
    }
  });

  const passwordValue = watch('password');

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const response = await axiosInstance.post('/v1/auth/register', {
        fullName: data.fullName,
        username: data.username,
        password: data.password,
        confirmPassword: data.confirmPassword,
        email: data.email,
        mobileNumber: data.mobileNumber,
        aadhaarNumber: data.aadhaarNumber,
        gender: data.gender,
        category: data.category,
        dateOfBirth: data.dateOfBirth,
        address: data.address,
        bankAccountNumber: data.bankAccountNumber,
        ifscCode: data.ifscCode
      });

      if (response.data && response.data.success) {
        toast.success('Registration successful! Redirecting to login...');
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else {
        toast.error(response.data?.message || 'Registration failed. Please try again.');
      }
    } catch (err) {
      if (err.response?.data?.data?.validationErrors) {
        err.response.data.data.validationErrors.forEach((errorMsg) => {
          toast.error(errorMsg);
        });
      } else {
        toast.error(err.response?.data?.message || err.message || 'Registration failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-slate-950 px-4 py-12 sm:px-6 lg:px-8 overflow-hidden">
      <ToastContainer position="top-right" autoClose={3000} />
      
      {/* Decorative Glowing Orbs */}
      <div className="absolute top-[-10%] left-[-10%] h-[500px] w-[500px] rounded-full bg-blue-600/10 blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] h-[500px] w-[500px] rounded-full bg-indigo-600/10 blur-[120px]" />

      <div className="w-full max-w-2xl space-y-8 z-10">
        {/* Brand Header */}
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 shadow-lg shadow-blue-500/30">
            <Shield className="h-7 w-7 text-white" />
          </div>
          <h2 className="mt-6 text-3xl font-extrabold tracking-tight text-white">
            Beneficiary Registration
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            Create your citizen account to track and apply for government subsidies
          </p>
        </div>

        {/* Card Container */}
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl">
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            
            {/* Account Credentials Section */}
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-blue-400 mb-4 border-b border-slate-800 pb-2">
                1. Account Credentials
              </h3>
              <div className="grid gap-6 md:grid-cols-2">
                {/* Full Name */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Full Name *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-500">
                      <User className="h-4 w-4" />
                    </div>
                    <input
                      type="text"
                      placeholder="John Doe"
                      className={`block w-full h-11 rounded-xl border bg-slate-950/50 pl-10 pr-4 text-sm text-white placeholder-slate-500 outline-none transition-all ${
                        errors.fullName ? 'border-red-500/50 focus:border-red-500' : 'border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                      }`}
                      {...register('fullName', { required: 'Full name is required', maxLength: { value: 100, message: 'Max 100 characters' } })}
                    />
                  </div>
                  {errors.fullName && <p className="text-xs text-red-500">{errors.fullName.message}</p>}
                </div>

                {/* Username */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Username *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-500">
                      <User className="h-4 w-4" />
                    </div>
                    <input
                      type="text"
                      placeholder="johndoe"
                      className={`block w-full h-11 rounded-xl border bg-slate-950/50 pl-10 pr-4 text-sm text-white placeholder-slate-500 outline-none transition-all ${
                        errors.username ? 'border-red-500/50 focus:border-red-500' : 'border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                      }`}
                      {...register('username', {
                        required: 'Username is required',
                        minLength: { value: 3, message: 'Minimum 3 characters' },
                        maxLength: { value: 50, message: 'Maximum 50 characters' }
                      })}
                    />
                  </div>
                  {errors.username && <p className="text-xs text-red-500">{errors.username.message}</p>}
                </div>

                {/* Password */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Password *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-500">
                      <Lock className="h-4 w-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      className={`block w-full h-11 rounded-xl border bg-slate-950/50 pl-10 pr-10 text-sm text-white placeholder-slate-500 outline-none transition-all ${
                        errors.password ? 'border-red-500/50 focus:border-red-500' : 'border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                      }`}
                      {...register('password', {
                        required: 'Password is required',
                        minLength: { value: 6, message: 'Password must be at least 6 characters' }
                      })}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-500 hover:text-slate-300"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
                </div>

                {/* Confirm Password */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Confirm Password *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-500">
                      <Lock className="h-4 w-4" />
                    </div>
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      className={`block w-full h-11 rounded-xl border bg-slate-950/50 pl-10 pr-10 text-sm text-white placeholder-slate-500 outline-none transition-all ${
                        errors.confirmPassword ? 'border-red-500/50 focus:border-red-500' : 'border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                      }`}
                      {...register('confirmPassword', {
                        required: 'Confirm password is required',
                        validate: (value) => value === passwordValue || 'Passwords do not match'
                      })}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-500 hover:text-slate-300"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.confirmPassword && <p className="text-xs text-red-500">{errors.confirmPassword.message}</p>}
                </div>
              </div>
            </div>

            {/* Profile & Personal Info Section */}
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-blue-400 mb-4 border-b border-slate-800 pb-2">
                2. Citizen Profile Details
              </h3>
              <div className="grid gap-6 md:grid-cols-2">
                {/* Email */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Email Address *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-500">
                      <Mail className="h-4 w-4" />
                    </div>
                    <input
                      type="email"
                      placeholder="john@example.com"
                      className={`block w-full h-11 rounded-xl border bg-slate-950/50 pl-10 pr-4 text-sm text-white placeholder-slate-500 outline-none transition-all ${
                        errors.email ? 'border-red-500/50 focus:border-red-500' : 'border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                      }`}
                      {...register('email', { required: 'Email is required', pattern: { value: /^\S+@\S+$/i, message: 'Invalid email' } })}
                    />
                  </div>
                  {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
                </div>

                {/* Mobile Number */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Mobile Number *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-500">
                      <Phone className="h-4 w-4" />
                    </div>
                    <input
                      type="text"
                      placeholder="9876543210"
                      className={`block w-full h-11 rounded-xl border bg-slate-950/50 pl-10 pr-4 text-sm text-white placeholder-slate-500 outline-none transition-all ${
                        errors.mobileNumber ? 'border-red-500/50 focus:border-red-500' : 'border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                      }`}
                      {...register('mobileNumber', {
                        required: 'Mobile number is required',
                        pattern: { value: /^\+?[0-9]{10,15}$/, message: 'Valid 10 to 15 digit number' }
                      })}
                    />
                  </div>
                  {errors.mobileNumber && <p className="text-xs text-red-500">{errors.mobileNumber.message}</p>}
                </div>

                {/* Aadhaar Number */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Aadhaar / Unique ID *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-500">
                      <Hash className="h-4 w-4" />
                    </div>
                    <input
                      type="text"
                      placeholder="12-digit Aadhaar UID"
                      maxLength={12}
                      className={`block w-full h-11 rounded-xl border bg-slate-950/50 pl-10 pr-4 text-sm text-white placeholder-slate-500 outline-none transition-all ${
                        errors.aadhaarNumber ? 'border-red-500/50 focus:border-red-500' : 'border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                      }`}
                      {...register('aadhaarNumber', {
                        required: 'Aadhaar ID is required',
                        pattern: { value: /^\d{12}$/, message: 'Must be exactly 12 digits' }
                      })}
                    />
                  </div>
                  {errors.aadhaarNumber && <p className="text-xs text-red-500">{errors.aadhaarNumber.message}</p>}
                </div>

                {/* Date of Birth */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Date of Birth *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-500">
                      <Calendar className="h-4 w-4" />
                    </div>
                    <input
                      type="date"
                      className={`block w-full h-11 rounded-xl border bg-slate-950/50 pl-10 pr-4 text-sm text-slate-300 placeholder-slate-500 outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500 ${
                        errors.dateOfBirth ? 'border-red-500/50 focus:border-red-500' : 'border-slate-800'
                      }`}
                      {...register('dateOfBirth', { required: 'Date of birth is required' })}
                    />
                  </div>
                  {errors.dateOfBirth && <p className="text-xs text-red-500">{errors.dateOfBirth.message}</p>}
                </div>

                {/* Gender */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Gender *
                  </label>
                  <select
                    className="block w-full h-11 rounded-xl border border-slate-800 bg-slate-950 px-4 text-sm text-slate-300 outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500 cursor-pointer"
                    {...register('gender', { required: 'Gender is required' })}
                  >
                    <option value="MALE">MALE</option>
                    <option value="FEMALE">FEMALE</option>
                    <option value="OTHER">OTHER</option>
                  </select>
                </div>

                {/* Category */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Category *
                  </label>
                  <select
                    className="block w-full h-11 rounded-xl border border-slate-800 bg-slate-950 px-4 text-sm text-slate-300 outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500 cursor-pointer"
                    {...register('category', { required: 'Category is required' })}
                  >
                    <option value="GENERAL">GENERAL</option>
                    <option value="OBC">OBC</option>
                    <option value="SC">SC</option>
                    <option value="ST">ST</option>
                    <option value="BPL">BPL</option>
                  </select>
                </div>
              </div>

              {/* Address */}
              <div className="space-y-2 mt-6">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Residential Address *
                </label>
                <div className="relative">
                  <div className="absolute top-3.5 left-3.5 pointer-events-none text-slate-500">
                    <Home className="h-4 w-4" />
                  </div>
                  <textarea
                    placeholder="Enter your full residential address"
                    rows="3"
                    className={`block w-full rounded-xl border bg-slate-950/50 pl-10 pr-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500 ${
                      errors.address ? 'border-red-500/50 focus:border-red-500' : 'border-slate-800'
                    }`}
                    {...register('address', { required: 'Address is required', maxLength: { value: 500, message: 'Max 500 characters' } })}
                  />
                </div>
                {errors.address && <p className="text-xs text-red-500">{errors.address.message}</p>}
              </div>
            </div>

            {/* Financial Parameters Section */}
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-blue-400 mb-4 border-b border-slate-800 pb-2">
                3. Bank Account Information
              </h3>
              <div className="grid gap-6 md:grid-cols-2">
                {/* Bank Account Number */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Bank Account Number *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-500">
                      <CreditCard className="h-4 w-4" />
                    </div>
                    <input
                      type="text"
                      placeholder="Account Number"
                      className={`block w-full h-11 rounded-xl border bg-slate-950/50 pl-10 pr-4 text-sm text-white placeholder-slate-500 outline-none transition-all ${
                        errors.bankAccountNumber ? 'border-red-500/50 focus:border-red-500' : 'border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                      }`}
                      {...register('bankAccountNumber', {
                        required: 'Bank account is required',
                        minLength: { value: 9, message: '9 to 20 digits required' },
                        maxLength: { value: 20, message: '9 to 20 digits required' }
                      })}
                    />
                  </div>
                  {errors.bankAccountNumber && <p className="text-xs text-red-500">{errors.bankAccountNumber.message}</p>}
                </div>

                {/* IFSC Code */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Bank IFSC Code *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-500">
                      <Hash className="h-4 w-4" />
                    </div>
                    <input
                      type="text"
                      placeholder="IFSC Code (e.g. SBIN0001234)"
                      className={`block w-full h-11 rounded-xl border bg-slate-950/50 pl-10 pr-4 text-sm text-white placeholder-slate-500 outline-none transition-all ${
                        errors.ifscCode ? 'border-red-500/50 focus:border-red-500' : 'border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                      }`}
                      {...register('ifscCode', {
                        required: 'IFSC code is required',
                        pattern: { value: /^[A-Z]{4}0[A-Z0-9]{6}$/, message: 'Format: 4 letters, 0, 6 characters' }
                      })}
                    />
                  </div>
                  {errors.ifscCode && <p className="text-xs text-red-500">{errors.ifscCode.message}</p>}
                </div>
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
                  <span>Registering Citizen...</span>
                </>
              ) : (
                <span>Register as Beneficiary</span>
              )}
            </button>
          </form>

          {/* Redirect link to Login */}
          <div className="mt-6 text-center text-sm text-slate-400">
            Already have an account?{' '}
            <Link to="/login" className="font-bold text-blue-500 hover:text-blue-400 transition-all hover:underline">
              Sign In Here
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}
