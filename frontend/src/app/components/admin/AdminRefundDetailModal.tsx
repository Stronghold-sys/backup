import React, { useState } from 'react';
import { X, CheckCircle, XCircle, Truck, AlertCircle } from 'lucide-react';
import { Refund } from '@/lib/refundStore';
import { useAuthStore } from '@/lib/store';
import { useRefundStore } from '@/lib/refundStore';
import { Button } from '@/app/components/ui/button';
import { RefundDetailModal } from '../user/RefundDetailModal';
import { ErrorBoundary } from '@/app/components/ErrorBoundary';

interface AdminRefundDetailModalProps {
  refund: Refund;
  isOpen: boolean;
  onClose: () => void;
}

const COURIERS = ['JNE', 'J&T', 'SiCepat', 'AnterAja', 'Ninja Express', 'ID Express'];

function AdminRefundDetailModalInner({ refund, isOpen, onClose }: AdminRefundDetailModalProps) {
  const { accessToken } = useAuthStore(); // ✅ FIXED: Use accessToken instead of token
  const { updateRefundStatus } = useRefundStore();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Approve modal
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [adminNote, setAdminNote] = useState('');
  const [selectedCourier, setSelectedCourier] = useState('');
  
  // Reject modal
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  
  // Confirm received modal
  const [showReceivedModal, setShowReceivedModal] = useState(false);
  const [refundMethod, setRefundMethod] = useState('Transfer Bank');

  if (!isOpen) return null;

  const handleApprove = async () => {
    if (!accessToken) return;
    
    setIsProcessing(true);
    setError(null);
    
    try {
      const trackingNumber = `TRK-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
      
      const result = await updateRefundStatus(
        refund.id,
        'approved',
        'Refund disetujui. Silakan kirim barang menggunakan jasa pengiriman yang ditentukan.',
        {
          adminNote,
          returnShipping: {
            courier: selectedCourier,
            trackingNumber,
            shippedAt: new Date().toISOString(),
            status: 'pending',
          },
        },
        accessToken
      );
      
      if (result.success) {
        setShowApproveModal(false);
        onClose();
      } else {
        setError(result.error || 'Gagal menyetujui refund');
      }
    } catch (error: any) {
      setError(error.message || 'Terjadi kesalahan');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!accessToken || !rejectReason) {
      setError('Alasan penolakan wajib diisi');
      return;
    }
    
    setIsProcessing(true);
    setError(null);
    
    try {
      const result = await updateRefundStatus(
        refund.id,
        'rejected',
        `Refund ditolak: ${rejectReason}`,
        {
          adminNote: rejectReason,
        },
        accessToken
      );
      
      if (result.success) {
        setShowRejectModal(false);
        onClose();
      } else {
        setError(result.error || 'Gagal menolak refund');
      }
    } catch (error: any) {
      setError(error.message || 'Terjadi kesalahan');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmReceived = async () => {
    if (!accessToken || !refundMethod) {
      setError('Metode refund wajib dipilih');
      return;
    }
    
    setIsProcessing(true);
    setError(null);
    
    try {
      const result = await updateRefundStatus(
        refund.id,
        'refunded',
        `Dana telah dikembalikan melalui ${refundMethod}`,
        {
          refundMethod,
          returnShipping: {
            ...refund.returnShipping!,
            status: 'received',
            receivedAt: new Date().toISOString(),
          },
        },
        accessToken
      );
      
      if (result.success) {
        setShowReceivedModal(false);
        onClose();
      } else {
        setError(result.error || 'Gagal memproses refund');
      }
    } catch (error: any) {
      setError(error.message || 'Terjadi kesalahan');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      {/* Main Detail Modal */}
      <RefundDetailModal
        refund={refund}
        isOpen={isOpen && !showApproveModal && !showRejectModal && !showReceivedModal}
        onClose={onClose}
        isAdmin={true}
      />

      {/* Admin Actions Overlay (on top of detail modal) */}
      {isOpen && !showApproveModal && !showRejectModal && !showReceivedModal && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-[51] shadow-lg">
          <div className="max-w-4xl mx-auto flex gap-3">
            {refund.status === 'pending' && (
              <>
                <Button
                  onClick={() => setShowApproveModal(true)}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Setujui Refund
                </Button>
                <Button
                  onClick={() => setShowRejectModal(true)}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                  variant="destructive"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Tolak Refund
                </Button>
              </>
            )}
            
            {refund.status === 'approved' && refund.returnShipping && (
              <Button
                onClick={() => setShowReceivedModal(true)}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Truck className="w-4 h-4 mr-2" />
                Konfirmasi Barang Diterima
              </Button>
            )}
            
            {/* ✅ NEW: Shipping status - admin can confirm received */}
            {refund.status === 'shipping' && (
              <Button
                onClick={() => setShowReceivedModal(true)}
                className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white animate-pulse"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Barang Diterima - Refund Dana
              </Button>
            )}
            
            {refund.status === 'received' && (
              <div className="flex-1 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-center">
                <AlertCircle className="w-5 h-5 text-yellow-600 inline mr-2" />
                <span className="text-sm text-yellow-900 font-semibold">
                  Menunggu proses pengembalian dana
                </span>
              </div>
            )}
            
            {['refunded', 'completed', 'rejected'].includes(refund.status) && (
              <div className="flex-1 p-3 bg-gray-50 border border-gray-200 rounded-lg text-center">
                <span className="text-sm text-gray-700 font-semibold">
                  Refund telah {refund.status === 'rejected' ? 'ditolak' : 'selesai diproses'}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Approve Modal */}
      {showApproveModal && (
        <div
          className="fixed inset-0 bg-white/95 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
          onClick={() => setShowApproveModal(false)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Setujui Refund</h3>
              <button
                onClick={() => setShowApproveModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <div className="space-y-4">
              {/* Courier Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Jasa Pengiriman untuk Pengembalian Barang <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedCourier}
                  onChange={(e) => setSelectedCourier(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                >
                  <option value="">-- Pilih Kurir --</option>
                  {COURIERS.map((courier) => (
                    <option key={courier} value={courier}>{courier}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-600 mt-1">
                  User akan mengirim barang menggunakan kurir ini
                </p>
              </div>

              {/* Admin Note */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Catatan untuk Customer (Opsional)
                </label>
                <textarea
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                  rows={3}
                  placeholder="Contoh: Pastikan produk dikemas dengan baik..."
                />
              </div>

              {/* Info */}
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-900">
                  <strong>Catatan:</strong> Setelah disetujui, customer akan menerima notifikasi 
                  dan instruksi untuk mengirim barang kembali. Nomor resi akan otomatis dibuat.
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowApproveModal(false)}
                  className="flex-1"
                  disabled={isProcessing}
                >
                  Batal
                </Button>
                <Button
                  onClick={handleApprove}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                  disabled={isProcessing || !selectedCourier}
                >
                  {isProcessing ? 'Memproses...' : 'Setujui'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div
          className="fixed inset-0 bg-white/95 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
          onClick={() => setShowRejectModal(false)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Tolak Refund</h3>
              <button
                onClick={() => setShowRejectModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <div className="space-y-4">
              {/* Reject Reason */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Alasan Penolakan <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                  rows={4}
                  placeholder="Jelaskan alasan penolakan refund..."
                  required
                />
              </div>

              {/* Warning */}
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-900">
                  <strong>Peringatan:</strong> Setelah ditolak, customer akan menerima notifikasi 
                  penolakan dan alasan yang Anda berikan.
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowRejectModal(false)}
                  className="flex-1"
                  disabled={isProcessing}
                >
                  Batal
                </Button>
                <Button
                  onClick={handleReject}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                  disabled={isProcessing || !rejectReason}
                >
                  {isProcessing ? 'Memproses...' : 'Tolak Refund'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Received Modal */}
      {showReceivedModal && (
        <div
          className="fixed inset-0 bg-white/95 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
          onClick={() => setShowReceivedModal(false)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Konfirmasi Barang Diterima</h3>
              <button
                onClick={() => setShowReceivedModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <div className="space-y-4">
              {/* Refund Method */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Metode Pengembalian Dana <span className="text-red-500">*</span>
                </label>
                <select
                  value={refundMethod}
                  onChange={(e) => setRefundMethod(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="Transfer Bank">Transfer Bank</option>
                  <option value="E-Wallet (OVO)">E-Wallet (OVO)</option>
                  <option value="E-Wallet (GoPay)">E-Wallet (GoPay)</option>
                  <option value="E-Wallet (Dana)">E-Wallet (Dana)</option>
                  <option value="Saldo Marketplace">Saldo Marketplace</option>
                </select>
              </div>

              {/* Info */}
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-900 font-semibold mb-2">
                  Konfirmasi Penerimaan Barang
                </p>
                <ul className="text-sm text-green-800 space-y-1 list-disc list-inside">
                  <li>Barang telah diterima dari customer</li>
                  <li>Kondisi barang sesuai dengan bukti yang diupload</li>
                  <li>Dana akan dikembalikan ke customer</li>
                  <li>Status refund akan diubah menjadi "Refunded"</li>
                </ul>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowReceivedModal(false)}
                  className="flex-1"
                  disabled={isProcessing}
                >
                  Batal
                </Button>
                <Button
                  onClick={handleConfirmReceived}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={isProcessing}
                >
                  {isProcessing ? 'Memproses...' : 'Proses Refund'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function AdminRefundDetailModal({ refund, isOpen, onClose }: AdminRefundDetailModalProps) {
  return (
    <ErrorBoundary>
      <AdminRefundDetailModalInner refund={refund} isOpen={isOpen} onClose={onClose} />
    </ErrorBoundary>
  );
}