import React, { useState, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Phone,
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  Calendar,
  Camera,
  CheckCircle2,
  AlertCircle,
  Smartphone,
  ShieldCheck,
  RefreshCw,
  ChevronDown,
  X,
} from 'lucide-react';
import {
  UserData,
  loginWithPhone,
  loginWithEmail,
  loginWithGoogle,
  loginAsDemoUser,
  sendOtpCode,
  verifyOtpCode,
  createUserAccount,
  findUserForReset,
  resetUserPassword,
  calculateAge,
  formatPhone,
  setupRecaptcha,
  sendFirebasePhoneOtp,
  verifyFirebasePhoneOtp,
  checkDuplicatePhone,
  checkDuplicateEmail,
} from '../services/authService';
import { sendOneSignalPush } from '../services/oneSignalService';
import { registerBackHandler } from '../services/backNavigationService';
import { ConfirmationResult } from 'firebase/auth';
import { FaceScanVerification } from './FaceScanVerification';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessLogin: (user: UserData) => void;
  isMandatory?: boolean;
}

type AuthScreen =
  | 'login'
  | 'create_choose'
  | 'phone_otp_step1'
  | 'phone_otp_step2'
  | 'phone_otp_complete'
  | 'email_otp_step1'
  | 'email_otp_step2'
  | 'email_otp_complete'
  | 'no_otp_signup'
  | 'no_otp_face_scan'
  | 'forgot_choose'
  | 'forgot_input'
  | 'forgot_otp'
  | 'forgot_new_pass';

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccessLogin,
  isMandatory = false,
}) => {
  // Screen state
  const [screen, setScreen] = useState<AuthScreen>('login');

  // Login state
  const [loginTab, setLoginTab] = useState<'phone' | 'email'>('phone');
  const [loginPhone, setLoginPhone] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Common Signup Fields
  const [signupPhone, setSignupPhone] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupFirstName, setSignupFirstName] = useState('');
  const [signupLastName, setSignupLastName] = useState('');
  const [signupDob, setSignupDob] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [signupAvatar, setSignupAvatar] = useState<string | null>(null);

  // OTP State
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [resendTimer, setResendTimer] = useState(60);

  // Active Countdown Timer for OTP Resend
  useEffect(() => {
    if (screen === 'phone_otp_step2' || screen === 'email_otp_step2' || screen === 'forgot_otp') {
      setResendTimer(60);
      const interval = setInterval(() => {
        setResendTimer((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [screen]);

  // Forgot Password State
  const [forgotType, setForgotType] = useState<'phone' | 'email'>('phone');
  const [forgotTarget, setForgotTarget] = useState('');
  const [forgotUser, setForgotUser] = useState<UserData | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPass, setShowNewPass] = useState(false);

  // General Status State
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [duplicateTarget, setDuplicateTarget] = useState<{ type: 'phone' | 'email'; value: string } | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Custom Software Popup Date Picker States
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [tempYear, setTempYear] = useState(1998);
  const [tempMonth, setTempMonth] = useState(7); // August
  const [tempDay, setTempDay] = useState(15);

  // Android Back Navigation Handler for Auth Flow
  React.useEffect(() => {
    if (!isOpen) return;

    const unregister = registerBackHandler(() => {
      if (isDatePickerOpen) {
        setIsDatePickerOpen(false);
        return true;
      }
      if (screen !== 'login') {
        setScreen('login');
        return true;
      }
      if (!isMandatory) {
        onClose();
      }
      return true;
    });

    return () => unregister();
  }, [isOpen, isDatePickerOpen, screen, onClose]);

  if (!isOpen) return null;

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setSignupAvatar(url);
      triggerToast('Profile photo added!');
    }
  };

  // -------------------------------------------------------------
  // HANDLERS
  // -------------------------------------------------------------

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      let user: UserData;
      if (loginTab === 'phone') {
        user = await loginWithPhone(loginPhone, loginPassword);
      } else {
        user = await loginWithEmail(loginEmail, loginPassword);
      }
      triggerToast(`Welcome back, ${user.name}!`);
      sendOneSignalPush({
        title: '🔒 BINISTA Security Alert',
        body: `নতুন ডিভাইসে সফল লগইন হয়েছে (${user.name})!`,
        type: 'security',
        uid: user.uid,
      });
      onSuccessLogin(user);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setErrorMessage(null);
    setLoading(true);
    try {
      const user = await loginWithGoogle();
      triggerToast(`Welcome, ${user.name}!`);
      onSuccessLogin(user);
      onClose();
    } catch (err: any) {
      if (err.code !== 'auth/popup-closed-by-user') {
        setErrorMessage(err.message || 'Google Sign-In failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setErrorMessage(null);
    setLoading(true);
    try {
      const user = await loginAsDemoUser();
      triggerToast(`Welcome, ${user.name}!`);
      onSuccessLogin(user);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Instant login failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendPhoneOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setDuplicateTarget(null);
    if (!signupPhone) {
      setErrorMessage('Please enter a valid phone number.');
      return;
    }

    setLoading(true);
    try {
      await checkDuplicatePhone(signupPhone);
      const verifier = setupRecaptcha('recaptcha-container');
      const result = await sendFirebasePhoneOtp(signupPhone, verifier);
      setConfirmationResult(result);
      setOtpDigits(['', '', '', '', '', '']);
      setScreen('phone_otp_step2');
      triggerToast('📱 ওটিপি কোড সরাসরি আপনার ফোনের মেসেজে (SMS) পাঠানো হয়েছে!');
    } catch (err: any) {
      if (err.name === 'DuplicateAccountError' || (err.message && err.message.includes('already exists'))) {
        setDuplicateTarget({ type: 'phone', value: signupPhone });
        setErrorMessage('পূর্বে এই নাম্বার দিয়ে অ্যাকাউন্ট তৈরি করা রয়েছে। দয়া করে আপনার অ্যাকাউন্ট খুঁজুন।');
      } else {
        console.warn('Real SMS failed:', err);
        setErrorMessage(err.message || 'SMS OTP পাঠাতে ব্যর্থ হয়েছে। অনুগ্রহ করে নম্বরটি চেক করুন।');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPhoneOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    const entered = otpDigits.join('');
    if (entered.length < 6) {
      setErrorMessage('Please enter all 6 digits of the OTP code.');
      return;
    }

    setLoading(true);
    try {
      let verified = false;
      if (confirmationResult) {
        try {
          await verifyFirebasePhoneOtp(confirmationResult, entered);
          verified = true;
        } catch (firebaseErr: any) {
          console.warn('Firebase confirm failed, checking persistent store:', firebaseErr);
        }
      }

      if (!verified) {
        verified = await verifyOtpCode(signupPhone, 'phone', entered);
      }

      if (verified) {
        setScreen('phone_otp_complete');
      } else {
        throw new Error('ভুল ওটিপি কোড দেওয়া হয়েছে।');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid verification code.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmailOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setDuplicateTarget(null);
    if (!signupEmail) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      await checkDuplicateEmail(signupEmail);
      await sendOtpCode(signupEmail, 'email');
      setOtpDigits(['', '', '', '', '', '']);
      setScreen('email_otp_step2');
      triggerToast('✉️ ওটিপি কোড সরাসরি আপনার ইমেইলে পাঠানো হয়েছে!');
    } catch (err: any) {
      if (err.name === 'DuplicateAccountError' || (err.message && err.message.includes('already exists'))) {
        setDuplicateTarget({ type: 'email', value: signupEmail });
        setErrorMessage('পূর্বে এই ইমেইল দিয়ে অ্যাকাউন্ট তৈরি করা রয়েছে। দয়া করে আপনার অ্যাকাউন্ট খুঁজুন।');
      } else {
        setErrorMessage(err.message || 'Failed to send OTP code to email.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmailOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    const entered = otpDigits.join('');
    if (entered.length < 6) {
      setErrorMessage('Please enter all 6 digits of the verification code.');
      return;
    }

    setLoading(true);
    try {
      await verifyOtpCode(signupEmail, 'email', entered);
      setScreen('email_otp_complete');
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid verification code.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Validate 18+ age gate
    if (!signupDob) {
      setErrorMessage('Please select your Date of Birth.');
      return;
    }
    const age = calculateAge(signupDob);
    if (age < 18) {
      setErrorMessage('You must be at least 18 years old to create a BINISTA account.');
      return;
    }

    setLoading(true);
    try {
      const user = await createUserAccount({
        phone: signupPhone,
        email: signupEmail,
        firstName: signupFirstName,
        lastName: signupLastName,
        dob: signupDob,
        password: signupPassword,
        avatarUrl: signupAvatar || undefined,
      });

      triggerToast(`Account created successfully! Welcome, ${user.name}`);
      onSuccessLogin(user);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create account.');
    } finally {
      setLoading(false);
    }
  };

  const handleProceedToFaceScan = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!signupPhone) {
      setErrorMessage('Please enter your phone number.');
      return;
    }

    if (!signupFirstName.trim() || !signupLastName.trim()) {
      setErrorMessage('Please enter both your first and last name.');
      return;
    }

    // Validate 18+ age gate
    if (!signupDob) {
      setErrorMessage('Please select your Date of Birth.');
      return;
    }
    const age = calculateAge(signupDob);
    if (age < 18) {
      setErrorMessage('You must be at least 18 years old to create a BINISTA account.');
      return;
    }

    if (!signupPassword || signupPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    try {
      await checkDuplicatePhone(signupPhone);
      if (signupEmail) {
        await checkDuplicateEmail(signupEmail);
      }
      setScreen('no_otp_face_scan');
    } catch (err: any) {
      if (err.name === 'DuplicateAccountError' || (err.message && err.message.includes('already exists'))) {
        setDuplicateTarget({ type: 'phone', value: signupPhone });
        setErrorMessage('পূর্বে এই নাম্বার দিয়ে অ্যাকাউন্ট তৈরি করা রয়েছে। দয়া করে লগইন করুন।');
      } else {
        setErrorMessage(err.message || 'Verification error occurred.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotInputSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!forgotTarget) {
      setErrorMessage(`Please enter your ${forgotType === 'phone' ? 'phone number' : 'email address'}.`);
      return;
    }

    setLoading(true);
    try {
      const u = await findUserForReset(forgotTarget, forgotType);
      setForgotUser(u);
      await sendOtpCode(forgotTarget, forgotType);
      setOtpDigits(['', '', '', '', '', '']);
      setScreen('forgot_otp');
      triggerToast(`🔐 ভেরিফিকেশন কোড পাঠানো হয়েছে (${forgotType === 'phone' ? 'SMS' : 'Email'})`);
    } catch (err: any) {
      setErrorMessage(err.message || 'No user found.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyForgotOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    const entered = otpDigits.join('');
    if (entered.length < 6) {
      setErrorMessage('Please enter all 6 digits of the code.');
      return;
    }

    setLoading(true);
    try {
      await verifyOtpCode(forgotTarget, forgotType, entered);
      setScreen('forgot_new_pass');
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid code.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (newPassword !== confirmPassword) {
      setErrorMessage('New password and confirm password do not match.');
      return;
    }
    if (newPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    if (!forgotUser) return;

    setLoading(true);
    try {
      await resetUserPassword(forgotUser.uid, newPassword);
      triggerToast('Password reset successfully! Please log in.');
      setScreen('login');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpDigitChange = (index: number, val: string) => {
    if (val.length > 1) {
      val = val.slice(-1);
    }
    const copy = [...otpDigits];
    copy[index] = val;
    setOtpDigits(copy);

    if (val && index < 5) {
      const nextInput = document.getElementById(`otp-box-${index + 1}`);
      nextInput?.focus();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-white text-slate-900 flex items-center justify-center overflow-hidden select-none animate-in fade-in duration-200">
      {/* Invisible container for Firebase Phone Auth reCAPTCHA */}
      <div id="recaptcha-container"></div>

      {/* 100% Mobile Viewport Container */}
      <div className="w-full max-w-[430px] h-[100dvh] sm:h-[880px] sm:max-h-[920px] bg-white flex flex-col justify-between p-5 pt-4 pb-6 relative overflow-y-auto no-scrollbar sm:rounded-[40px] sm:border-[8px] sm:border-slate-900 sm:shadow-2xl">

        {/* Global Floating Toast */}
        {toastMessage && (
          <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-xs font-bold px-4 py-2.5 rounded-full shadow-2xl flex items-center gap-2 border border-white/20 animate-in slide-in-from-top-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Error Alert Box */}
        {errorMessage && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl p-3 flex flex-col gap-2 text-xs font-bold mb-2 shrink-0 animate-in shake duration-200">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span className="flex-1 leading-snug">{errorMessage}</span>
            </div>
            {duplicateTarget && (
              <button
                type="button"
                onClick={() => {
                  setForgotType(duplicateTarget.type);
                  setForgotTarget(duplicateTarget.value);
                  setErrorMessage(null);
                  setDuplicateTarget(null);
                  setScreen('forgot_input');
                }}
                className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black text-xs transition-colors cursor-pointer text-center shadow-xs"
              >
                🔍 আপনার অ্যাকাউন্ট খুঁজুন (Find Your Account)
              </button>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* SCREEN 1: LOGIN (Phone / Email)                           */}
        {/* ========================================================= */}
        {screen === 'login' && (
          <div className="flex-1 flex flex-col justify-between h-full animate-in fade-in duration-150">
            
            {/* Top Bar Header */}
            <div className="w-full flex items-center justify-between pt-1 pb-1 shrink-0">
              {!isMandatory ? (
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1 -ml-1 text-slate-800 hover:opacity-70 transition-opacity cursor-pointer"
                  aria-label="Back"
                >
                  <ChevronLeft className="w-7 h-7 stroke-[2.2]" />
                </button>
              ) : (
                <div className="w-7" />
              )}
              <span className="text-xs font-black tracking-widest text-slate-400 uppercase">BINISTA AUTH</span>
            </div>

            {/* Middle Main Content */}
            <div className="flex-1 flex flex-col justify-center my-auto space-y-3.5 sm:space-y-4 py-2">
              
              {/* Branding Header */}
              <div className="text-center shrink-0">
                <h1 className="font-extrabold text-2xl text-slate-900 tracking-tight">
                  BINISTA
                </h1>
                <h2 className="font-bold text-sm text-slate-900 mt-0.5">
                  Welcome Back
                </h2>
                <p className="text-xs text-gray-500 font-medium">
                  Sign in to your BINISTA account
                </p>
              </div>

              {/* Login Method Pills Toggle */}
              <div className="w-full bg-[#f1f5f9] p-1 rounded-2xl flex items-center gap-1 border border-slate-200/60 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setLoginTab('phone');
                    setErrorMessage(null);
                  }}
                  className={`flex-1 py-2.5 rounded-xl font-extrabold text-xs transition-all cursor-pointer ${
                    loginTab === 'phone'
                      ? 'bg-[#131b26] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Phone Number
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLoginTab('email');
                    setErrorMessage(null);
                  }}
                  className={`flex-1 py-2.5 rounded-xl font-extrabold text-xs transition-all cursor-pointer ${
                    loginTab === 'email'
                      ? 'bg-[#131b26] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Email Address
                </button>
              </div>

              {/* Login Form Inputs */}
              <form onSubmit={handleLoginSubmit} className="w-full flex flex-col gap-3 shrink-0">
                
                {loginTab === 'phone' ? (
                  <div className="bg-[#f8fafc] border border-gray-200 focus-within:border-slate-900 rounded-2xl p-3 flex items-center gap-3 transition-colors">
                    <Phone className="w-5 h-5 text-slate-500 shrink-0" />
                    <div className="flex flex-col flex-1">
                      <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        value={loginPhone}
                        onChange={(e) => setLoginPhone(e.target.value)}
                        placeholder="+880 1XXXXXXXXX"
                        className="w-full bg-transparent text-xs font-bold text-slate-900 focus:outline-none placeholder-gray-400"
                        required
                      />
                    </div>
                  </div>
                ) : (
                  <div className="bg-[#f8fafc] border border-gray-200 focus-within:border-slate-900 rounded-2xl p-3 flex items-center gap-3 transition-colors">
                    <Mail className="w-5 h-5 text-slate-500 shrink-0" />
                    <div className="flex flex-col flex-1">
                      <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full bg-transparent text-xs font-bold text-slate-900 focus:outline-none placeholder-gray-400"
                        required
                      />
                    </div>
                  </div>
                )}

                {/* Password Input */}
                <div className="bg-[#f8fafc] border border-gray-200 focus-within:border-slate-900 rounded-2xl p-3 flex items-center gap-3 transition-colors">
                  <Lock className="w-5 h-5 text-slate-500 shrink-0" />
                  <div className="flex flex-col flex-1">
                    <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">
                      Password
                    </label>
                    <input
                      type={showLoginPassword ? 'text' : 'password'}
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-transparent text-xs font-bold text-slate-900 focus:outline-none placeholder-gray-400"
                      required
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword((prev) => !prev)}
                    className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Primary Log In Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-2xl bg-[#131b26] hover:bg-slate-800 active:scale-[0.98] text-white font-extrabold text-sm shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 mt-0.5 disabled:opacity-50"
                >
                  {loading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <span>Log In</span>
                  )}
                </button>
              </form>

              {/* Instant Demo Login Button */}
              <button
                type="button"
                onClick={handleDemoLogin}
                disabled={loading}
                className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-extrabold text-xs shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2 mt-2 disabled:opacity-50 shrink-0"
              >
                <span>⚡ Instant Creator Login (এক ক্লিকে প্রবেশ)</span>
              </button>

              {/* Forgot Password Link */}
              <div className="text-center shrink-0 pt-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setErrorMessage(null);
                    setScreen('forgot_choose');
                  }}
                  className="text-xs font-extrabold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
                >
                  Forgot Password?
                </button>
              </div>

            </div>

            {/* Bottom Footer Section CTA */}
            <div className="pt-3.5 border-t border-gray-100 text-center shrink-0">
              <span className="text-xs text-gray-500 font-semibold">
                Don't have an account?{' '}
              </span>
              <button
                type="button"
                onClick={() => {
                  setErrorMessage(null);
                  setScreen('create_choose');
                }}
                className="text-xs font-extrabold text-[#0066FF] hover:underline cursor-pointer"
              >
                Create Account
              </button>
            </div>

          </div>
        )}

        {/* ========================================================= */}
        {/* SCREEN 2: CREATE ACCOUNT (Choose Method - 3 Cards)        */}
        {/* ========================================================= */}
        {screen === 'create_choose' && (
          <div className="flex-1 flex flex-col justify-between h-full animate-in fade-in duration-150">
            
            <div className="w-full flex items-center justify-between pt-1 pb-2 border-b border-gray-100 shrink-0">
              <button
                type="button"
                onClick={() => setScreen('login')}
                className="p-1 -ml-1 text-slate-800 hover:opacity-70 transition-opacity cursor-pointer"
              >
                <ChevronLeft className="w-7 h-7 stroke-[2.2]" />
              </button>
              <h1 className="font-extrabold text-base text-slate-900 tracking-tight">
                BINISTA
              </h1>
              <div className="w-7" />
            </div>

            <div className="flex-1 flex flex-col justify-center my-auto py-3 space-y-4">
              <div className="text-left shrink-0">
                <h2 className="font-extrabold text-xl text-slate-900 leading-tight">
                  Create Account
                </h2>
                <p className="text-xs text-gray-500 font-medium mt-1">
                  Choose how you want to create your account
                </p>
              </div>

              {/* 3 Selection Cards */}
              <div className="flex flex-col gap-3 shrink-0">
                
                {/* Card 1: Phone + OTP */}
                <button
                  type="button"
                  onClick={() => {
                    setErrorMessage(null);
                    setScreen('phone_otp_step1');
                  }}
                  className="w-full p-4 rounded-2xl bg-white border border-gray-200 hover:border-slate-900 hover:bg-slate-50 transition-all text-left flex items-center justify-between cursor-pointer group shadow-2xs"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="p-3 bg-slate-100 group-hover:bg-slate-200 rounded-xl text-slate-900 transition-colors">
                      <Phone className="w-5 h-5 stroke-[2.2]" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm text-slate-900">
                        Phone Number + OTP
                      </h3>
                      <p className="text-xs text-gray-500 font-medium">
                        Quick and secure
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-slate-900 transition-colors" />
                </button>

                {/* Card 2: Email + OTP */}
                <button
                  type="button"
                  onClick={() => {
                    setErrorMessage(null);
                    setScreen('email_otp_step1');
                  }}
                  className="w-full p-4 rounded-2xl bg-white border border-gray-200 hover:border-slate-900 hover:bg-slate-50 transition-all text-left flex items-center justify-between cursor-pointer group shadow-2xs"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="p-3 bg-slate-100 group-hover:bg-slate-200 rounded-xl text-slate-900 transition-colors">
                      <Mail className="w-5 h-5 stroke-[2.2]" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm text-slate-900">
                        Email + OTP
                      </h3>
                      <p className="text-xs text-gray-500 font-medium">
                        Secure and reliable
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-slate-900 transition-colors" />
                </button>

                {/* Card 3: Phone (No OTP) */}
                <button
                  type="button"
                  onClick={() => {
                    setErrorMessage(null);
                    setScreen('no_otp_signup');
                  }}
                  className="w-full p-4 rounded-2xl bg-white border border-gray-200 hover:border-slate-900 hover:bg-slate-50 transition-all text-left flex items-center justify-between cursor-pointer group shadow-2xs"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="p-3 bg-slate-100 group-hover:bg-slate-200 rounded-xl text-slate-900 transition-colors flex items-center gap-1">
                      <Smartphone className="w-5 h-5 stroke-[2.2]" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm text-slate-900">
                        Phone Number (Face Scan)
                      </h3>
                      <p className="text-xs text-gray-500 font-medium">
                        Auto Face Scan • No OTP required
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-slate-900 transition-colors" />
                </button>

              </div>
            </div>

            {/* Bottom Footer */}
            <div className="pt-3.5 border-t border-gray-100 text-center shrink-0">
              <span className="text-xs text-gray-500 font-semibold">
                Already have an account?{' '}
              </span>
              <button
                type="button"
                onClick={() => setScreen('login')}
                className="text-xs font-extrabold text-[#0066FF] hover:underline cursor-pointer"
              >
                Log In
              </button>
            </div>

          </div>
        )}

        {/* ========================================================= */}
        {/* SCREEN 3: PHONE + OTP (Step 1 - Enter Phone)              */}
        {/* ========================================================= */}
        {screen === 'phone_otp_step1' && (
          <form onSubmit={handleSendPhoneOtp} className="flex-1 flex flex-col justify-between h-full animate-in fade-in duration-150">
            <div className="w-full flex items-center justify-between pt-1 pb-2 border-b border-gray-100 shrink-0">
              <button
                type="button"
                onClick={() => setScreen('create_choose')}
                className="p-1 -ml-1 text-slate-800 hover:opacity-70 transition-opacity cursor-pointer"
              >
                <ChevronLeft className="w-7 h-7 stroke-[2.2]" />
              </button>
              <h1 className="font-extrabold text-base text-slate-900 tracking-tight">
                BINISTA
              </h1>
              <div className="w-7" />
            </div>

            <div className="flex-1 flex flex-col justify-center my-auto py-3 space-y-4">
              <div className="shrink-0">
                <h2 className="font-extrabold text-xl text-slate-900 leading-tight">
                  Create Account
                </h2>
                <p className="text-xs text-gray-500 font-medium mt-1">
                  Enter your phone number
                </p>
              </div>

              <div className="bg-[#f8fafc] border border-gray-200 focus-within:border-slate-900 rounded-2xl p-3 flex items-center gap-3 transition-colors shrink-0">
                <Phone className="w-5 h-5 text-slate-500 shrink-0" />
                <div className="flex flex-col flex-1">
                  <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={signupPhone}
                    onChange={(e) => setSignupPhone(e.target.value)}
                    placeholder="+880 1XXXXXXXXX"
                    className="w-full bg-transparent text-xs font-bold text-slate-900 focus:outline-none placeholder-gray-400"
                    required
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-2xl bg-[#131b26] hover:bg-slate-800 text-white font-extrabold text-sm shadow-md transition-all cursor-pointer text-center flex items-center justify-center gap-2 shrink-0"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>Continue</span>}
            </button>
          </form>
        )}

        {/* ========================================================= */}
        {/* SCREEN 4: PHONE + OTP (Step 2 - Verify OTP)              */}
        {/* ========================================================= */}
        {screen === 'phone_otp_step2' && (
          <form onSubmit={handleVerifyPhoneOtp} className="flex-1 flex flex-col justify-between h-full animate-in fade-in duration-150">
            <div className="w-full flex items-center justify-between pt-1 pb-2 border-b border-gray-100 shrink-0">
              <button
                type="button"
                onClick={() => setScreen('phone_otp_step1')}
                className="p-1 -ml-1 text-slate-800 hover:opacity-70 transition-opacity cursor-pointer"
              >
                <ChevronLeft className="w-7 h-7 stroke-[2.2]" />
              </button>
              <h1 className="font-extrabold text-base text-slate-900 tracking-tight">
                BINISTA
              </h1>
              <div className="w-7" />
            </div>

            <div className="flex-1 flex flex-col justify-center my-auto py-3 space-y-4">
              <div className="shrink-0">
                <h2 className="font-extrabold text-xl text-slate-900 leading-tight">
                  Verify OTP
                </h2>
                <p className="text-xs text-gray-500 font-medium mt-1">
                  We've sent a 6 digit code to {formatPhone(signupPhone)}
                </p>
              </div>

              {/* 6 Digit Input Boxes */}
              <div className="flex items-center justify-between gap-2 shrink-0">
                {otpDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    id={`otp-box-${idx}`}
                    type="text"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpDigitChange(idx, e.target.value)}
                    className="w-11 h-12 rounded-xl border border-gray-200 text-center font-black text-lg text-slate-900 focus:outline-none focus:border-slate-900 bg-[#f8fafc]"
                  />
                ))}
              </div>

              <div className="text-center shrink-0 pt-2">
                <button
                  type="button"
                  disabled={resendTimer > 0 || loading}
                  onClick={async (e) => {
                    if (resendTimer > 0) return;
                    await handleSendPhoneOtp(e);
                  }}
                  className={`text-xs font-bold transition-colors ${
                    resendTimer > 0
                      ? 'text-gray-400 cursor-not-allowed'
                      : 'text-slate-900 hover:underline cursor-pointer'
                  }`}
                >
                  {resendTimer > 0
                    ? `Resend code in 00:${resendTimer < 10 ? '0' + resendTimer : resendTimer}`
                    : 'Resend Code'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-2xl bg-[#131b26] hover:bg-slate-800 text-white font-extrabold text-sm shadow-md transition-all cursor-pointer text-center flex items-center justify-center gap-2 shrink-0"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>Verify</span>}
            </button>
          </form>
        )}

        {/* ========================================================= */}
        {/* SCREEN 5: PHONE + OTP (Complete Profile)                  */}
        {/* ========================================================= */}
        {screen === 'phone_otp_complete' && (
          <form onSubmit={handleCreateAccountSubmit} className="flex-1 flex flex-col justify-between h-full animate-in fade-in duration-150">
            <div className="w-full flex items-center justify-between pt-1 pb-2 border-b border-gray-100 shrink-0">
              <button
                type="button"
                onClick={() => setScreen('phone_otp_step2')}
                className="p-1 -ml-1 text-slate-800 hover:opacity-70 transition-opacity cursor-pointer"
              >
                <ChevronLeft className="w-7 h-7 stroke-[2.2]" />
              </button>
              <h1 className="font-extrabold text-base text-slate-900 tracking-tight">
                BINISTA
              </h1>
              <div className="w-7" />
            </div>

            <div className="flex-1 flex flex-col justify-center my-auto py-2 space-y-3">
              <div className="shrink-0">
                <h2 className="font-extrabold text-xl text-slate-900 leading-tight">
                  Complete Your Profile
                </h2>
                <p className="text-xs text-gray-500 font-medium mt-0.5">
                  Add a few details to get started
                </p>
              </div>

              {/* Photo Upload Circle */}
              <div className="flex flex-col items-center justify-center shrink-0">
                <div className="relative">
                  <img
                    src={
                      signupAvatar ||
                      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80'
                    }
                    alt="Avatar"
                    className="w-16 h-16 rounded-full object-cover shadow-sm border border-gray-200"
                  />
                  <label
                    htmlFor="signup-photo-input"
                    className="absolute bottom-0 right-0 w-6 h-6 bg-slate-900 text-white rounded-full flex items-center justify-center border-2 border-white shadow-sm cursor-pointer"
                  >
                    <Camera className="w-3 h-3" />
                    <input
                      id="signup-photo-input"
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      className="hidden"
                    />
                  </label>
                </div>
                <span className="text-[11px] font-bold text-gray-500 mt-1">
                  Add Photo (Optional)
                </span>
              </div>

              {/* Form Input Fields */}
              <div className="flex flex-col gap-2 shrink-0">
                <div className="bg-[#f8fafc] border border-gray-200 focus-within:border-slate-900 rounded-2xl p-2.5 flex items-center gap-2.5">
                  <User className="w-4 h-4 text-slate-500 shrink-0" />
                  <div className="flex flex-col flex-1">
                    <label className="text-[9px] font-extrabold text-gray-400 uppercase">First Name</label>
                    <input
                      type="text"
                      value={signupFirstName}
                      onChange={(e) => setSignupFirstName(e.target.value)}
                      placeholder="Your first name"
                      className="w-full bg-transparent text-xs font-bold text-slate-900 focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <div className="bg-[#f8fafc] border border-gray-200 focus-within:border-slate-900 rounded-2xl p-2.5 flex items-center gap-2.5">
                  <User className="w-4 h-4 text-slate-500 shrink-0" />
                  <div className="flex flex-col flex-1">
                    <label className="text-[9px] font-extrabold text-gray-400 uppercase">Last Name</label>
                    <input
                      type="text"
                      value={signupLastName}
                      onChange={(e) => setSignupLastName(e.target.value)}
                      placeholder="Your last name"
                      className="w-full bg-transparent text-xs font-bold text-slate-900 focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <div
                  onClick={() => setIsDatePickerOpen(true)}
                  className="bg-[#f8fafc] border border-gray-200 hover:border-slate-900 rounded-2xl p-2.5 flex items-center justify-between gap-2.5 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2.5 flex-1">
                    <Calendar className="w-4 h-4 text-slate-500 shrink-0" />
                    <div className="flex flex-col flex-1">
                      <span className="text-[9px] font-extrabold text-gray-400 uppercase">Date of Birth</span>
                      <span className={`text-xs font-bold ${signupDob ? 'text-slate-900' : 'text-gray-400'}`}>
                        {signupDob ? signupDob : 'Select Date of Birth'}
                      </span>
                    </div>
                  </div>
                  <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
                </div>
                <span className="text-[10px] text-gray-400 font-medium -mt-1 ml-1">
                  You must be at least 18 years old
                </span>

                <div className="bg-[#f8fafc] border border-gray-200 focus-within:border-slate-900 rounded-2xl p-2.5 flex items-center gap-2.5">
                  <Lock className="w-4 h-4 text-slate-500 shrink-0" />
                  <div className="flex flex-col flex-1">
                    <label className="text-[9px] font-extrabold text-gray-400 uppercase">Password</label>
                    <input
                      type={showSignupPassword ? 'text' : 'password'}
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      placeholder="Min. 6 characters"
                      className="w-full bg-transparent text-xs font-bold text-slate-900 focus:outline-none"
                      required
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowSignupPassword((prev) => !prev)}
                    className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    {showSignupPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-2xl bg-[#131b26] hover:bg-slate-800 text-white font-extrabold text-sm shadow-md transition-all cursor-pointer text-center flex items-center justify-center gap-2 shrink-0"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>Create Account</span>}
            </button>
          </form>
        )}

        {/* ========================================================= */}
        {/* SCREEN 6: EMAIL + OTP (Step 1 - Enter Email)              */}
        {/* ========================================================= */}
        {screen === 'email_otp_step1' && (
          <form onSubmit={handleSendEmailOtp} className="flex-1 flex flex-col justify-between h-full animate-in fade-in duration-150">
            <div className="w-full flex items-center justify-between pt-1 pb-2 border-b border-gray-100 shrink-0">
              <button
                type="button"
                onClick={() => setScreen('create_choose')}
                className="p-1 -ml-1 text-slate-800 hover:opacity-70 transition-opacity cursor-pointer"
              >
                <ChevronLeft className="w-7 h-7 stroke-[2.2]" />
              </button>
              <h1 className="font-extrabold text-base text-slate-900 tracking-tight">
                BINISTA
              </h1>
              <div className="w-7" />
            </div>

            <div className="flex-1 flex flex-col justify-center my-auto py-3 space-y-4">
              <div className="shrink-0">
                <h2 className="font-extrabold text-xl text-slate-900 leading-tight">
                  Create Account
                </h2>
                <p className="text-xs text-gray-500 font-medium mt-1">
                  Enter your email address
                </p>
              </div>

              <div className="bg-[#f8fafc] border border-gray-200 focus-within:border-slate-900 rounded-2xl p-3 flex items-center gap-3 transition-colors shrink-0">
                <Mail className="w-5 h-5 text-slate-500 shrink-0" />
                <div className="flex flex-col flex-1">
                  <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full bg-transparent text-xs font-bold text-slate-900 focus:outline-none placeholder-gray-400"
                    required
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-2xl bg-[#131b26] hover:bg-slate-800 text-white font-extrabold text-sm shadow-md transition-all cursor-pointer text-center flex items-center justify-center gap-2 shrink-0"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>Continue</span>}
            </button>
          </form>
        )}

        {/* ========================================================= */}
        {/* SCREEN 7: EMAIL + OTP (Step 2 - Verify OTP)              */}
        {/* ========================================================= */}
        {screen === 'email_otp_step2' && (
          <form onSubmit={handleVerifyEmailOtp} className="flex-1 flex flex-col justify-between h-full animate-in fade-in duration-150">
            <div className="w-full flex items-center justify-between pt-1 pb-2 border-b border-gray-100 shrink-0">
              <button
                type="button"
                onClick={() => setScreen('email_otp_step1')}
                className="p-1 -ml-1 text-slate-800 hover:opacity-70 transition-opacity cursor-pointer"
              >
                <ChevronLeft className="w-7 h-7 stroke-[2.2]" />
              </button>
              <h1 className="font-extrabold text-base text-slate-900 tracking-tight">
                BINISTA
              </h1>
              <div className="w-7" />
            </div>

            <div className="flex-1 flex flex-col justify-center my-auto py-3 space-y-4">
              <div className="shrink-0">
                <h2 className="font-extrabold text-xl text-slate-900 leading-tight">
                  Verify OTP
                </h2>
                <p className="text-xs text-gray-500 font-medium mt-1">
                  We've sent a 6 digit code to {signupEmail}
                </p>
              </div>

              <div className="flex items-center justify-between gap-2 shrink-0">
                {otpDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    id={`otp-box-${idx}`}
                    type="text"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpDigitChange(idx, e.target.value)}
                    className="w-11 h-12 rounded-xl border border-gray-200 text-center font-black text-lg text-slate-900 focus:outline-none focus:border-slate-900 bg-[#f8fafc]"
                  />
                ))}
              </div>

              <div className="text-center shrink-0 pt-2">
                <button
                  type="button"
                  disabled={resendTimer > 0 || loading}
                  onClick={async (e) => {
                    if (resendTimer > 0) return;
                    await handleSendEmailOtp(e);
                  }}
                  className={`text-xs font-bold transition-colors ${
                    resendTimer > 0
                      ? 'text-gray-400 cursor-not-allowed'
                      : 'text-slate-900 hover:underline cursor-pointer'
                  }`}
                >
                  {resendTimer > 0
                    ? `Resend code in 00:${resendTimer < 10 ? '0' + resendTimer : resendTimer}`
                    : 'Resend Code'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-2xl bg-[#131b26] hover:bg-slate-800 text-white font-extrabold text-sm shadow-md transition-all cursor-pointer text-center flex items-center justify-center gap-2 shrink-0"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>Verify</span>}
            </button>
          </form>
        )}

        {/* ========================================================= */}
        {/* SCREEN 8: EMAIL + OTP (Complete Profile)                  */}
        {/* ========================================================= */}
        {screen === 'email_otp_complete' && (
          <form onSubmit={handleCreateAccountSubmit} className="flex-1 flex flex-col justify-between h-full animate-in fade-in duration-150">
            <div className="w-full flex items-center justify-between pt-1 pb-2 border-b border-gray-100 shrink-0">
              <button
                type="button"
                onClick={() => setScreen('email_otp_step2')}
                className="p-1 -ml-1 text-slate-800 hover:opacity-70 transition-opacity cursor-pointer"
              >
                <ChevronLeft className="w-7 h-7 stroke-[2.2]" />
              </button>
              <h1 className="font-extrabold text-base text-slate-900 tracking-tight">
                BINISTA
              </h1>
              <div className="w-7" />
            </div>

            <div className="flex-1 flex flex-col justify-center my-auto py-2 space-y-3">
              <div className="shrink-0">
                <h2 className="font-extrabold text-xl text-slate-900 leading-tight">
                  Complete Your Profile
                </h2>
                <p className="text-xs text-gray-500 font-medium mt-0.5">
                  Add a few details to get started
                </p>
              </div>

              <div className="flex flex-col items-center justify-center shrink-0">
                <div className="relative">
                  <img
                    src={
                      signupAvatar ||
                      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80'
                    }
                    alt="Avatar"
                    className="w-16 h-16 rounded-full object-cover shadow-sm border border-gray-200"
                  />
                  <label
                    htmlFor="signup-photo-input-2"
                    className="absolute bottom-0 right-0 w-6 h-6 bg-slate-900 text-white rounded-full flex items-center justify-center border-2 border-white shadow-sm cursor-pointer"
                  >
                    <Camera className="w-3 h-3" />
                    <input
                      id="signup-photo-input-2"
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      className="hidden"
                    />
                  </label>
                </div>
                <span className="text-[11px] font-bold text-gray-500 mt-1">
                  Add Photo (Optional)
                </span>
              </div>

              <div className="flex flex-col gap-2 shrink-0">
                <div className="bg-[#f8fafc] border border-gray-200 focus-within:border-slate-900 rounded-2xl p-2.5 flex items-center gap-2.5">
                  <User className="w-4 h-4 text-slate-500 shrink-0" />
                  <div className="flex flex-col flex-1">
                    <label className="text-[9px] font-extrabold text-gray-400 uppercase">First Name</label>
                    <input
                      type="text"
                      value={signupFirstName}
                      onChange={(e) => setSignupFirstName(e.target.value)}
                      placeholder="Your first name"
                      className="w-full bg-transparent text-xs font-bold text-slate-900 focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <div className="bg-[#f8fafc] border border-gray-200 focus-within:border-slate-900 rounded-2xl p-2.5 flex items-center gap-2.5">
                  <User className="w-4 h-4 text-slate-500 shrink-0" />
                  <div className="flex flex-col flex-1">
                    <label className="text-[9px] font-extrabold text-gray-400 uppercase">Last Name</label>
                    <input
                      type="text"
                      value={signupLastName}
                      onChange={(e) => setSignupLastName(e.target.value)}
                      placeholder="Your last name"
                      className="w-full bg-transparent text-xs font-bold text-slate-900 focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <div
                  onClick={() => setIsDatePickerOpen(true)}
                  className="bg-[#f8fafc] border border-gray-200 hover:border-slate-900 rounded-2xl p-2.5 flex items-center justify-between gap-2.5 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2.5 flex-1">
                    <Calendar className="w-4 h-4 text-slate-500 shrink-0" />
                    <div className="flex flex-col flex-1">
                      <span className="text-[9px] font-extrabold text-gray-400 uppercase">Date of Birth</span>
                      <span className={`text-xs font-bold ${signupDob ? 'text-slate-900' : 'text-gray-400'}`}>
                        {signupDob ? signupDob : 'Select Date of Birth'}
                      </span>
                    </div>
                  </div>
                  <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
                </div>
                <span className="text-[10px] text-gray-400 font-medium -mt-1 ml-1">
                  You must be at least 18 years old
                </span>

                <div className="bg-[#f8fafc] border border-gray-200 focus-within:border-slate-900 rounded-2xl p-2.5 flex items-center gap-2.5">
                  <Lock className="w-4 h-4 text-slate-500 shrink-0" />
                  <div className="flex flex-col flex-1">
                    <label className="text-[9px] font-extrabold text-gray-400 uppercase">Password</label>
                    <input
                      type={showSignupPassword ? 'text' : 'password'}
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      placeholder="Min. 6 characters"
                      className="w-full bg-transparent text-xs font-bold text-slate-900 focus:outline-none"
                      required
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowSignupPassword((prev) => !prev)}
                    className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    {showSignupPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-2xl bg-[#131b26] hover:bg-slate-800 text-white font-extrabold text-sm shadow-md transition-all cursor-pointer text-center flex items-center justify-center gap-2 shrink-0"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>Create Account</span>}
            </button>
          </form>
        )}

        {/* ========================================================= */}
        {/* SCREEN 9: PHONE + EMAIL (NO OTP SIGNUP)                   */}
        {/* ========================================================= */}
        {screen === 'no_otp_signup' && (
          <form onSubmit={handleProceedToFaceScan} className="flex-1 flex flex-col justify-between h-full animate-in fade-in duration-150">
            <div className="w-full flex items-center justify-between pt-1 pb-2 border-b border-gray-100 shrink-0">
              <button
                type="button"
                onClick={() => setScreen('create_choose')}
                className="p-1 -ml-1 text-slate-800 hover:opacity-70 transition-opacity cursor-pointer"
              >
                <ChevronLeft className="w-7 h-7 stroke-[2.2]" />
              </button>
              <h1 className="font-extrabold text-base text-slate-900 tracking-tight">
                BINISTA
              </h1>
              <div className="w-7" />
            </div>

            <div className="flex-1 flex flex-col justify-center my-auto py-2 space-y-2">
              <div className="shrink-0">
                <h2 className="font-extrabold text-xl text-slate-900 leading-tight">
                  Create Account
                </h2>
                <p className="text-xs text-gray-500 font-medium mt-0.5">
                  Enter your details (Face verification required)
                </p>
              </div>

              {/* Form Input Fields */}
              <div className="flex flex-col gap-2 shrink-0">
                <div className="bg-[#f8fafc] border border-gray-200 focus-within:border-slate-900 rounded-2xl p-2.5 flex items-center gap-2.5">
                  <Phone className="w-4 h-4 text-slate-500 shrink-0" />
                  <div className="flex flex-col flex-1">
                    <label className="text-[9px] font-extrabold text-gray-400 uppercase">Phone Number</label>
                    <input
                      type="tel"
                      value={signupPhone}
                      onChange={(e) => setSignupPhone(e.target.value)}
                      placeholder="+880 1XXXXXXXXX"
                      className="w-full bg-transparent text-xs font-bold text-slate-900 focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <div className="bg-[#f8fafc] border border-gray-200 focus-within:border-slate-900 rounded-2xl p-2.5 flex items-center gap-2.5">
                  <Mail className="w-4 h-4 text-slate-500 shrink-0" />
                  <div className="flex flex-col flex-1">
                    <label className="text-[9px] font-extrabold text-gray-400 uppercase">Email Address (Optional)</label>
                    <input
                      type="email"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      placeholder="you@example.com (optional)"
                      className="w-full bg-transparent text-xs font-bold text-slate-900 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="bg-[#f8fafc] border border-gray-200 focus-within:border-slate-900 rounded-2xl p-2.5 flex items-center gap-2.5">
                  <User className="w-4 h-4 text-slate-500 shrink-0" />
                  <div className="flex flex-col flex-1">
                    <label className="text-[9px] font-extrabold text-gray-400 uppercase">First Name</label>
                    <input
                      type="text"
                      value={signupFirstName}
                      onChange={(e) => setSignupFirstName(e.target.value)}
                      placeholder="Your first name"
                      className="w-full bg-transparent text-xs font-bold text-slate-900 focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <div className="bg-[#f8fafc] border border-gray-200 focus-within:border-slate-900 rounded-2xl p-2.5 flex items-center gap-2.5">
                  <User className="w-4 h-4 text-slate-500 shrink-0" />
                  <div className="flex flex-col flex-1">
                    <label className="text-[9px] font-extrabold text-gray-400 uppercase">Last Name</label>
                    <input
                      type="text"
                      value={signupLastName}
                      onChange={(e) => setSignupLastName(e.target.value)}
                      placeholder="Your last name"
                      className="w-full bg-transparent text-xs font-bold text-slate-900 focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <div
                  onClick={() => setIsDatePickerOpen(true)}
                  className="bg-[#f8fafc] border border-gray-200 hover:border-slate-900 rounded-2xl p-2.5 flex items-center justify-between gap-2.5 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2.5 flex-1">
                    <Calendar className="w-4 h-4 text-slate-500 shrink-0" />
                    <div className="flex flex-col flex-1">
                      <span className="text-[9px] font-extrabold text-gray-400 uppercase">Date of Birth</span>
                      <span className={`text-xs font-bold ${signupDob ? 'text-slate-900' : 'text-gray-400'}`}>
                        {signupDob ? signupDob : 'Select Date of Birth'}
                      </span>
                    </div>
                  </div>
                  <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
                </div>
                <span className="text-[10px] text-gray-400 font-medium -mt-1 ml-1">
                  You must be at least 18 years old
                </span>

                <div className="bg-[#f8fafc] border border-gray-200 focus-within:border-slate-900 rounded-2xl p-2.5 flex items-center gap-2.5">
                  <Lock className="w-4 h-4 text-slate-500 shrink-0" />
                  <div className="flex flex-col flex-1">
                    <label className="text-[9px] font-extrabold text-gray-400 uppercase">Password</label>
                    <input
                      type={showSignupPassword ? 'text' : 'password'}
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      placeholder="Min. 6 characters"
                      className="w-full bg-transparent text-xs font-bold text-slate-900 focus:outline-none"
                      required
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowSignupPassword((prev) => !prev)}
                    className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    {showSignupPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-2xl bg-[#131b26] hover:bg-slate-800 text-white font-extrabold text-sm shadow-md transition-all cursor-pointer text-center flex items-center justify-center gap-2 shrink-0"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <div className="flex items-center gap-2">
                  <Camera className="w-4 h-4 text-emerald-400" />
                  <span>পরবর্তী: ফেস ভেরিফিকেশন (Next: Face Scan)</span>
                </div>
              )}
            </button>
          </form>
        )}

        {/* ========================================================= */}
        {/* SCREEN: AUTOMATIC FACE SCAN & AUTO CAPTURE VERIFICATION  */}
        {/* ========================================================= */}
        {screen === 'no_otp_face_scan' && (
          <FaceScanVerification
            userName={`${signupFirstName} ${signupLastName}`.trim()}
            onCancel={() => {
              setScreen('no_otp_signup');
            }}
            onSuccess={async (photoDataUrl) => {
              setSignupAvatar(photoDataUrl);
              setLoading(true);
              try {
                const user = await createUserAccount({
                  phone: signupPhone,
                  email: signupEmail,
                  firstName: signupFirstName,
                  lastName: signupLastName,
                  dob: signupDob,
                  password: signupPassword,
                  avatarUrl: photoDataUrl,
                });

                triggerToast(`Face Verification সফল! স্বাগতম, ${user.name}`);
                onSuccessLogin(user);
                onClose();
              } catch (err: any) {
                setErrorMessage(err.message || 'অ্যাকাউন্ট তৈরি করতে ব্যর্থ হয়েছে।');
                setScreen('no_otp_signup');
              } finally {
                setLoading(false);
              }
            }}
          />
        )}

        {/* ========================================================= */}
        {/* SCREEN 10: FORGOT PASSWORD (Choose Method)                */}
        {/* ========================================================= */}
        {screen === 'forgot_choose' && (
          <div className="flex-1 flex flex-col justify-between h-full animate-in fade-in duration-150">
            <div className="w-full flex items-center justify-between pt-1 pb-2 border-b border-gray-100 shrink-0">
              <button
                type="button"
                onClick={() => setScreen('login')}
                className="p-1 -ml-1 text-slate-800 hover:opacity-70 transition-opacity cursor-pointer"
              >
                <ChevronLeft className="w-7 h-7 stroke-[2.2]" />
              </button>
              <h1 className="font-extrabold text-base text-slate-900 tracking-tight">
                BINISTA
              </h1>
              <div className="w-7" />
            </div>

            <div className="flex-1 flex flex-col justify-center my-auto py-3 space-y-4">
              <div className="shrink-0">
                <h2 className="font-extrabold text-xl text-slate-900 leading-tight">
                  Reset Password
                </h2>
                <p className="text-xs text-gray-500 font-medium mt-1">
                  Choose how you want to receive the reset code
                </p>
              </div>

              <div className="flex flex-col gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setForgotType('phone');
                    setForgotTarget('');
                    setErrorMessage(null);
                    setScreen('forgot_input');
                  }}
                  className="w-full p-4 rounded-2xl bg-white border border-gray-200 hover:border-slate-900 hover:bg-slate-50 transition-all text-left flex items-center justify-between cursor-pointer group shadow-2xs"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="p-3 bg-slate-100 group-hover:bg-slate-200 rounded-xl text-slate-900 transition-colors">
                      <Phone className="w-5 h-5 stroke-[2.2]" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm text-slate-900">
                        Phone Number
                      </h3>
                      <p className="text-xs text-gray-500 font-medium">
                        Send code via SMS
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-slate-900 transition-colors" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setForgotType('email');
                    setForgotTarget('');
                    setErrorMessage(null);
                    setScreen('forgot_input');
                  }}
                  className="w-full p-4 rounded-2xl bg-white border border-gray-200 hover:border-slate-900 hover:bg-slate-50 transition-all text-left flex items-center justify-between cursor-pointer group shadow-2xs"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="p-3 bg-slate-100 group-hover:bg-slate-200 rounded-xl text-slate-900 transition-colors">
                      <Mail className="w-5 h-5 stroke-[2.2]" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm text-slate-900">
                        Email Address
                      </h3>
                      <p className="text-xs text-gray-500 font-medium">
                        Send code via Email
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-slate-900 transition-colors" />
                </button>
              </div>
            </div>

            <div className="pt-3.5 border-t border-gray-100 text-center shrink-0">
              <button
                type="button"
                onClick={() => setScreen('login')}
                className="text-xs font-extrabold text-[#0066FF] hover:underline cursor-pointer"
              >
                Back to Log In
              </button>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* SCREEN 11: FORGOT PASSWORD (Target Input)                 */}
        {/* ========================================================= */}
        {screen === 'forgot_input' && (
          <form onSubmit={handleForgotInputSubmit} className="flex-1 flex flex-col justify-between h-full animate-in fade-in duration-150">
            <div className="w-full flex items-center justify-between pt-1 pb-2 border-b border-gray-100 shrink-0">
              <button
                type="button"
                onClick={() => setScreen('forgot_choose')}
                className="p-1 -ml-1 text-slate-800 hover:opacity-70 transition-opacity cursor-pointer"
              >
                <ChevronLeft className="w-7 h-7 stroke-[2.2]" />
              </button>
              <h1 className="font-extrabold text-base text-slate-900 tracking-tight">
                BINISTA
              </h1>
              <div className="w-7" />
            </div>

            <div className="flex-1 flex flex-col justify-center my-auto py-3 space-y-4">
              <div className="shrink-0">
                <h2 className="font-extrabold text-xl text-slate-900 leading-tight">
                  Reset Password
                </h2>
                <p className="text-xs text-gray-500 font-medium mt-1">
                  Enter your {forgotType === 'phone' ? 'phone number' : 'email address'}
                </p>
              </div>

              <div className="bg-[#f8fafc] border border-gray-200 focus-within:border-slate-900 rounded-2xl p-3 flex items-center gap-3 transition-colors shrink-0">
                {forgotType === 'phone' ? (
                  <Phone className="w-5 h-5 text-slate-500 shrink-0" />
                ) : (
                  <Mail className="w-5 h-5 text-slate-500 shrink-0" />
                )}
                <div className="flex flex-col flex-1">
                  <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">
                    {forgotType === 'phone' ? 'Phone Number' : 'Email Address'}
                  </label>
                  <input
                    type={forgotType === 'phone' ? 'tel' : 'email'}
                    value={forgotTarget}
                    onChange={(e) => setForgotTarget(e.target.value)}
                    placeholder={forgotType === 'phone' ? '+880 1XXXXXXXXX' : 'you@example.com'}
                    className="w-full bg-transparent text-xs font-bold text-slate-900 focus:outline-none placeholder-gray-400"
                    required
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-2xl bg-[#131b26] hover:bg-slate-800 text-white font-extrabold text-sm shadow-md transition-all cursor-pointer text-center flex items-center justify-center gap-2 shrink-0"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>Continue</span>}
            </button>
          </form>
        )}

        {/* ========================================================= */}
        {/* SCREEN 12: FORGOT PASSWORD (Verify Code)                 */}
        {/* ========================================================= */}
        {screen === 'forgot_otp' && (
          <form onSubmit={handleVerifyForgotOtp} className="flex-1 flex flex-col justify-between h-full animate-in fade-in duration-150">
            <div className="w-full flex items-center justify-between pt-1 pb-2 border-b border-gray-100 shrink-0">
              <button
                type="button"
                onClick={() => setScreen('forgot_input')}
                className="p-1 -ml-1 text-slate-800 hover:opacity-70 transition-opacity cursor-pointer"
              >
                <ChevronLeft className="w-7 h-7 stroke-[2.2]" />
              </button>
              <h1 className="font-extrabold text-base text-slate-900 tracking-tight">
                BINISTA
              </h1>
              <div className="w-7" />
            </div>

            <div className="flex-1 flex flex-col justify-center my-auto py-3 space-y-4">
              <div className="shrink-0">
                <h2 className="font-extrabold text-xl text-slate-900 leading-tight">
                  Verify Code
                </h2>
                <p className="text-xs text-gray-500 font-medium mt-1">
                  We've sent a 6 digit code to {forgotTarget}
                </p>
              </div>

              <div className="flex items-center justify-between gap-2 shrink-0">
                {otpDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    id={`otp-box-${idx}`}
                    type="text"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpDigitChange(idx, e.target.value)}
                    className="w-11 h-12 rounded-xl border border-gray-200 text-center font-black text-lg text-slate-900 focus:outline-none focus:border-slate-900 bg-[#f8fafc]"
                  />
                ))}
              </div>

              <div className="text-center shrink-0 pt-2">
                <button
                  type="button"
                  disabled={resendTimer > 0 || loading}
                  onClick={async (e) => {
                    if (resendTimer > 0) return;
                    await handleForgotInputSubmit(e);
                  }}
                  className={`text-xs font-bold transition-colors ${
                    resendTimer > 0
                      ? 'text-gray-400 cursor-not-allowed'
                      : 'text-slate-900 hover:underline cursor-pointer'
                  }`}
                >
                  {resendTimer > 0
                    ? `Resend code in 00:${resendTimer < 10 ? '0' + resendTimer : resendTimer}`
                    : 'Resend Code'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-2xl bg-[#131b26] hover:bg-slate-800 text-white font-extrabold text-sm shadow-md transition-all cursor-pointer text-center flex items-center justify-center gap-2 shrink-0"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>Verify</span>}
            </button>
          </form>
        )}

        {/* ========================================================= */}
        {/* SCREEN 13: FORGOT PASSWORD (Set New Password)            */}
        {/* ========================================================= */}
        {screen === 'forgot_new_pass' && (
          <form onSubmit={handleResetPasswordSubmit} className="flex-1 flex flex-col justify-between h-full animate-in fade-in duration-150">
            <div className="w-full flex items-center justify-between pt-1 pb-2 border-b border-gray-100 shrink-0">
              <button
                type="button"
                onClick={() => setScreen('forgot_otp')}
                className="p-1 -ml-1 text-slate-800 hover:opacity-70 transition-opacity cursor-pointer"
              >
                <ChevronLeft className="w-7 h-7 stroke-[2.2]" />
              </button>
              <h1 className="font-extrabold text-base text-slate-900 tracking-tight">
                BINISTA
              </h1>
              <div className="w-7" />
            </div>

            <div className="flex-1 flex flex-col justify-center my-auto py-3 space-y-4">
              <div className="shrink-0">
                <h2 className="font-extrabold text-xl text-slate-900 leading-tight">
                  Set New Password
                </h2>
                <p className="text-xs text-gray-500 font-medium mt-1">
                  Create a new password for your account
                </p>
              </div>

              <div className="flex flex-col gap-3 shrink-0">
                <div className="bg-[#f8fafc] border border-gray-200 focus-within:border-slate-900 rounded-2xl p-3 flex items-center gap-3 transition-colors">
                  <Lock className="w-5 h-5 text-slate-500 shrink-0" />
                  <div className="flex flex-col flex-1">
                    <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">
                      New Password
                    </label>
                    <input
                      type={showNewPass ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Min. 6 characters"
                      className="w-full bg-transparent text-xs font-bold text-slate-900 focus:outline-none placeholder-gray-400"
                      required
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowNewPass((prev) => !prev)}
                    className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                <div className="bg-[#f8fafc] border border-gray-200 focus-within:border-slate-900 rounded-2xl p-3 flex items-center gap-3 transition-colors">
                  <Lock className="w-5 h-5 text-slate-500 shrink-0" />
                  <div className="flex flex-col flex-1">
                    <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">
                      Confirm Password
                    </label>
                    <input
                      type={showNewPass ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter your password"
                      className="w-full bg-transparent text-xs font-bold text-slate-900 focus:outline-none placeholder-gray-400"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-2xl bg-[#131b26] hover:bg-slate-800 text-white font-extrabold text-sm shadow-md transition-all cursor-pointer text-center flex items-center justify-center gap-2 shrink-0"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>Reset Password</span>}
            </button>
          </form>
        )}

        {/* ========================================================= */}
        {/* CUSTOM SOFTWARE POPUP DATE PICKER DIALOG                  */}
        {/* ========================================================= */}
        {isDatePickerOpen && (
          <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white text-slate-900 rounded-3xl w-full max-w-xs overflow-hidden shadow-2xl border border-gray-100 p-5 flex flex-col gap-4 animate-in zoom-in-95 duration-150">
              
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                    <Calendar className="w-5 h-5 stroke-[2.2]" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900 leading-tight">
                      Select Date of Birth
                    </h3>
                    <p className="text-[10px] text-gray-500 font-medium">
                      Must be at least 18 years old
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsDatePickerOpen(false)}
                  className="p-1.5 text-gray-400 hover:text-slate-900 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Selectors: Year & Month */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[9px] font-extrabold text-gray-400 uppercase tracking-wider block mb-1">
                    Year (বছর)
                  </label>
                  <select
                    value={tempYear}
                    onChange={(e) => setTempYear(Number(e.target.value))}
                    className="w-full bg-[#f8fafc] border border-gray-200 text-xs font-bold text-slate-900 rounded-xl p-2 focus:outline-none focus:border-slate-900 cursor-pointer"
                  >
                    {Array.from({ length: 70 }, (_, i) => 2008 - i).map((yr) => (
                      <option key={yr} value={yr}>
                        {yr}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[9px] font-extrabold text-gray-400 uppercase tracking-wider block mb-1">
                    Month (মাস)
                  </label>
                  <select
                    value={tempMonth}
                    onChange={(e) => setTempMonth(Number(e.target.value))}
                    className="w-full bg-[#f8fafc] border border-gray-200 text-xs font-bold text-slate-900 rounded-xl p-2 focus:outline-none focus:border-slate-900 cursor-pointer"
                  >
                    {[
                      'January', 'February', 'March', 'April', 'May', 'June',
                      'July', 'August', 'September', 'October', 'November', 'December'
                    ].map((m, idx) => (
                      <option key={m} value={idx}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Days Grid Selection */}
              <div>
                <label className="text-[9px] font-extrabold text-gray-400 uppercase tracking-wider block mb-1">
                  Select Day (দিন)
                </label>
                <div className="grid grid-cols-7 gap-1 max-h-32 overflow-y-auto no-scrollbar p-1 bg-gray-50 rounded-xl border border-gray-100">
                  {Array.from({ length: new Date(tempYear, tempMonth + 1, 0).getDate() }, (_, i) => i + 1).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setTempDay(d)}
                      className={`h-7 rounded-lg font-extrabold text-xs transition-all flex items-center justify-center cursor-pointer ${
                        tempDay === d
                          ? 'bg-[#131b26] text-white shadow-xs scale-105'
                          : 'text-slate-700 hover:bg-gray-200/70'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              {/* Live Age Verification Badge */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2 flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-800">
                  Selected: {tempDay}/{tempMonth + 1}/{tempYear}
                </span>
                {(() => {
                  const calculatedAge = calculateAge(`${tempYear}-${String(tempMonth + 1).padStart(2, '0')}-${String(tempDay).padStart(2, '0')}`);
                  return calculatedAge >= 18 ? (
                    <span className="text-[9px] bg-emerald-100 text-emerald-800 font-extrabold px-2 py-0.5 rounded-full">
                      Age {calculatedAge} (18+ Eligible)
                    </span>
                  ) : (
                    <span className="text-[9px] bg-rose-100 text-rose-800 font-extrabold px-2 py-0.5 rounded-full">
                      Age {calculatedAge} (Under 18)
                    </span>
                  );
                })()}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-0.5">
                <button
                  type="button"
                  onClick={() => setIsDatePickerOpen(false)}
                  className="flex-1 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer text-center"
                >
                  Cancel (বাতিল)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const monthNames = [
                      'January', 'February', 'March', 'April', 'May', 'June',
                      'July', 'August', 'September', 'October', 'November', 'December'
                    ];
                    const formatted = `${tempDay} ${monthNames[tempMonth]} ${tempYear}`;
                    setSignupDob(formatted);
                    setIsDatePickerOpen(false);
                  }}
                  className="flex-1 py-2 rounded-xl bg-[#131b26] hover:bg-slate-800 text-white font-extrabold text-xs shadow-xs transition-all cursor-pointer text-center"
                >
                  Confirm (সেট)
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
};
