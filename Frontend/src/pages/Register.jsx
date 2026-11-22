// src/pages/Register.jsx
import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, Mail, User, Users, Eye, EyeOff, ArrowRight, ShieldAlert } from 'lucide-react';
import axiosInstance from '../api/axiosInstance';
import { useAuthStore } from '../store/useAuthStore';
import { useCountries } from '../hooks/useCountries';
import { PASSWORD_MIN_LENGTH, PASSWORD_PATTERN, PASSWORD_REQUIREMENTS } from '../utils/passwordPolicy';

const Register = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const refCodeFromUrl = searchParams.get('ref') || '';
  const setAuth = useAuthStore((state) => state.setAuth);

  const [formData, setFormData] = useState({
    name: '',
    fatherName: '',
    email: '',
    gender: '',
    dateOfBirth: '',
    country: '',
    password: '',
    referralCode: refCodeFromUrl,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [confirmError, setConfirmError] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [registrationResult, setRegistrationResult] = useState(null);
  const today = new Date();
  const latestDateOfBirth = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, '0'),
    String(today.getDate()).padStart(2, '0'),
  ].join('-');
  const {
    data: countries,
    isPending: countriesLoading,
    isError: countriesError,
    refetch: retryCountries,
  } = useCountries();

  useEffect(() => {
    if (refCodeFromUrl) {
      setFormData((prev) => ({ ...prev, referralCode: refCodeFromUrl }));
    }
  }, [refCodeFromUrl]);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (e.target.name === 'password') setConfirmError('');
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (formData.password !== confirmPassword) {
      setConfirmError('Passwords do not match.');
      return;
    }
    setConfirmError('');
    setLoading(true);

    try {
      const response = await axiosInstance.post('/auth/register', formData);
      const data = response.data.data;
      if (data?.user && data?.token) {
        setAuth({ user: data.user, token: data.token });
        navigate('/dashboard', { replace: true });
      } else if (data?.verificationRequired && data?.email) {
        setRegistrationResult({ ...data, message: response.data.message });
      } else {
        throw new Error('Unexpected registration response');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Please check your registration details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#060a12] flex items-center justify-center p-4 relative overflow-hidden">
      <title>MonexaFx-Sign Up</title>
      {/* Background Glow Orbs */}
      <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="neon-card bg-[#0b1322]/90 max-w-md w-full p-8 rounded-2xl relative border border-cyan-500/30 shadow-2xl z-10">
        {/* Header */}
        <div className="text-center mb-6">
          <Link to="/" className="inline-block hover:opacity-90 transition group">
            <div className="w-20 h-20 rounded-full bg-slate-900/80 border border-cyan-500/30 flex items-center justify-center overflow-hidden mx-auto shadow-lg shadow-cyan-500/30 mb-3 group-hover:border-cyan-400 transition">
              <img
                src="/monexafx-logo.png"
                alt="MonexaFX Logo"
                className="w-full h-full object-contain p-0.5"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.parentNode.innerText = 'M';
                  e.target.parentNode.className += ' text-cyan-400 font-extrabold text-xl';
                }}
              />
            </div>
            <h1 className="text-2xl font-extrabold text-white tracking-wide">
              Join Monexa<span className="text-cyan-400">Fx</span>
            </h1>
          </Link>
          <p className="text-xs text-slate-400 mt-1">Manage your investment account</p>
        </div>

        {/* Error Alert Box */}
        {error && (
          <div className="mb-5 p-3 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {registrationResult ? (
          <div className="space-y-4 text-sm text-slate-300" role="status">
            <p>{registrationResult.message}</p>
            <p>Check <strong className="text-white">{registrationResult.email}</strong> and your spam folder. The link expires after 24 hours.</p>
            <button type="button" onClick={() => navigate('/verify-email', { state: { email: registrationResult.email } })} className="w-full btn-neon-outline py-3 rounded-xl font-bold">
              Resend verification email
            </button>
            <Link to="/login" className="block text-center text-cyan-400 font-bold">Return to sign in</Link>
          </div>
        ) : (
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label htmlFor="register-name" className="block text-xs font-semibold text-slate-300 mb-1">Full Legal Name</label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                id="register-name"
                name="name"
                required
                maxLength={100}
                autoComplete="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Jackie Chan..."
                className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400 transition"
              />
            </div>
          </div>

          <div>
            <label htmlFor="register-father-name" className="block text-xs font-semibold text-slate-300 mb-1">Father's Name</label>
            <input
              id="register-father-name"
              type="text"
              name="fatherName"
              required
              maxLength={100}
              placeholder="Bruce Lee"
              value={formData.fatherName}
              onChange={handleChange}
              className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm text-white focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400 transition"
            />
          </div>

          <div>
            <label htmlFor="register-email" className="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="email"
                id="register-email"
                name="email"
                required
                autoComplete="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="name@example.com"
                className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400 transition"
              />
            </div>
          </div>

          <div>
            <label htmlFor="register-gender" className="block text-xs font-semibold text-slate-300 mb-1">Gender</label>
            <select
              id="register-gender"
              name="gender"
              required
              value={formData.gender}
              onChange={handleChange}
              className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm text-white focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400 transition"
            >
              <option value="">Select gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
              <option value="prefer_not_to_say">Prefer not to say</option>
            </select>
          </div>

          <div>
            <label htmlFor="register-date-of-birth" className="block text-xs font-semibold text-slate-300 mb-1">Date of Birth</label>
            <input
              id="register-date-of-birth"
              type="date"
              name="dateOfBirth"
              required
              max={latestDateOfBirth}
              autoComplete="bday"
              value={formData.dateOfBirth}
              onChange={handleChange}
              className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm text-white focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400 transition"
            />
          </div>

          <div>
            <label htmlFor="register-country" className="block text-xs font-semibold text-slate-300 mb-1">Country</label>
            <select
              id="register-country"
              name="country"
              required
              disabled={countriesLoading || countriesError}
              value={formData.country}
              onChange={handleChange}
              className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm text-white focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400 transition disabled:opacity-60"
            >
              <option value="">{countriesLoading ? 'Loading countries...' : 'Select country'}</option>
              {countries?.map(({ code, name }) => <option key={code} value={code}>{name}</option>)}
            </select>
            {countriesError && (
              <p className="text-xs text-rose-400 mt-1" role="alert">
                Could not load countries.{' '}
                <button type="button" onClick={() => retryCountries()} className="underline">Try again</button>
              </p>
            )}
          </div>

          <div>
            <label htmlFor="register-password" className="block text-xs font-semibold text-slate-300 mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                id="register-password"
                name="password"
                required
                autoComplete="new-password"
                minLength={PASSWORD_MIN_LENGTH}
                pattern={PASSWORD_PATTERN.source}
                title={PASSWORD_REQUIREMENTS}
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl pl-10 pr-10 py-2.5 text-sm text-white focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400 transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-3.5 top-3 text-slate-400 hover:text-white"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">{PASSWORD_REQUIREMENTS}</p>
          </div>

          <div>
            <label htmlFor="register-confirm-password" className="block text-xs font-semibold text-slate-300 mb-1">Confirm Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                id="register-confirm-password"
                name="confirmPassword"
                required
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setConfirmError('');
                }}
                aria-invalid={Boolean(confirmError)}
                aria-describedby={confirmError ? 'register-confirm-password-error' : undefined}
                placeholder="••••••••"
                className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl pl-10 pr-10 py-2.5 text-sm text-white focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400 transition"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                className="absolute right-3.5 top-3 text-slate-400 hover:text-white"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {confirmError && <p id="register-confirm-password-error" role="alert" className="text-xs text-rose-400 mt-1">{confirmError}</p>}
          </div>

          <div>
            <label htmlFor="register-referral" className="block text-xs font-semibold text-slate-300 mb-1">
              Invitation Code <span className="text-rose-400 font-normal">(Required)</span>
            </label>
            <div className="relative">
              <Users className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                id="register-referral"
                name="referralCode"
                required
                value={formData.referralCode}
                onChange={handleChange}
                placeholder="e.g. A3F9B2"
                className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-cyan-300 font-mono focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400 transition"
              />
            </div>
            {refCodeFromUrl && (
              <p className="text-[11px] text-cyan-400 mt-1 font-medium">✓ Referral invitation code linked from link</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || countriesLoading || countriesError}
            className="w-full btn-neon-primary py-3 rounded-xl font-bold text-sm mt-2 flex items-center justify-center gap-2 disabled:opacity-50 transition"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            ) : (
              <>
                <span>Create Investment Account</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
        )}

        <div className="mt-6 pt-5 border-t border-slate-800 text-center text-xs text-slate-400">
          Already registered?{' '}
          <Link to="/login" className="text-cyan-400 font-bold hover:underline">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Register;