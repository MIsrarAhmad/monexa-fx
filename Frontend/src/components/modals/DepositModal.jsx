// src/components/modals/DepositModal.jsx
import React, { useState } from 'react';
import { X, Upload, ShieldAlert, DollarSign, Copy, Check, QrCode, AlertTriangle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../../api/axiosInstance';

const ADMIN_BINANCE_PAY_ID = '876543210'; // Replace with your actual Admin Binance Pay ID
const ADMIN_TRC20_ADDRESS = 'TMonexafxUsdtDepositWalletAddress789X'; // Replace with your TRC20 address

const DepositModal = ({ isOpen, onClose, onShowToast }) => {
  const queryClient = useQueryClient();
  const [paymentMethod, setPaymentMethod] = useState('BINANCE_PAY'); // 'BINANCE_PAY' or 'TRC20'
  const [amount, setAmount] = useState('');
  const [txHash, setTxHash] = useState('');
  const [proofFile, setProofFile] = useState(null);
  const [proofPreview, setProofPreview] = useState(null);
  const [copiedField, setCopiedField] = useState(null);
  const [showQr, setShowQr] = useState(false);
  const [error, setError] = useState('');

  // 1. Fetch current user & KYC status
  const { data: meData, isLoading: loadingUser } = useQuery({
    queryKey: ['me-deposit-modal'],
    queryFn: async () => {
      const res = await axiosInstance.get('/auth/me');
      return res.data.data;
    },
    enabled: isOpen,
  });

  // 2. Fetch KYC details
  const { data: kycData } = useQuery({
    queryKey: ['kyc-status-modal'],
    queryFn: async () => {
      const res = await axiosInstance.get('/kyc/me');
      return res.data.data;
    },
    enabled: isOpen,
  });

  const currentBalance = meData?.wallet?.mainBalance || 0;
  const isKycApproved = kycData?.kycStatus === 'APPROVED';

  // Compute dynamic minimum deposit required
  let minRequired = 300;
  if (currentBalance > 0 && currentBalance < 300) {
    minRequired = 300 - currentBalance;
  } else if (currentBalance >= 300) {
    minRequired = 1;
  }

  // Deposit Submit Mutation
  const depositMutation = useMutation({
    mutationFn: async (formData) => {
      const res = await axiosInstance.post('/deposits/submit', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data;
    },
    onSuccess: (data) => {
      onShowToast(data.message || 'Deposit payment proof submitted for Admin verification!');
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      handleClose();
    },
    onError: (err) => {
      setError(err.response?.data?.error || 'Failed to submit deposit proof.');
    },
  });

  const handleCopy = (text, fieldName) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Screenshot size must be under 5MB.');
        return;
      }
      setProofFile(file);
      setProofPreview(URL.createObjectURL(file));
      setError('');
    }
  };

  const handleClose = () => {
    setAmount('');
    setTxHash('');
    setProofFile(null);
    setProofPreview(null);
    setError('');
    setShowQr(false);
    onClose();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!isKycApproved) {
      setError('KYC Verification is required before depositing.');
      return;
    }

    const depositAmount = parseFloat(amount);
    if (!depositAmount || depositAmount < minRequired) {
      setError(`Minimum required deposit for your account is $${minRequired} USDT.`);
      return;
    }

    if (!txHash.trim()) {
      setError('Please provide the Transaction Hash / Order ID (TxID).');
      return;
    }

    if (!proofFile) {
      setError('Please upload a screenshot proof of your transfer.');
      return;
    }

    const formData = new FormData();
    formData.append('amount', depositAmount);
    formData.append('txHash', txHash.trim());
    formData.append('paymentMethod', paymentMethod);
    formData.append('paymentProof', proofFile);

    depositMutation.mutate(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="neon-card bg-[#0b1322] max-w-md w-full p-6 rounded-2xl relative border border-cyan-500/40 shadow-2xl my-8">
        <button onClick={handleClose} className="absolute top-4 right-4 text-slate-400 hover:text-white">
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-cyan-950 border border-cyan-800 flex items-center justify-center text-cyan-400">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Deposit USDT</h3>
            <p className="text-xs text-slate-400">Transfer USDT to Monexafx official admin account.</p>
          </div>
        </div>

        {/* KYC Guard Check */}
        {!isKycApproved ? (
          <div className="p-4 bg-rose-950/40 border border-rose-800/60 rounded-xl text-center space-y-3 my-4">
            <AlertTriangle className="w-8 h-8 text-rose-400 mx-auto" />
            <h4 className="text-sm font-bold text-white">KYC Verification Required</h4>
            <p className="text-xs text-slate-300">
              You must verify your identity before initiating deposits. Please visit the Verification tab to upload your ID.
            </p>
          </div>
        ) : (
          <>
            {/* Dynamic Minimum Indicator */}
            {loadingUser ? (
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-400 text-center mb-4">
                Checking wallet balance...
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-cyan-950/60 border border-cyan-800 text-xs mb-4 flex justify-between items-center">
                <span className="text-slate-300">Minimum Required Deposit:</span>
                <span className="font-extrabold text-cyan-400 text-sm">${minRequired}.00 USDT</span>
              </div>
            )}

            {/* Error Alert */}
            {error && (
              <div className="mb-4 p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            {/* Payment Method Selector */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              <button
                type="button"
                onClick={() => setPaymentMethod('BINANCE_PAY')}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition ${
                  paymentMethod === 'BINANCE_PAY'
                    ? 'bg-cyan-950 text-cyan-300 border-cyan-500'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                Binance Pay ID
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('TRC20')}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition ${
                  paymentMethod === 'TRC20'
                    ? 'bg-cyan-950 text-cyan-300 border-cyan-500'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                USDT (TRC20)
              </button>
            </div>

            {/* Admin Payment Credentials Box */}
            <div className="p-4 bg-slate-900/90 rounded-xl border border-slate-800 space-y-3 mb-4 text-xs">
              {paymentMethod === 'BINANCE_PAY' ? (
                <div>
                  <span className="text-slate-400 block mb-1">Admin Binance Pay ID:</span>
                  <div className="flex items-center justify-between bg-black/40 p-2.5 rounded-lg border border-slate-700 font-mono text-cyan-400 font-bold">
                    <span>{ADMIN_BINANCE_PAY_ID}</span>
                    <button
                      onClick={() => handleCopy(ADMIN_BINANCE_PAY_ID, 'payId')}
                      className="text-slate-400 hover:text-white"
                    >
                      {copiedField === 'payId' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <span className="text-slate-400 block mb-1">Admin TRC20 Wallet Address:</span>
                  <div className="flex items-center justify-between bg-black/40 p-2.5 rounded-lg border border-slate-700 font-mono text-cyan-400 text-[11px] truncate gap-2">
                    <span className="truncate">{ADMIN_TRC20_ADDRESS}</span>
                    <button
                      onClick={() => handleCopy(ADMIN_TRC20_ADDRESS, 'trc20')}
                      className="text-slate-400 hover:text-white shrink-0"
                    >
                      {copiedField === 'trc20' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => setShowQr(!showQr)}
                className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-semibold"
              >
                <QrCode className="w-3.5 h-3.5" /> {showQr ? 'Hide Admin QR Code' : 'Show Admin QR Code'}
              </button>

              {showQr && (
                <div className="p-3 bg-white rounded-xl flex items-center justify-center">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${
                      paymentMethod === 'BINANCE_PAY' ? ADMIN_BINANCE_PAY_ID : ADMIN_TRC20_ADDRESS
                    }`}
                    alt="Admin Deposit QR Code"
                    className="w-32 h-32"
                  />
                </div>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Deposit Amount (USDT)</label>
                <input
                  type="number"
                  min={minRequired}
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder={`Minimum $${minRequired}`}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:border-cyan-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Transaction Hash / Order ID (TxID)</label>
                <input
                  type="text"
                  required
                  value={txHash}
                  onChange={(e) => setTxHash(e.target.value)}
                  placeholder="Paste TxID or Binance Pay Order ID"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:border-cyan-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Payment Proof Screenshot</label>
                <input
                  type="file"
                  accept="image/*"
                  required
                  onChange={handleFileChange}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-xs text-slate-300 focus:outline-none file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-cyan-950 file:text-cyan-300 hover:file:bg-cyan-900"
                />
                {proofPreview && (
                  <div className="mt-2">
                    <img src={proofPreview} alt="Proof preview" className="h-20 w-full object-cover rounded-lg border border-slate-800" />
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={depositMutation.isPending}
                className="w-full btn-neon-primary py-3 rounded-xl font-bold text-sm mt-2 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {depositMutation.isPending ? (
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span>Submit Deposit Proof</span>
                  </>
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default DepositModal;