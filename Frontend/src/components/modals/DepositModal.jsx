// src/components/modals/DepositModal.jsx
import { useState } from 'react';
import { X, Upload, ShieldAlert, DollarSign, Copy, Check, QrCode, AlertTriangle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../../api/axiosInstance';

const ADMIN_TRC20_ADDRESS = import.meta.env.VITE_TRC20_DEPOSIT_ADDRESS || '';
const isValidTrc20Address = (address) => /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(address);
const hasDepositAddress = isValidTrc20Address(ADMIN_TRC20_ADDRESS);

const DepositModal = ({ isOpen, onClose, onShowToast }) => {
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState('');
  const [txHash, setTxHash] = useState('');
  const [proofFile, setProofFile] = useState(null);
  const [proofPreview, setProofPreview] = useState(null);
  const [copiedField, setCopiedField] = useState(null);
  const [showQr, setShowQr] = useState(false);
  const [error, setError] = useState('');

  // Fetch KYC details
  const { data: kycData } = useQuery({
    queryKey: ['kyc-status-modal'],
    queryFn: async () => {
      const res = await axiosInstance.get('/kyc/me');
      return res.data.data;
    },
    enabled: isOpen,
  });

  const isKycApproved = kycData?.kycStatus === 'APPROVED';
  const minRequired = 30;

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

    if (!hasDepositAddress) {
      setError('The official USDT TRC20 deposit address is not available yet. Do not send funds until it is displayed here.');
      return;
    }

    if (!isKycApproved) {
      setError('KYC Verification is required before depositing.');
      return;
    }

    const depositAmount = parseFloat(amount);
    if (!depositAmount || depositAmount < minRequired) {
      setError(`The minimum deposit is $${minRequired} USDT.`);
      return;
    }

    if (!txHash.trim()) {
      setError('Please provide the TRC20 transaction ID (TxID).');
      return;
    }

    if (!proofFile) {
      setError('Please upload a screenshot proof of your transfer.');
      return;
    }

    const formData = new FormData();
    formData.append('amount', depositAmount);
    formData.append('txHash', txHash.trim());
    formData.append('paymentMethod', 'TRC20');
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
            <p className="text-xs text-slate-400">Deposit USDT using the TRON (TRC20) network only.</p>
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
            <div className="p-3 rounded-xl bg-cyan-950/60 border border-cyan-800 text-xs mb-4 flex justify-between items-center">
              <span className="text-slate-300">Minimum per deposit:</span>
              <span className="font-extrabold text-cyan-400 text-sm">${minRequired}.00 USDT</span>
            </div>
            <p className="text-xs text-slate-400 -mt-2 mb-4">
              Daily yield activates when your main balance reaches $300 USDT.
            </p>

            {/* Error Alert */}
            {error && (
              <div className="mb-4 p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            {/* Official deposit address is configured after the owner provides it. */}
            <div className="p-4 bg-slate-900/90 rounded-xl border border-slate-800 space-y-3 mb-4 text-xs">
              {hasDepositAddress ? (
                <div>
                  <span className="text-slate-400 block mb-1">Official USDT TRC20 Deposit Address:</span>
                  <div className="flex items-center justify-between bg-black/40 p-2.5 rounded-lg border border-slate-700 font-mono text-cyan-400 text-[11px] gap-2">
                    <span className="truncate">{ADMIN_TRC20_ADDRESS}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(ADMIN_TRC20_ADDRESS, 'trc20')}
                      className="text-slate-400 hover:text-white shrink-0"
                    >
                      {copiedField === 'trc20' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-amber-300">
                  The official USDT TRC20 deposit address has not been added yet. Do not send funds until the address is shown here.
                </div>
              )}

              {hasDepositAddress && (
                <button
                  type="button"
                  onClick={() => setShowQr(!showQr)}
                  className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-semibold"
                >
                  <QrCode className="w-3.5 h-3.5" /> {showQr ? 'Hide TRC20 QR Code' : 'Show TRC20 QR Code'}
                </button>
              )}

              {showQr && hasDepositAddress && (
                <div className="p-3 bg-white rounded-xl flex items-center justify-center">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(ADMIN_TRC20_ADDRESS)}`}
                    alt="USDT TRC20 Deposit QR Code"
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
                <label className="block text-xs font-medium text-slate-400 mb-1">TRC20 Transaction ID (TxID)</label>
                <input
                  type="text"
                  required
                  value={txHash}
                  onChange={(e) => setTxHash(e.target.value)}
                  placeholder="Paste your TRC20 transaction ID (TxID)"
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
                disabled={depositMutation.isPending || !hasDepositAddress}
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