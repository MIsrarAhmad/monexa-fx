// src/pages/VerificationPage.jsx
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  UserCheck,
  ShieldCheck,
  Upload,
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle,
  Image as ImageIcon,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import axiosInstance from '../api/axiosInstance';
import { useAuthStore } from '../store/useAuthStore';
import Navbar from '../components/layout/Navbar';
import Sidebar from '../components/layout/Sidebar';
import BottomNav from '../components/layout/BottomNav';
import Toast from '../components/common/Toast';

const VerificationPage = () => {
  const logout = useAuthStore((state) => state.logout);
  const queryClient = useQueryClient();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  // Form State
  const [fullName, setFullName] = useState('');
  const [documentType, setDocumentType] = useState('PASSPORT');
  const [documentNumber, setDocumentNumber] = useState('');

  // File States & Image Previews
  const [idFrontFile, setIdFrontFile] = useState(null);
  const [idFrontPreview, setIdFrontPreview] = useState('');

  const [idBackFile, setIdBackFile] = useState(null);
  const [idBackPreview, setIdBackPreview] = useState('');

  const [selfieFile, setSelfieFile] = useState(null);
  const [selfiePreview, setSelfiePreview] = useState('');

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3500);
  };

  // Fetch Current User's KYC Status
  const { data: kycData, isLoading: fetchingKyc } = useQuery({
    queryKey: ['kyc-status'],
    queryFn: async () => {
      const res = await axiosInstance.get('/kyc/me');
      return res.data.data;
    },
  });

  const kycStatus = kycData?.kycStatus || 'UNVERIFIED';
  const kycDetails = kycData?.kycDetails || {};

  // Image Change Handler helper
  const handleFileChange = (e, setFile, setPreview) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        showToast('Image size must be smaller than 5MB');
        return;
      }
      setFile(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  // Submit Mutation
  const submitMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      formData.append('fullName', fullName);
      formData.append('documentType', documentType);
      formData.append('documentNumber', documentNumber);
      formData.append('idFront', idFrontFile);
      formData.append('idBack', idBackFile);
      formData.append('selfie', selfieFile);

      const res = await axiosInstance.post('/kyc/submit', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data;
    },
    onSuccess: (data) => {
      showToast(data.message || 'KYC Documents submitted successfully!');
      queryClient.invalidateQueries({ queryKey: ['kyc-status'] });
    },
    onError: (err) => {
      showToast(err.response?.data?.error || 'Failed to submit KYC documents.');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!fullName || !documentNumber) {
      showToast('Please fill out all document information fields.');
      return;
    }
    if (!idFrontFile || !idBackFile || !selfieFile) {
      showToast('Please upload all 3 photos: ID Front, ID Back, and Live Selfie.');
      return;
    }
    submitMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-[#060a12] text-slate-100 flex flex-col relative pb-20 md:pb-6">
      <Navbar
        onMobileSidebarToggle={() => setSidebarOpen(true)}
        onOpenNotifications={() => showToast('No new notifications')}
      />

      <div className="max-w-7xl mx-auto w-full flex gap-6 px-4 py-6 md:px-8 flex-1">
        <Sidebar
          isOpen={sidebarOpen}
          onCloseSidebar={() => setSidebarOpen(false)}
          onLogout={logout}
        />

        <main className="flex-1 min-w-0">
          {/* Header */}
          <div className="relative overflow-hidden rounded-2xl neon-card p-6 mb-6 border border-cyan-500/30">
            <h1 className="text-2xl md:text-3xl font-extrabold text-white flex items-center gap-2">
              <UserCheck className="w-7 h-7 text-cyan-400" /> Identity Verification (KYC)
            </h1>
            <p className="text-xs md:text-sm text-slate-400 mt-1">
              Verify your identity on Monexafx Exchange to unlock unlimited withdrawals and VIP tier security.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Form Section */}
            <div className="lg:col-span-2 neon-card p-6 rounded-2xl border border-slate-800">
              {fetchingKyc ? (
                <div className="py-12 text-center text-slate-400 flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
                  <span>Loading verification status...</span>
                </div>
              ) : kycStatus === 'APPROVED' ? (
                /* APPROVED VIEW */
                <div className="py-8 text-center space-y-3">
                  <div className="w-16 h-16 rounded-full bg-emerald-950 border-2 border-emerald-500 text-emerald-400 flex items-center justify-center mx-auto">
                    <ShieldCheck className="w-10 h-10" />
                  </div>
                  <h2 className="text-xl font-bold text-white">Identity Verified</h2>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    Your account has passed full KYC verification. All limits and cashout gateways are unlocked.
                  </p>
                  <div className="pt-4 border-t border-slate-800 grid grid-cols-2 gap-3 text-left text-xs max-w-md mx-auto">
                    <div>
                      <span className="text-slate-500 block">Verified Name:</span>
                      <span className="font-bold text-white">{kycDetails.fullName}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Document ID:</span>
                      <span className="font-bold text-white">{kycDetails.documentNumber}</span>
                    </div>
                  </div>
                </div>
              ) : kycStatus === 'PENDING' ? (
                /* PENDING VIEW */
                <div className="py-8 text-center space-y-3">
                  <div className="w-16 h-16 rounded-full bg-amber-950 border-2 border-amber-500 text-amber-400 flex items-center justify-center mx-auto">
                    <Clock className="w-9 h-9 animate-pulse" />
                  </div>
                  <h2 className="text-xl font-bold text-white">Verification Under Audit</h2>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    Your documents have been submitted to Monexafx Exchange compliance team. Verification typically takes 1–12 hours.
                  </p>
                  <div className="pt-4 border-t border-slate-800 text-xs text-slate-400">
                    Submitted on: {new Date(kycDetails.submittedAt).toLocaleDateString()}
                  </div>
                </div>
              ) : (
                /* UNVERIFIED / REJECTED FORM VIEW */
                <div>
                  <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                    <Upload className="w-5 h-5 text-cyan-400" /> Submit Official Verification Documents
                  </h3>

                  {kycStatus === 'REJECTED' && (
                    <div className="mb-4 p-3 bg-rose-950/60 border border-rose-800 rounded-xl text-rose-300 text-xs flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
                      <div>
                        <strong>Verification Rejected:</strong> {kycDetails.rejectionReason || 'Please re-upload clear document photos.'}
                      </div>
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                    <div>
                      <label className="block text-slate-300 mb-1 font-semibold">Full Legal Name</label>
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="As shown on official ID"
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-white font-semibold focus:outline-none focus:border-cyan-500"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-slate-300 mb-1 font-semibold">Document Type</label>
                        <select
                          value={documentType}
                          onChange={(e) => setDocumentType(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-white font-semibold focus:outline-none focus:border-cyan-500"
                        >
                          <option value="PASSPORT">National Passport</option>
                          <option value="DRIVERS_LICENSE">Driver's License</option>
                          <option value="NATIONAL_ID">Government Issued ID Card</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-slate-300 mb-1 font-semibold">Document Number</label>
                        <input
                          type="text"
                          required
                          value={documentNumber}
                          onChange={(e) => setDocumentNumber(e.target.value)}
                          placeholder="e.g. A12345678"
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-white font-semibold focus:outline-none focus:border-cyan-500"
                        />
                      </div>
                    </div>

                    {/* 3 Upload Upload Boxes */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                      {/* ID Front */}
                      <label className="cursor-pointer block border-2 border-dashed border-slate-800 hover:border-cyan-500/60 rounded-xl p-3 text-center bg-slate-900/40 relative overflow-hidden transition">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleFileChange(e, setIdFrontFile, setIdFrontPreview)}
                        />
                        {idFrontPreview ? (
                          <img src={idFrontPreview} alt="ID Front" className="h-24 w-full object-cover rounded-lg" />
                        ) : (
                          <div className="py-3">
                            <ImageIcon className="w-6 h-6 text-cyan-400 mx-auto mb-1" />
                            <span className="font-bold text-slate-300 block">ID Front Photo</span>
                            <span className="text-[10px] text-slate-500">JPG/PNG up to 5MB</span>
                          </div>
                        )}
                      </label>

                      {/* ID Back */}
                      <label className="cursor-pointer block border-2 border-dashed border-slate-800 hover:border-cyan-500/60 rounded-xl p-3 text-center bg-slate-900/40 relative overflow-hidden transition">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleFileChange(e, setIdBackFile, setIdBackPreview)}
                        />
                        {idBackPreview ? (
                          <img src={idBackPreview} alt="ID Back" className="h-24 w-full object-cover rounded-lg" />
                        ) : (
                          <div className="py-3">
                            <ImageIcon className="w-6 h-6 text-cyan-400 mx-auto mb-1" />
                            <span className="font-bold text-slate-300 block">ID Back Photo</span>
                            <span className="text-[10px] text-slate-500">JPG/PNG up to 5MB</span>
                          </div>
                        )}
                      </label>

                      {/* Live Selfie */}
                      <label className="cursor-pointer block border-2 border-dashed border-slate-800 hover:border-cyan-500/60 rounded-xl p-3 text-center bg-slate-900/40 relative overflow-hidden transition">
                        <input
                          type="file"
                          accept="image/*"
                          capture="user"
                          className="hidden"
                          onChange={(e) => handleFileChange(e, setSelfieFile, setSelfiePreview)}
                        />
                        {selfiePreview ? (
                          <img src={selfiePreview} alt="Selfie Verification" className="h-24 w-full object-cover rounded-lg" />
                        ) : (
                          <div className="py-3">
                            <ImageIcon className="w-6 h-6 text-cyan-400 mx-auto mb-1" />
                            <span className="font-bold text-slate-300 block">Selfie Verification</span>
                            <span className="text-[10px] text-slate-500">JPG/PNG up to 5MB</span>
                          </div>
                        )}
                      </label>
                    </div>

                    <button
                      type="submit"
                      disabled={submitMutation.isLoading}
                      className="btn-neon-primary w-full py-3 rounded-xl font-bold text-xs mt-2 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {submitMutation.isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Uploading Documents to Cloudinary...</span>
                        </>
                      ) : (
                        <span>Submit Documents for Audit</span>
                      )}
                    </button>
                  </form>
                </div>
              )}
            </div>

            {/* Sidebar Status Info Card */}
            <div className="neon-card p-6 rounded-2xl flex flex-col justify-between border border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white mb-3 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" /> Verification Status
                </h3>
                <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl mb-4">
                  <span className="text-xs font-bold text-white block mb-1">
                    Current Status:{' '}
                    <span className={kycStatus === 'APPROVED' ? 'text-emerald-400' : kycStatus === 'PENDING' ? 'text-amber-400' : 'text-slate-400'}>
                      {kycStatus}
                    </span>
                  </span>
                  <p className="text-[11px] text-slate-400">
                    {kycStatus === 'APPROVED'
                      ? 'Full verification complete. Unlimited cashout privileges active.'
                      : 'Tier-1 client status. Submit documents to unlock instant Binance withdrawals.'}
                  </p>
                </div>
              </div>

              <div className="space-y-2 text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Instant Binance Cashouts
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Direct Sponsor $50 Bonus Access
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      <BottomNav />
      <Toast message={toastMsg} />
    </div>
  );
};

export default VerificationPage;