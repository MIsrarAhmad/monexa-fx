// src/pages/ProfilePage.jsx
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { User, Key, Save, CheckCircle } from 'lucide-react';
import axiosInstance from '../api/axiosInstance';
import { useAuthStore } from '../store/useAuthStore';
import Navbar from '../components/layout/Navbar';
import Sidebar from '../components/layout/Sidebar';
import BottomNav from '../components/layout/BottomNav';
import Toast from '../components/common/Toast';
import CountryFlag from '../components/common/CountryFlag';
import UserAvatar from '../components/common/UserAvatar';
import { useCountries } from '../hooks/useCountries';
import { useProfilePicture } from '../hooks/useProfilePicture';
import { PASSWORD_MIN_LENGTH, PASSWORD_PATTERN, PASSWORD_REQUIREMENTS } from '../utils/passwordPolicy';

const prepareProfilePicture = async (file) => {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    throw new Error('Choose a JPG, PNG, or WebP image.');
  }
  if (file.size > 10 * 1024 * 1024) throw new Error('Choose an image smaller than 10 MB.');

  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = () => reject(new Error('Could not open this image.'));
      image.src = url;
    });
    const scale = Math.min(1, 512 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not process this image.');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const picture = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.8));
    if (!picture || picture.size > 512 * 1024) throw new Error('Could not resize this image. Please choose another one.');
    return picture;
  } finally {
    URL.revokeObjectURL(url);
  }
};

const ProfilePictureSettings = ({ user }) => {
  const { isError, refetch } = useProfilePicture(user?._id);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handlePictureChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setError('');
    setMessage('');
    setUploading(true);
    try {
      const picture = await prepareProfilePicture(file);
      const formData = new FormData();
      formData.append('picture', picture, 'profile.jpg');
      await axiosInstance.put('/user/profile-picture', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      try {
        await refetch({ throwOnError: true });
        setMessage('Profile picture updated successfully.');
      } catch {
        setError('Picture saved, but could not be reloaded. Please try again.');
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Could not update profile picture.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="mb-5 flex flex-wrap items-center gap-4">
      <UserAvatar user={user} className="w-20 h-20 rounded-full border-2 border-cyan-400 bg-slate-800 flex items-center justify-center text-cyan-300 font-bold text-xl shrink-0" />
      <div className="text-xs">
        <label htmlFor="profile-picture" className="inline-block cursor-pointer rounded-xl bg-cyan-900 px-4 py-2 font-bold text-cyan-100 hover:bg-cyan-800">
          {uploading ? 'Uploading...' : 'Upload or change picture'}
        </label>
        <input id="profile-picture" type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading} onChange={handlePictureChange} className="sr-only" />
        <p className="mt-1 text-slate-400">JPG, PNG or WebP, up to 10 MB.</p>
        {message && <p className="mt-1 text-emerald-400" role="status">{message}</p>}
        {error && <p className="mt-1 text-rose-400" role="alert">{error}</p>}
        {isError && (
          <p className="mt-1 text-rose-400" role="alert">
            Could not load profile picture.{' '}
            <button type="button" onClick={() => refetch()} className="underline">Try again</button>
          </p>
        )}
      </div>
    </div>
  );
};

const PersonalInformationForm = ({ profile, savingProfile, onSave }) => {
  const [name, setName] = useState(profile.name || '');
  const [email, setEmail] = useState(profile.email || '');
  const [fatherName, setFatherName] = useState(profile.fatherName || '');
  const [gender, setGender] = useState(profile.gender || '');
  const [dateOfBirth, setDateOfBirth] = useState(profile.dateOfBirth || '');
  const [country, setCountry] = useState(profile.country || '');
  const { data: countries, isPending: countriesLoading, isError: countriesError, refetch: retryCountries } = useCountries();
  const today = new Date();
  const latestDateOfBirth = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, '0'),
    String(today.getDate()).padStart(2, '0'),
  ].join('-');

  const handleSubmit = (e) => {
    e.preventDefault();
    const details = { name, email };
    if (fatherName) details.fatherName = fatherName;
    if (gender) details.gender = gender;
    if (dateOfBirth) details.dateOfBirth = dateOfBirth;
    if (country) details.country = country;
    onSave(details);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-xs">
      <div>
        <label htmlFor="profile-name" className="block text-slate-400 mb-1 font-semibold">Full Name</label>
        <input id="profile-name" type="text" value={name} onChange={(e) => setName(e.target.value)} required
          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-white font-semibold focus:outline-none focus:border-cyan-500" />
      </div>
      <div>
        <label htmlFor="profile-email" className="block text-slate-400 mb-1 font-semibold">Email Address</label>
        <input id="profile-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-white font-semibold focus:outline-none focus:border-cyan-500" />
      </div>
      <div>
        <label htmlFor="profile-father-name" className="block text-slate-400 mb-1 font-semibold">Father's Name</label>
        <input id="profile-father-name" type="text" value={fatherName} onChange={(e) => setFatherName(e.target.value)} maxLength={100} required={Boolean(profile.fatherName)} placeholder="Bruce Lee"
          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-white font-semibold focus:outline-none focus:border-cyan-500" />
      </div>
      <div>
        <label htmlFor="profile-gender" className="block text-slate-400 mb-1 font-semibold">Gender</label>
        <select id="profile-gender" value={gender} onChange={(e) => setGender(e.target.value)} required={Boolean(profile.gender)}
          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-white font-semibold focus:outline-none focus:border-cyan-500">
          <option value="">Select gender</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="other">Other</option>
          <option value="prefer_not_to_say">Prefer not to say</option>
        </select>
      </div>
      <div>
        <label htmlFor="profile-date-of-birth" className="block text-slate-400 mb-1 font-semibold">Date of Birth</label>
        <input id="profile-date-of-birth" type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} required={Boolean(profile.dateOfBirth)} max={latestDateOfBirth} autoComplete="bday"
          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-white font-semibold focus:outline-none focus:border-cyan-500" />
      </div>
      <div>
        <label htmlFor="profile-country" className="block text-slate-400 mb-1 font-semibold">Country</label>
        <select id="profile-country" value={country} onChange={(e) => setCountry(e.target.value)} required={Boolean(profile.country)} disabled={countriesLoading || countriesError}
          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-white font-semibold focus:outline-none focus:border-cyan-500 disabled:opacity-60">
          <option value="">{countriesLoading ? 'Loading countries...' : 'Select country'}</option>
          {countries?.map(({ code, name: countryName }) => <option key={code} value={code}>{countryName}</option>)}
        </select>
        {countriesError && (
          <p className="text-rose-400 mt-1" role="alert">
            Could not load countries.{' '}
            <button type="button" onClick={() => retryCountries()} className="underline">Try again</button>
          </p>
        )}
      </div>
      <div>
        <label htmlFor="profile-referral" className="block text-slate-400 mb-1 font-semibold">Referral Code</label>
        <input id="profile-referral" type="text" readOnly value={profile.referralCode || ''}
          className="w-full bg-slate-900/50 border border-slate-800 rounded-xl px-4 py-2.5 text-cyan-400 font-mono font-semibold focus:outline-none cursor-not-allowed" />
      </div>
      <button type="submit" disabled={savingProfile}
        className="btn-neon-primary w-full py-2.5 rounded-xl font-bold flex items-center justify-center gap-2">
        <Save className="w-4 h-4" />
        <span>{savingProfile ? 'Saving Changes...' : 'Save Profile Changes'}</span>
      </button>
    </form>
  );
};

