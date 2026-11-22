import { useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { MailCheck, ShieldAlert } from 'lucide-react';
import axiosInstance from '../api/axiosInstance';

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState(location.state?.email || '');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const verify = async () => {
    setLoading(true);
    setError('');
    try {
      await axiosInstance.post('/auth/verify-email', { token });
      navigate('/login?emailVerified=true', { replace: true });
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Could not verify your email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resend = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const response = await axiosInstance.post('/auth/resend-verification', { email });
      setMessage(response.data.message);
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Could not send the verification email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#060a12] flex items-center justify-center p-4">
      <div className="neon-card bg-[#0b1322]/90 max-w-md w-full p-8 rounded-2xl border border-cyan-500/30">
        <div className="text-center mb-6">
          <MailCheck className="w-10 h-10 text-cyan-400 mx-auto mb-3" aria-hidden="true" />
          <h1 className="text-2xl font-extrabold text-white">Verify your email</h1>
          <p className="text-sm text-slate-400 mt-2">Confirm your email address before signing in to your new account.</p>
        </div>
        {error && (
          <div role="alert" className="mb-4 p-3 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0" aria-hidden="true" /> {error}
          </div>
        )}
        {message && <div role="status" className="mb-4 p-3 rounded-xl bg-cyan-950/40 border border-cyan-800 text-cyan-200 text-sm">{message}</div>}
        {token && (
          <button type="button" onClick={verify} disabled={loading} className="w-full btn-neon-primary py-3 rounded-xl font-bold text-sm mb-5 disabled:opacity-50">
            {loading ? 'Please wait...' : 'Confirm email address'}
          </button>
        )}
        <form onSubmit={resend} className="space-y-3">
          <label htmlFor="verification-email" className="block text-xs font-semibold text-slate-300">Need a new link? Enter your email address.</label>
          <input id="verification-email" type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:border-cyan-400 focus:outline-none" />
          <button type="submit" disabled={loading} className="w-full btn-neon-outline py-3 rounded-xl font-bold text-sm disabled:opacity-50">
            {loading ? 'Please wait...' : 'Send verification email'}
          </button>
        </form>
        <Link to="/login" className="block text-center text-xs text-cyan-400 font-bold mt-6 hover:underline">Return to sign in</Link>
      </div>
    </div>
  );
};

export default VerifyEmail;
