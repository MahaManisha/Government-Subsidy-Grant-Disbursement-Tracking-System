import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import {
  Shield, Eye, EyeOff, Lock, User, Mail, Phone, CreditCard, Home,
  Calendar, Hash, Loader2, Info, Building2, Upload, MapPin, Globe,
  Users, TrendingUp, Award, UserCheck, Camera, CheckCircle2
} from 'lucide-react';
import axiosInstance from '../api/axiosInstance';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function Register() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [calculatedAge, setCalculatedAge] = useState('');
  const [photoPreview, setPhotoPreview] = useState(null);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
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
      dateOfBirth: '',
      gender: 'MALE',
      category: 'GENERAL',
      occupation: 'Farmer',
      maritalStatus: 'SINGLE',
      disability: 'NO',
      houseNo: '',
      street: '',
      city: '',
      district: '',
      state: 'Tamil Nadu',
      country: 'India',
      pinCode: '',
      annualIncome: '',
      familySize: '4',
      rationCard: '',
      bplApl: 'APL',
      accountHolder: '',
      bankName: '',
      bankAccountNumber: '',
      confirmBankAccountNumber: '',
      ifscCode: '',
      passportPhoto: ''
    }
  });

  const passwordValue = watch('password');
  const accountNumberValue = watch('bankAccountNumber');
  const dateOfBirthValue = watch('dateOfBirth');

  // Auto calculate age when Date of Birth changes
  useEffect(() => {
    if (dateOfBirthValue) {
      const dob = new Date(dateOfBirthValue);
      const today = new Date();
      let age = today.getFullYear() - dob.getFullYear();
      const monthDiff = today.getMonth() - dob.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
        age--;
      }
      setCalculatedAge(age >= 0 ? `${age} Years` : 'Invalid DOB');
    } else {
      setCalculatedAge('');
    }
  }, [dateOfBirthValue]);

  // Handle Photo File Upload Preview
  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error('Image size must be less than 2MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result);
        setValue('passportPhoto', reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const fullAddress = [
        data.houseNo,
        data.street,
        data.city,
        data.district,
        data.state ? `${data.state}${data.pinCode ? ' - ' + data.pinCode : ''}` : data.pinCode
      ].filter(Boolean).join(', ');

      const response = await axiosInstance.post('/v1/auth/register', {
        fullName: data.fullName,
        username: data.username,
        password: data.password,
        confirmPassword: data.confirmPassword,
        email: data.email,
        mobileNumber: data.mobileNumber,
        aadhaarNumber: data.aadhaarNumber,
        dateOfBirth: data.dateOfBirth,
        gender: data.gender,
        category: data.category,
        occupation: data.occupation,
        maritalStatus: data.maritalStatus,
        disability: data.disability,
        houseNo: data.houseNo,
        street: data.street,
        city: data.city,
        district: data.district,
        state: data.state,
        country: data.country || 'India',
        pinCode: data.pinCode,
        address: fullAddress,
        annualIncome: data.annualIncome ? parseFloat(data.annualIncome) : 0,
        familySize: data.familySize ? parseInt(data.familySize) : 1,
        rationCard: data.rationCard,
        bplApl: data.bplApl,
        accountHolder: data.accountHolder || data.fullName,
        bankName: data.bankName,
        bankAccountNumber: data.bankAccountNumber,
        ifscCode: data.ifscCode,
        passportPhoto: data.passportPhoto || photoPreview || ''
      });

      if (response.data && response.data.success) {
        toast.success('Registration successful! Redirecting to login...');
        setTimeout(() => {
          navigate('/login');
        }, 1800);
      } else {
        toast.error(response.data?.message || 'Registration failed. Please try again.');
      }
    } catch (err) {
      if (err.validationErrors && Array.isArray(err.validationErrors) && err.validationErrors.length > 0) {
        err.validationErrors.forEach((errorMsg) => {
          toast.error(errorMsg);
        });
      } else if (err.response?.data?.data?.validationErrors && Array.isArray(err.response.data.data.validationErrors)) {
        err.response.data.data.validationErrors.forEach((errorMsg) => {
          toast.error(errorMsg);
        });
      } else {
        toast.error(err.message || err.response?.data?.message || 'Registration failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-slate-950 px-4 py-12 sm:px-6 lg:px-8">
      <ToastContainer position="top-right" autoClose={3000} />
      
      {/* Background Decorative Glow */}
      <div className="absolute top-[-10%] left-[-10%] h-[600px] w-[600px] rounded-full bg-blue-600/10 blur-[140px]" />
      <div className="absolute bottom-[-10%] right-[-10%] h-[600px] w-[600px] rounded-full bg-indigo-600/10 blur-[140px]" />

      <div className="w-full max-w-4xl space-y-8 z-10">
        {/* Brand Header */}
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 shadow-xl shadow-blue-500/25">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <h2 className="mt-5 text-3xl font-black tracking-tight text-white sm:text-4xl">
            Citizen Beneficiary Registration
          </h2>
          <p className="mt-2 text-sm text-slate-400 max-w-md mx-auto">
            Official Direct Benefit Transfer portal for government subsidy schemes
          </p>
        </div>

        {/* Registration Form Card */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/90 backdrop-blur-2xl p-6 sm:p-10 shadow-2xl space-y-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-10">

            {/* SECTION 1: ACCOUNT DETAILS */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400 font-bold text-xs">
                  01
                </div>
                <h3 className="text-base font-bold text-white tracking-wide uppercase">ACCOUNT DETAILS</h3>
              </div>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                    <input
                      type="text"
                      {...register('fullName', { required: 'Full name is required' })}
                      className="w-full rounded-xl border border-slate-800 bg-slate-950/60 pl-10 pr-4 py-2.5 text-sm text-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                      placeholder="e.g. Maha Manisha M"
                    />
                  </div>
                  {errors.fullName && <p className="mt-1 text-xs text-rose-400">{errors.fullName.message}</p>}
                </div>

                {/* Username */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Username <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <UserCheck className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                    <input
                      type="text"
                      {...register('username', {
                        required: 'Username is required',
                        minLength: { value: 3, message: 'Minimum 3 characters required' }
                      })}
                      className="w-full rounded-xl border border-slate-800 bg-slate-950/60 pl-10 pr-4 py-2.5 text-sm text-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                      placeholder="e.g. mahamanisha"
                    />
                  </div>
                  {errors.username && <p className="mt-1 text-xs text-rose-400">{errors.username.message}</p>}
                </div>

                {/* Password */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Password <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      {...register('password', {
                        required: 'Password is required',
                        minLength: { value: 6, message: 'Minimum 6 characters required' }
                      })}
                      className="w-full rounded-xl border border-slate-800 bg-slate-950/60 pl-10 pr-10 py-2.5 text-sm text-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-3 text-slate-500 hover:text-slate-300"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.password && <p className="mt-1 text-xs text-rose-400">{errors.password.message}</p>}
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Confirm Password <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      {...register('confirmPassword', {
                        required: 'Please confirm password',
                        validate: (value) => value === passwordValue || 'Passwords do not match'
                      })}
                      className="w-full rounded-xl border border-slate-800 bg-slate-950/60 pl-10 pr-10 py-2.5 text-sm text-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3.5 top-3 text-slate-500 hover:text-slate-300"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.confirmPassword && <p className="mt-1 text-xs text-rose-400">{errors.confirmPassword.message}</p>}
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Email Address <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                    <input
                      type="email"
                      {...register('email', {
                        required: 'Email is required',
                        pattern: { value: /\S+@\S+\.\S+/, message: 'Invalid email address' }
                      })}
                      className="w-full rounded-xl border border-slate-800 bg-slate-950/60 pl-10 pr-4 py-2.5 text-sm text-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                      placeholder="maha@subsidy.gov.in"
                    />
                  </div>
                  {errors.email && <p className="mt-1 text-xs text-rose-400">{errors.email.message}</p>}
                </div>

                {/* Mobile */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Mobile Number <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                    <input
                      type="text"
                      {...register('mobileNumber', {
                        required: 'Mobile number is required',
                        pattern: { value: /^\+?[0-9]{10,15}$/, message: 'Valid 10-15 digit mobile number' }
                      })}
                      className="w-full rounded-xl border border-slate-800 bg-slate-950/60 pl-10 pr-4 py-2.5 text-sm text-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                      placeholder="9025425900"
                    />
                  </div>
                  {errors.mobileNumber && <p className="mt-1 text-xs text-rose-400">{errors.mobileNumber.message}</p>}
                </div>
              </div>
            </div>

            {/* SECTION 2: PERSONAL INFORMATION */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400 font-bold text-xs">
                  02
                </div>
                <h3 className="text-base font-bold text-white tracking-wide uppercase">PERSONAL INFORMATION</h3>
              </div>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                {/* Aadhaar */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Aadhaar Number <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <CreditCard className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                    <input
                      type="text"
                      maxLength={12}
                      {...register('aadhaarNumber', {
                        required: '12-digit Aadhaar is required',
                        pattern: { value: /^\d{12}$/, message: 'Must be exactly 12 numeric digits' }
                      })}
                      className="w-full rounded-xl border border-slate-800 bg-slate-950/60 pl-10 pr-4 py-2.5 text-sm text-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                      placeholder="123443214567"
                    />
                  </div>
                  {errors.aadhaarNumber && <p className="mt-1 text-xs text-rose-400">{errors.aadhaarNumber.message}</p>}
                </div>

                {/* Date of Birth */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Date of Birth <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                    <input
                      type="date"
                      {...register('dateOfBirth', { required: 'Date of birth is required' })}
                      className="w-full rounded-xl border border-slate-800 bg-slate-950/60 pl-10 pr-4 py-2.5 text-sm text-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                    />
                  </div>
                  {errors.dateOfBirth && <p className="mt-1 text-xs text-rose-400">{errors.dateOfBirth.message}</p>}
                </div>

                {/* Age (Auto Computed) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Age (Auto Computed)
                  </label>
                  <div className="relative">
                    <Info className="absolute left-3.5 top-3 h-4 w-4 text-blue-400" />
                    <input
                      type="text"
                      readOnly
                      value={calculatedAge || 'Select DOB above'}
                      className="w-full rounded-xl border border-slate-800 bg-slate-900/40 pl-10 pr-4 py-2.5 text-sm text-blue-400 font-semibold cursor-not-allowed outline-none"
                    />
                  </div>
                </div>

                {/* Gender */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Gender <span className="text-rose-500">*</span>
                  </label>
                  <select
                    {...register('gender', { required: 'Gender is required' })}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-2.5 text-sm text-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                  >
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                {/* Category */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Social Category <span className="text-rose-500">*</span>
                  </label>
                  <select
                    {...register('category', { required: 'Category is required' })}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-2.5 text-sm text-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                  >
                    <option value="GENERAL">General</option>
                    <option value="OBC">OBC</option>
                    <option value="SC">SC</option>
                    <option value="ST">ST</option>
                    <option value="BPL">BPL</option>
                  </select>
                </div>

                {/* Occupation */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Occupation
                  </label>
                  <select
                    {...register('occupation')}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-2.5 text-sm text-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                  >
                    <option value="Farmer">Farmer</option>
                    <option value="Self-Employed">Self-Employed</option>
                    <option value="Salaried">Salaried</option>
                    <option value="Unemployed">Unemployed</option>
                    <option value="Student">Student</option>
                    <option value="Business">Business</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {/* Marital Status */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Marital Status
                  </label>
                  <select
                    {...register('maritalStatus')}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-2.5 text-sm text-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                  >
                    <option value="SINGLE">Single</option>
                    <option value="MARRIED">Married</option>
                    <option value="WIDOWED">Widowed</option>
                    <option value="DIVORCED">Divorced</option>
                  </select>
                </div>

                {/* Disability */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Disability
                  </label>
                  <select
                    {...register('disability')}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-2.5 text-sm text-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                  >
                    <option value="NO">No</option>
                    <option value="YES">Yes</option>
                  </select>
                </div>
              </div>
            </div>

            {/* SECTION 3: ADDRESS */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 font-bold text-xs">
                  03
                </div>
                <h3 className="text-base font-bold text-white tracking-wide uppercase">ADDRESS</h3>
              </div>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                {/* House No */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    House No / Door No
                  </label>
                  <input
                    type="text"
                    {...register('houseNo')}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-2.5 text-sm text-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                    placeholder="e.g. 12/4B"
                  />
                </div>

                {/* Street */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Street / Village
                  </label>
                  <input
                    type="text"
                    {...register('street')}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-2.5 text-sm text-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                    placeholder="e.g. Gandhi Nagar"
                  />
                </div>

                {/* City */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    City / Taluk
                  </label>
                  <input
                    type="text"
                    {...register('city')}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-2.5 text-sm text-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                    placeholder="e.g. Nagercoil"
                  />
                </div>

                {/* District */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    District
                  </label>
                  <input
                    type="text"
                    {...register('district')}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-2.5 text-sm text-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                    placeholder="e.g. Kaniyakumari"
                  />
                </div>

                {/* State */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    State
                  </label>
                  <input
                    type="text"
                    {...register('state')}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-2.5 text-sm text-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                    placeholder="e.g. Tamil Nadu"
                  />
                </div>

                {/* PIN Code */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    PIN Code
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    {...register('pinCode', {
                      pattern: { value: /^\d{6}$/, message: 'Valid 6-digit PIN code' }
                    })}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-2.5 text-sm text-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                    placeholder="629001"
                  />
                  {errors.pinCode && <p className="mt-1 text-xs text-rose-400">{errors.pinCode.message}</p>}
                </div>
              </div>
            </div>

            {/* SECTION 4: ECONOMIC DETAILS */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400 font-bold text-xs">
                  04
                </div>
                <h3 className="text-base font-bold text-white tracking-wide uppercase">ECONOMIC DETAILS</h3>
              </div>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-4">
                {/* Annual Income */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Annual Income (₹)
                  </label>
                  <input
                    type="number"
                    step="1000"
                    {...register('annualIncome')}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-2.5 text-sm text-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                    placeholder="e.g. 150000"
                  />
                </div>

                {/* Family Size */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Family Size
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    {...register('familySize')}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-2.5 text-sm text-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                    placeholder="4"
                  />
                </div>

                {/* Ration Card */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Ration Card Number
                  </label>
                  <input
                    type="text"
                    {...register('rationCard')}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-2.5 text-sm text-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                    placeholder="e.g. TN-33-882201"
                  />
                </div>

                {/* BPL/APL */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Economic Card Type
                  </label>
                  <select
                    {...register('bplApl')}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-2.5 text-sm text-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                  >
                    <option value="APL">APL (Above Poverty Line)</option>
                    <option value="BPL">BPL (Below Poverty Line)</option>
                    <option value="AAY">Antyodaya Anna Yojana (AAY)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* SECTION 5: BANK DETAILS */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400 font-bold text-xs">
                  05
                </div>
                <h3 className="text-base font-bold text-white tracking-wide uppercase">BANK DETAILS (FOR DBT DISBURSEMENT)</h3>
              </div>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                {/* Account Holder Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Account Holder Name
                  </label>
                  <input
                    type="text"
                    {...register('accountHolder')}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-2.5 text-sm text-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                    placeholder="e.g. Maha Manisha M"
                  />
                </div>

                {/* Bank Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Bank Name
                  </label>
                  <input
                    type="text"
                    {...register('bankName')}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-2.5 text-sm text-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                    placeholder="e.g. State Bank of India"
                  />
                </div>

                {/* IFSC Code */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    IFSC Code <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    {...register('ifscCode', {
                      required: 'IFSC code is required',
                      pattern: { value: /^[A-Z]{4}0[A-Z0-9]{6}$/, message: 'e.g. SBIN0001234' }
                    })}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-2.5 text-sm text-slate-200 uppercase focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                    placeholder="SBIN0001234"
                  />
                  {errors.ifscCode && <p className="mt-1 text-xs text-rose-400">{errors.ifscCode.message}</p>}
                </div>

                {/* Account Number */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Account Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="password"
                    {...register('bankAccountNumber', {
                      required: 'Bank account number is required',
                      minLength: { value: 9, message: 'Minimum 9 digits required' }
                    })}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-2.5 text-sm text-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                    placeholder="••••••••••••"
                  />
                  {errors.bankAccountNumber && <p className="mt-1 text-xs text-rose-400">{errors.bankAccountNumber.message}</p>}
                </div>

                {/* Confirm Account Number */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Confirm Account Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    {...register('confirmBankAccountNumber', {
                      required: 'Please confirm bank account number',
                      validate: (val) => val === accountNumberValue || 'Account numbers do not match'
                    })}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-2.5 text-sm text-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                    placeholder="Re-enter bank account number"
                  />
                  {errors.confirmBankAccountNumber && <p className="mt-1 text-xs text-rose-400">{errors.confirmBankAccountNumber.message}</p>}
                </div>
              </div>
            </div>

            {/* SECTION 6: PROFILE */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10 text-purple-400 font-bold text-xs">
                  06
                </div>
                <h3 className="text-base font-bold text-white tracking-wide uppercase">PROFILE PASSPORT PHOTO</h3>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-6 p-4 rounded-2xl border border-slate-800 bg-slate-950/40">
                <div className="flex h-24 w-24 items-center justify-center rounded-2xl border-2 border-dashed border-slate-700 bg-slate-900 overflow-hidden flex-shrink-0">
                  {photoPreview ? (
                    <img src={photoPreview} alt="Passport Preview" className="h-full w-full object-cover" />
                  ) : (
                    <Camera className="h-8 w-8 text-slate-600" />
                  )}
                </div>
                <div className="space-y-2 text-center sm:text-left">
                  <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all cursor-pointer shadow-md shadow-blue-600/20">
                    <Upload className="h-4 w-4" />
                    Upload Passport Photo
                    <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                  </label>
                  <p className="text-xs text-slate-400">
                    Allowed formats: JPG, PNG, WEBP (Max size 2MB). Used for E-KYC beneficiary profile.
                  </p>
                </div>
              </div>
            </div>

            {/* SUBMIT BUTTON */}
            <div className="pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-xs text-slate-400">
                Already have an account?{' '}
                <Link to="/login" className="font-semibold text-blue-400 hover:underline">
                  Sign in here
                </Link>
              </p>
              <button
                type="submit"
                disabled={loading}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm shadow-xl shadow-blue-600/25 transition-all cursor-pointer disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Registering Account...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Register Beneficiary Profile
                  </>
                )}
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}