const ProfilePage = () => {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const updateUser = useAuthStore((state) => state.updateUser);
  const queryClient = useQueryClient();
  const profileQueryKey = ['profile', user?._id];
  const { data: profile, isFetching: profileLoading, isError: profileError, refetch: retryProfile } = useQuery({
    queryKey: profileQueryKey,
    queryFn: async () => {
      const res = await axiosInstance.get('/auth/me');
      if (!res.data?.data?.user) throw new Error('Invalid profile response');
      return res.data.data.user;
    },
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const [savingProfile, setSavingProfile] = useState(false);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3500);
  };

  const handleUpdateProfile = async (details) => {
    setSavingProfile(true);
    try {
      const res = await axiosInstance.put('/user/profile', details);

      if (!res.data?.data) throw new Error('Invalid profile update response');
      updateUser(res.data.data);
      queryClient.setQueryData(profileQueryKey, (previous) => ({ ...previous, ...res.data.data }));

      showToast('Profile updated successfully!');
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setChangingPassword(true);
    try {
      await axiosInstance.put('/user/change-password', {
        currentPassword,
        newPassword,
      });
      showToast('Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#060a12] text-slate-100 flex flex-col relative pb-20 md:pb-6">
      <Navbar
        isMobileSidebarOpen={sidebarOpen}
        onMobileSidebarToggle={() => setSidebarOpen((open) => !open)}
      />

      <div className="max-w-7xl mx-auto w-full flex gap-6 px-4 py-6 md:px-8 flex-1">
        <Sidebar
          isOpen={sidebarOpen}
          onCloseSidebar={() => setSidebarOpen(false)}
          onLogout={logout}
        />

        <main className="flex-1 min-w-0">
          <div className="relative overflow-hidden rounded-2xl neon-card p-6 mb-6 border border-cyan-500/30">
            <h1 className="text-2xl md:text-3xl font-extrabold text-white flex items-center gap-2">
              <User className="w-7 h-7 text-cyan-400" /> Account Settings
            </h1>
            <p className="text-sm font-semibold text-white mt-2">
              {profile?.name || user?.name || 'Investor'} <CountryFlag country={profile ? profile.country : user?.country} />
            </p>
            <p className="text-xs md:text-sm text-slate-400 mt-1">
              Manage your personal credentials, email address, and account password.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="neon-card p-6 rounded-2xl">
              <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                <User className="w-4 h-4 text-cyan-400" /> Personal Information
              </h3>

              <ProfilePictureSettings user={user} />

              {profileLoading ? (
                <p className="text-xs text-slate-400">Loading profile...</p>
              ) : profileError ? (
                <p className="text-xs text-rose-400" role="alert">
                  Could not load profile.{' '}
                  <button type="button" onClick={() => retryProfile()} className="underline">Try again</button>
                </p>
              ) : profile && (
                <PersonalInformationForm profile={profile} savingProfile={savingProfile} onSave={handleUpdateProfile} />
              )}
            </div>

            <div className="neon-card p-6 rounded-2xl">
              <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                <Key className="w-4 h-4 text-amber-400" /> Security & Password
              </h3>

              <form onSubmit={handleChangePassword} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Current Password</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    placeholder="Enter current password"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-white font-semibold focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={PASSWORD_MIN_LENGTH}
                    pattern={PASSWORD_PATTERN.source}
                    title={PASSWORD_REQUIREMENTS}
                    placeholder="Enter a strong password"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-white font-semibold focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 text-[11px] text-slate-400 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{PASSWORD_REQUIREMENTS}</span>
                </div>

                <button
                  type="submit"
                  disabled={changingPassword}
                  className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold transition flex items-center justify-center gap-2"
                >
                  <Key className="w-4 h-4" />
                  <span>{changingPassword ? 'Updating Password...' : 'Update Password'}</span>
                </button>
              </form>
            </div>
          </div>
        </main>
      </div>

      <BottomNav />
      <Toast message={toastMsg} />
    </div>
  );
};

export default ProfilePage;