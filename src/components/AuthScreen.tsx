import React, { useState, useEffect } from 'react';
import {
  Mail,
  Lock,
  User as UserIcon,
  ArrowRight,
  Check,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  Calendar,
  Vote,
  Users,
  RefreshCw,
} from 'lucide-react';
import {
  signInWithGoogleReal,
  signInWithAppleReal,
  signInWithEmailReal,
  signUpWithEmailReal,
  sendPasswordResetReal,
  resendVerificationEmailReal,
  checkEmailVerifiedReal,
  signOutReal,
} from '../services/firebase';
import { User as UserType } from '../types';
import { LegalModal, LegalDocType } from './LegalModal';
import authHeroEvening from '../assets/images/auth_hero_evening_1795309405369.jpg';

interface AuthScreenProps {
  onAuthenticated: (user: UserType) => void;
  initialMode?: AuthMode;
  pendingVerificationEmail?: string;
  pendingInviteCode?: string | null;
}

export type AuthMode =
  | 'welcome'
  | 'signup'
  | 'login'
  | 'forgot_password'
  | 'verify_email';

export const AuthScreen: React.FC<AuthScreenProps> = ({
  onAuthenticated,
  initialMode = 'welcome',
  pendingVerificationEmail = '',
  pendingInviteCode = null,
}) => {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [error, setError] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [loadingApple, setLoadingApple] = useState(false);
  const [loadingEmail, setLoadingEmail] = useState(false);
  const [loadingReset, setLoadingReset] = useState(false);
  const [loadingVerifyCheck, setLoadingVerifyCheck] = useState(false);
  const [activeLegalDoc, setActiveLegalDoc] = useState<LegalDocType | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState(pendingVerificationEmail);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Reset password state
  const [resetEmail, setResetEmail] = useState('');
  const [resetDone, setResetDone] = useState(false);

  useEffect(() => {
    if (initialMode === 'verify_email') {
      setMode('verify_email');
      if (pendingVerificationEmail) {
        setEmail(pendingVerificationEmail);
      }
    }
  }, [initialMode, pendingVerificationEmail]);

  const anyLoading = loadingGoogle || loadingApple || loadingEmail || loadingReset || loadingVerifyCheck;

  // REAL FIREBASE SIGN UP WITH EMAIL
  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMsg(null);
    setLoadingEmail(true);

    const res = await signUpWithEmailReal(name, email, password);
    setLoadingEmail(false);

    if (!res.success) {
      setError(res.error || 'Failed to create account.');
      return;
    }

    if (res.needsVerification) {
      setEmail(res.email || email.trim());
      setMode('verify_email');
      return;
    }

    if (res.user) {
      onAuthenticated(res.user);
    }
  };

  // REAL FIREBASE LOGIN WITH EMAIL
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMsg(null);
    setLoadingEmail(true);

    const res = await signInWithEmailReal(email, password);
    setLoadingEmail(false);

    if (!res.success) {
      setError(res.error || 'Failed to log in.');
      return;
    }

    if (res.needsVerification) {
      setEmail(res.email || email.trim());
      setMode('verify_email');
      return;
    }

    if (res.user) {
      onAuthenticated(res.user);
    }
  };

  // REAL FIREBASE POPUP SIGN IN WITH GOOGLE
  const handleTriggerGoogleSignIn = async () => {
    setError(null);
    setInfoMsg(null);
    setLoadingGoogle(true);

    try {
      const res = await signInWithGoogleReal();
      setLoadingGoogle(false);
      if (res.success && res.user) {
        onAuthenticated(res.user);
      } else {
        setError(res.error || 'Google authentication failed.');
      }
    } catch (err: any) {
      setLoadingGoogle(false);
      setError(err?.message || 'Google sign-in encountered an error.');
    }
  };

  // REAL FIREBASE POPUP SIGN IN WITH APPLE
  const handleTriggerAppleSignIn = async () => {
    setError(null);
    setInfoMsg(null);
    setLoadingApple(true);

    try {
      const res = await signInWithAppleReal();
      setLoadingApple(false);
      if (res.success && res.needsVerification) {
        setEmail(res.email || '');
        setMode('verify_email');
      } else if (res.success && res.user) {
        onAuthenticated(res.user);
      } else {
        setError(res.error || 'Apple authentication failed.');
      }
    } catch (err: any) {
      setLoadingApple(false);
      setError(err?.message || 'Apple sign-in encountered an error.');
    }
  };

  // REAL FIREBASE PASSWORD RESET
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMsg(null);
    setLoadingReset(true);

    const res = await sendPasswordResetReal(resetEmail);
    setLoadingReset(false);
    if (!res.success) {
      setError(res.error || 'Could not send reset email.');
      return;
    }
    setResetDone(true);
  };

  // CHECK EMAIL VERIFICATION
  const handleCheckVerified = async () => {
    setError(null);
    setInfoMsg(null);
    setLoadingVerifyCheck(true);

    const res = await checkEmailVerifiedReal();
    setLoadingVerifyCheck(false);

    if (res.success && res.user) {
      onAuthenticated(res.user);
    } else {
      setError(res.error || 'Email is not verified yet.');
    }
  };

  // RESEND VERIFICATION EMAIL
  const handleResendVerification = async () => {
    setError(null);
    setInfoMsg(null);
    const res = await resendVerificationEmailReal();
    if (res.success) {
      setInfoMsg('Verification email sent. Check your inbox and spam folder.');
    } else {
      setError(res.error || 'Could not resend email.');
    }
  };

  // SWITCH ACCOUNT FROM VERIFICATION SCREEN
  const handleUseDifferentAccount = async () => {
    setError(null);
    setInfoMsg(null);
    await signOutReal();
    setPassword('');
    setMode('welcome');
  };

  return (
    <div className="min-h-screen w-full bg-[#0A0E17] text-[#F1F3F7] flex flex-col lg:flex-row">
      {/* Desktop Editorial Visual Panel (Left Half) */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-[54%] relative overflow-hidden bg-[#121724] border-r border-[#1F283C] flex-col justify-between p-12">
        <img
          src={authHeroEvening}
          alt="Friends sharing an evening gathering around an outdoor table"
          className="absolute inset-0 w-full h-full object-cover object-center opacity-50"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A0E17] via-[#0A0E17]/75 to-[#0A0E17]/40" />

        {/* Brand Mark Top-Left */}
        <div className="relative z-10 flex items-center space-x-3">
          <div className="w-10 h-10 bg-[#8E84E4] rounded-xl flex items-center justify-center text-[#F1F3F7] font-bold text-lg shadow-lg shadow-[#8E84E4]/25">
            M
          </div>
          <span className="text-lg font-bold tracking-tight text-[#F1F3F7]">Mifgash</span>
        </div>

        {/* Bottom Editorial Copy */}
        <div className="relative z-10 max-w-lg space-y-6">
          <div className="space-y-3">
            <h2 className="text-3xl xl:text-4xl font-bold tracking-tight text-[#F1F3F7] leading-[1.15]">
              Plans shouldn&apos;t get lost in the group chat.
            </h2>
            <p className="text-sm xl:text-base text-[#CBD2E1] leading-relaxed">
              Coordinate dates, vote on spots together, and keep every gathering clearly organized across your circles.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/10">
            <div className="space-y-1">
              <Users className="w-4 h-4 text-[#8E84E4]" />
              <div className="text-xs font-semibold text-[#F1F3F7]">Invite-Only Groups</div>
              <p className="text-[11px] text-[#8D98AF]">Private circles for friends, family, or teams</p>
            </div>
            <div className="space-y-1">
              <Vote className="w-4 h-4 text-[#8E84E4]" />
              <div className="text-xs font-semibold text-[#F1F3F7]">Quick Polls</div>
              <p className="text-[11px] text-[#8D98AF]">Pick a time or place and turn votes into plans</p>
            </div>
            <div className="space-y-1">
              <Calendar className="w-4 h-4 text-[#8E84E4]" />
              <div className="text-xs font-semibold text-[#F1F3F7]">Shared Calendar</div>
              <p className="text-[11px] text-[#8D98AF]">Clear RSVPs and one-tap calendar export</p>
            </div>
          </div>
        </div>
      </div>

      {/* Auth Interaction Panel (Right Half / Full Width on Mobile) */}
      <div className="flex-1 flex flex-col items-center justify-center px-5 sm:px-8 lg:p-12 pt-[max(1.25rem,env(safe-area-inset-top,0px))] pb-[max(1.25rem,env(safe-area-inset-bottom,0px))] relative">
        <div className="w-full max-w-md space-y-6">
          {/* Mobile Brand Header (hidden on desktop where left panel shows it, or compact) */}
          <div className="text-center lg:text-left space-y-2">
            <div className="lg:hidden w-12 h-12 bg-[#8E84E4] rounded-2xl flex items-center justify-center text-[#F1F3F7] font-bold text-xl mx-auto shadow-md shadow-[#8E84E4]/20 ring-4 ring-[#8E84E4]/15">
              M
            </div>
            <h1 className="text-2xl font-bold text-[#F1F3F7] tracking-tight">
              {mode === 'welcome' && 'Sign in to Mifgash'}
              {mode === 'signup' && 'Create your account'}
              {mode === 'login' && 'Welcome back'}
              {mode === 'forgot_password' && 'Reset password'}
              {mode === 'verify_email' && 'Verify your email'}
            </h1>
            <p className="text-xs sm:text-sm text-[#8D98AF] leading-relaxed">
              {mode === 'welcome' && 'Organize hangouts, vote on dates, and keep shared plans in one calm place.'}
              {mode === 'signup' && 'Start planning with your groups using your email.'}
              {mode === 'login' && 'Log in with your email and password.'}
              {mode === 'forgot_password' && 'Enter your account email and we will send a reset link.'}
              {mode === 'verify_email' && 'Confirm your email address before entering Mifgash.'}
            </p>
          </div>

          {/* Pending Invite Banner */}
          {pendingInviteCode && (
            <div className="p-3 bg-[#8E84E4]/10 border border-[#8E84E4]/35 rounded-xl text-xs text-[#CBD2E1] flex items-center justify-between gap-2">
              <span>You have a pending group invite. Sign in to join automatically.</span>
              <span className="font-mono text-[11px] text-[#8E84E4] shrink-0">{pendingInviteCode}</span>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="p-3 bg-[#D45D6D]/15 border border-[#D45D6D]/35 rounded-xl text-xs text-[#E88A96] flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#D45D6D]" />
              <span>{error}</span>
            </div>
          )}

          {/* Info Banner */}
          {infoMsg && (
            <div className="p-3 bg-[#3EB88F]/15 border border-[#3EB88F]/35 rounded-xl text-xs text-[#3EB88F] flex items-start space-x-2">
              <Check className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{infoMsg}</span>
            </div>
          )}

          {/* Auth Card */}
          <div className="bg-[#121724] border border-[#1F283C] rounded-2xl p-6 sm:p-7 shadow-xl space-y-5">
            {/* ── WELCOME MODE ── */}
            {mode === 'welcome' && (
              <div className="space-y-4">
                <div className="space-y-2.5">
                  {/* Continue with Google */}
                  <button
                    type="button"
                    disabled={anyLoading}
                    onClick={handleTriggerGoogleSignIn}
                    className="w-full h-12 bg-[#182033] hover:bg-[#1E273D] border border-[#1F283C] hover:border-[#8E84E4]/50 text-[#F1F3F7] font-medium text-sm rounded-xl flex items-center justify-center space-x-3 transition-all cursor-pointer disabled:opacity-60"
                  >
                    {loadingGoogle ? (
                      <Loader2 className="w-4 h-4 animate-spin text-[#8E84E4]" />
                    ) : (
                      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                        />
                      </svg>
                    )}
                    <span>{loadingGoogle ? 'Connecting to Google...' : 'Continue with Google'}</span>
                  </button>

                  {/* Continue with Apple */}
                  <button
                    type="button"
                    disabled={anyLoading}
                    onClick={handleTriggerAppleSignIn}
                    className="w-full h-12 bg-black hover:bg-[#0D111B] border border-[#2C3752] hover:border-[#8E84E4]/60 text-white font-medium text-sm rounded-xl flex items-center justify-center space-x-3 transition-all cursor-pointer disabled:opacity-60"
                  >
                    {loadingApple ? (
                      <Loader2 className="w-4 h-4 animate-spin text-[#8E84E4]" />
                    ) : (
                      <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 170 170" aria-hidden="true">
                        <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.69-3.04-7.69-7.85-12-14.44-6.19-9.39-11.05-20.08-14.58-32.06-3.53-11.98-5.3-23.33-5.3-34.05 0-14.45 3.73-26.68 11.19-36.68 7.46-10 16.92-15.09 28.38-15.27 4.12 0 9.07 1.13 14.85 3.39 5.78 2.26 9.77 3.39 11.98 3.39 1.74 0 5.86-1.18 12.36-3.54 6.5-2.36 11.95-3.35 16.34-2.98 12.18.98 21.84 5.37 28.98 13.17-10.65 6.42-15.86 15.24-15.63 26.47.22 8.7 3.53 15.98 9.94 21.84 6.41 5.86 14.13 9.06 23.16 9.61-2.4 7.18-5.54 14.53-9.42 22.06zM119.22 31.84c0-7.38 2.67-14.32 8.01-20.82 5.34-6.5 11.89-10.42 19.65-11.76.22 1.09.33 2.18.33 3.27 0 7.39-2.73 14.43-8.19 21.12-5.46 6.69-12.06 10.59-19.8 11.69z" />
                      </svg>
                    )}
                    <span>{loadingApple ? 'Connecting to Apple...' : 'Continue with Apple'}</span>
                  </button>

                  {/* Divider */}
                  <div className="flex items-center space-x-3 py-1.5">
                    <div className="flex-1 h-px bg-[#1F283C]" />
                    <span className="text-[11px] uppercase tracking-wider text-[#5E6980] font-semibold">or</span>
                    <div className="flex-1 h-px bg-[#1F283C]" />
                  </div>

                  {/* Create Account with Email */}
                  <button
                    type="button"
                    disabled={anyLoading}
                    onClick={() => {
                      setError(null);
                      setInfoMsg(null);
                      setMode('signup');
                    }}
                    className="w-full h-12 bg-[#8E84E4] hover:bg-[#7B71D3] text-[#F1F3F7] font-semibold text-sm rounded-xl flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-md shadow-[#8E84E4]/20 disabled:opacity-60"
                  >
                    <Mail className="w-4 h-4 stroke-[2]" />
                    <span>Create Account with Email</span>
                  </button>
                </div>

                {/* Existing User Login Link */}
                <div className="text-center pt-2 border-t border-[#1F283C]/70">
                  <p className="text-xs text-[#8D98AF]">
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setError(null);
                        setInfoMsg(null);
                        setMode('login');
                      }}
                      className="text-[#8E84E4] hover:text-[#A49BE8] font-semibold hover:underline cursor-pointer"
                    >
                      Log in
                    </button>
                  </p>
                </div>
              </div>
            )}

            {/* ── SIGN UP MODE ── */}
            {mode === 'signup' && (
              <form onSubmit={handleEmailSignUp} className="space-y-4">
                <div className="space-y-3.5">
                  <div>
                    <label
                      htmlFor="signup-name"
                      className="block text-[11px] font-semibold uppercase tracking-wider text-[#8D98AF] mb-1.5"
                    >
                      Full Name
                    </label>
                    <div className="relative">
                      <UserIcon className="w-4 h-4 text-[#5E6980] absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        id="signup-name"
                        type="text"
                        required
                        maxLength={100}
                        autoComplete="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Your name"
                        className="w-full bg-[#182033] border border-[#1F283C] pl-10 pr-3.5 py-2.5 rounded-xl text-sm text-[#F1F3F7] placeholder-[#5E6980] focus:outline-none focus:border-[#8E84E4]"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="signup-email"
                      className="block text-[11px] font-semibold uppercase tracking-wider text-[#8D98AF] mb-1.5"
                    >
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-[#5E6980] absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        id="signup-email"
                        type="email"
                        required
                        maxLength={200}
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full bg-[#182033] border border-[#1F283C] pl-10 pr-3.5 py-2.5 rounded-xl text-sm text-[#F1F3F7] placeholder-[#5E6980] focus:outline-none focus:border-[#8E84E4]"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="signup-password"
                      className="block text-[11px] font-semibold uppercase tracking-wider text-[#8D98AF] mb-1.5"
                    >
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-[#5E6980] absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        id="signup-password"
                        type={showPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        autoComplete="new-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="At least 6 characters"
                        className="w-full bg-[#182033] border border-[#1F283C] pl-10 pr-10 py-2.5 rounded-xl text-sm text-[#F1F3F7] placeholder-[#5E6980] focus:outline-none focus:border-[#8E84E4]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((p) => !p)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5E6980] hover:text-[#CBD2E1] p-1 cursor-pointer"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={anyLoading}
                  className="w-full h-12 bg-[#8E84E4] hover:bg-[#7B71D3] text-[#F1F3F7] font-semibold text-sm rounded-xl flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-md shadow-[#8E84E4]/20 disabled:opacity-60"
                >
                  {loadingEmail ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>Create Account</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <div className="text-center pt-2 flex items-center justify-between text-xs text-[#8D98AF] border-t border-[#1F283C]/70">
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setMode('welcome');
                    }}
                    className="hover:text-[#F1F3F7] cursor-pointer"
                  >
                    ← Back
                  </button>
                  <span>
                    Have an account?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setError(null);
                        setMode('login');
                      }}
                      className="text-[#8E84E4] font-semibold hover:underline cursor-pointer"
                    >
                      Log in
                    </button>
                  </span>
                </div>
              </form>
            )}

            {/* ── LOG IN MODE ── */}
            {mode === 'login' && (
              <form onSubmit={handleEmailLogin} className="space-y-4">
                <div className="space-y-3.5">
                  <div>
                    <label
                      htmlFor="login-email"
                      className="block text-[11px] font-semibold uppercase tracking-wider text-[#8D98AF] mb-1.5"
                    >
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-[#5E6980] absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        id="login-email"
                        type="email"
                        required
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full bg-[#182033] border border-[#1F283C] pl-10 pr-3.5 py-2.5 rounded-xl text-sm text-[#F1F3F7] placeholder-[#5E6980] focus:outline-none focus:border-[#8E84E4]"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label
                        htmlFor="login-password"
                        className="block text-[11px] font-semibold uppercase tracking-wider text-[#8D98AF]"
                      >
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setError(null);
                          setInfoMsg(null);
                          setResetEmail(email);
                          setResetDone(false);
                          setMode('forgot_password');
                        }}
                        className="text-[11px] text-[#8E84E4] hover:underline cursor-pointer"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-[#5E6980] absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        id="login-password"
                        type={showPassword ? 'text' : 'password'}
                        required
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        className="w-full bg-[#182033] border border-[#1F283C] pl-10 pr-10 py-2.5 rounded-xl text-sm text-[#F1F3F7] placeholder-[#5E6980] focus:outline-none focus:border-[#8E84E4]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((p) => !p)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5E6980] hover:text-[#CBD2E1] p-1 cursor-pointer"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={anyLoading}
                  className="w-full h-12 bg-[#8E84E4] hover:bg-[#7B71D3] text-[#F1F3F7] font-semibold text-sm rounded-xl flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-md shadow-[#8E84E4]/20 disabled:opacity-60"
                >
                  {loadingEmail ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>Log In</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <div className="text-center pt-2 flex items-center justify-between text-xs text-[#8D98AF] border-t border-[#1F283C]/70">
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setMode('welcome');
                    }}
                    className="hover:text-[#F1F3F7] cursor-pointer"
                  >
                    ← Back
                  </button>
                  <span>
                    Need an account?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setError(null);
                        setMode('signup');
                      }}
                      className="text-[#8E84E4] font-semibold hover:underline cursor-pointer"
                    >
                      Sign up
                    </button>
                  </span>
                </div>
              </form>
            )}

            {/* ── FORGOT PASSWORD MODE ── */}
            {mode === 'forgot_password' && (
              <form onSubmit={handleResetPassword} className="space-y-4">
                {resetDone ? (
                  <div className="p-4 bg-[#3EB88F]/15 border border-[#3EB88F]/30 rounded-xl space-y-2.5 text-center">
                    <div className="w-9 h-9 bg-[#3EB88F]/20 text-[#3EB88F] rounded-full flex items-center justify-center mx-auto">
                      <Check className="w-4 h-4 stroke-[2.5]" />
                    </div>
                    <p className="text-xs font-semibold text-[#3EB88F]">Password reset email sent</p>
                    <p className="text-xs text-[#CBD2E1]">
                      Check <strong className="text-white">{resetEmail}</strong> for instructions to set a new password.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setMode('login');
                        setResetDone(false);
                      }}
                      className="mt-1 text-xs text-[#8E84E4] font-semibold hover:underline cursor-pointer inline-block"
                    >
                      Return to Log in
                    </button>
                  </div>
                ) : (
                  <>
                    <div>
                      <label
                        htmlFor="reset-email"
                        className="block text-[11px] font-semibold uppercase tracking-wider text-[#8D98AF] mb-1.5"
                      >
                        Email Address
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-[#5E6980] absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          id="reset-email"
                          type="email"
                          required
                          autoComplete="email"
                          value={resetEmail}
                          onChange={(e) => setResetEmail(e.target.value)}
                          placeholder="you@example.com"
                          className="w-full bg-[#182033] border border-[#1F283C] pl-10 pr-3.5 py-2.5 rounded-xl text-sm text-[#F1F3F7] placeholder-[#5E6980] focus:outline-none focus:border-[#8E84E4]"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={anyLoading}
                      className="w-full h-12 bg-[#8E84E4] hover:bg-[#7B71D3] text-[#F1F3F7] font-semibold text-sm rounded-xl flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-md shadow-[#8E84E4]/20 disabled:opacity-60"
                    >
                      {loadingReset ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <span>Send Reset Link</span>
                      )}
                    </button>

                    <div className="text-center pt-2 border-t border-[#1F283C]/70">
                      <button
                        type="button"
                        onClick={() => {
                          setError(null);
                          setMode('login');
                        }}
                        className="text-xs text-[#8D98AF] hover:text-[#F1F3F7] cursor-pointer"
                      >
                        ← Back to Log In
                      </button>
                    </div>
                  </>
                )}
              </form>
            )}

            {/* ── EMAIL VERIFICATION MODE ── */}
            {mode === 'verify_email' && (
              <div className="space-y-4">
                <div className="p-4 bg-[#182033] border border-[#1F283C] rounded-xl space-y-2">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#8E84E4]/15 text-[#8E84E4] flex items-center justify-center shrink-0">
                      <Mail className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-[#F1F3F7]">Verification email sent</div>
                      <div className="text-[11px] text-[#8D98AF] truncate">{email || 'Your email inbox'}</div>
                    </div>
                  </div>
                  <p className="text-xs text-[#CBD2E1] leading-relaxed">
                    Open the verification link in your inbox, then tap the button below to continue into Mifgash.
                  </p>
                </div>

                <button
                  type="button"
                  disabled={loadingVerifyCheck}
                  onClick={handleCheckVerified}
                  className="w-full h-12 bg-[#8E84E4] hover:bg-[#7B71D3] text-[#F1F3F7] font-semibold text-sm rounded-xl flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-md shadow-[#8E84E4]/20 disabled:opacity-60"
                >
                  {loadingVerifyCheck ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>I&apos;ve Verified My Email</span>
                    </>
                  )}
                </button>

                <div className="flex items-center justify-between pt-2 border-t border-[#1F283C]/70 text-xs">
                  <button
                    type="button"
                    onClick={handleResendVerification}
                    className="text-[#8E84E4] hover:underline font-medium flex items-center space-x-1.5 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Resend email</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleUseDifferentAccount}
                    className="text-[#8D98AF] hover:text-[#F1F3F7] cursor-pointer"
                  >
                    Use different account
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Legal & Compliance Links */}
          <div className="text-center space-y-1.5 pt-1">
            <p className="text-[11px] text-[#5E6980] leading-relaxed">
              By continuing, you agree to our{' '}
              <button
                type="button"
                onClick={() => setActiveLegalDoc('terms')}
                className="text-[#8D98AF] hover:text-[#F1F3F7] underline underline-offset-2 transition-colors cursor-pointer"
              >
                Terms of Service
              </button>{' '}
              and{' '}
              <button
                type="button"
                onClick={() => setActiveLegalDoc('privacy')}
                className="text-[#8D98AF] hover:text-[#F1F3F7] underline underline-offset-2 transition-colors cursor-pointer"
              >
                Privacy Policy
              </button>
              .
            </p>
          </div>
        </div>
      </div>

      {activeLegalDoc && (
        <LegalModal
          docType={activeLegalDoc}
          onChangeDocType={setActiveLegalDoc}
          onClose={() => setActiveLegalDoc(null)}
        />
      )}
    </div>
  );
};
