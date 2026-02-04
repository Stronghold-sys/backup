import React, { useState } from 'react';
import { X, Image as ImageIcon, Video, Download, Clock, CheckCircle, XCircle, AlertCircle, Truck } from 'lucide-react';
import { Refund, getRefundStatusDisplay, getRefundTypeDisplay } from '@/lib/refundStore';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';

interface RefundDetailModalProps {
  refund: Refund;
  isOpen: boolean;
  onClose: () => void;
  isAdmin: boolean;
}

export function RefundDetailModal({ refund, isOpen, onClose, isAdmin = false }: RefundDetailModalProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  
  // ✅ DEFENSIVE CODE: Early return if modal is closed or refund is invalid
  if (!isOpen || !refund) return null;
  
  // 🔍 DEBUG: Log evidence data to console
  if (refund.evidence && refund.evidence.length > 0) {
    console.info('📸 [RefundDetailModal] Evidence data:', {
      count: refund.evidence.length,
      evidence: refund.evidence.map(ev => ({
        id: ev.id,
        type: ev.type,
        fileName: ev.fileName,
        fileSize: ev.fileSize,
        urlLength: ev.url?.length || 0,
        urlPreview: ev.url?.substring(0, 100) + '...', // Show more chars for debugging
        urlFull: ev.url, // ✅ NEW: Show full URL for debugging
      }))
    });
  } else {
    console.info('⚠️ [RefundDetailModal] No evidence found');
  }
  
  const statusDisplay = getRefundStatusDisplay(refund.status);
  
  // ENHANCED TYPE SAFETY: Safe guards for object properties
  const safeBgColor = typeof statusDisplay?.bgColor === 'string' ? statusDisplay.bgColor : 'bg-gray-100';
  const safeColor = typeof statusDisplay?.color === 'string' ? statusDisplay.color : 'text-gray-700';
  const safeLabel = typeof statusDisplay?.label === 'string' ? statusDisplay.label : 'Tidak Diketahui';

  const getStatusIcon = (status: Refund['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-600" />;
      case 'approved':
      case 'shipping':
      case 'received':
        return <Truck className="w-5 h-5 text-blue-600" />;
      case 'refunded':
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'rejected':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-600" />;
    }
  };

  return (
    <>
      {/* Overlay - ✅ FIXED: Lighter background */}
      <div
        className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
        onClick={onClose}
      >
        {/* Modal */}
        <div
          className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-6 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Detail Refund
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {refund.id}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content - Scrollable */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Status */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Status Refund</h3>
              <div className={`p-4 ${safeBgColor} rounded-lg`}>
                <div className="flex items-center gap-3 mb-2">
                  {getStatusIcon(refund.status)}
                  <span className={`text-lg font-bold ${safeColor}`}>
                    {safeLabel}
                  </span>
                </div>
                {refund.statusHistory && refund.statusHistory.length > 0 && (
                  <p className="text-sm text-gray-700 mt-2">
                    {refund.statusHistory[refund.statusHistory.length - 1].note}
                  </p>
                )}
              </div>
            </div>

            {/* Refund Info */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Informasi Refund</h3>
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-xs text-gray-600 mb-1">Order ID</p>
                  <p className="font-semibold text-gray-900">{refund.orderId}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-1">Jenis Refund</p>
                  <p className="font-semibold text-gray-900">
                    {getRefundTypeDisplay(refund.type)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-1">Jumlah Refund</p>
                  <p className="font-bold text-orange-600 text-lg">
                    Rp {refund.amount.toLocaleString('id-ID')}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-1">Tanggal Pengajuan</p>
                  <p className="font-semibold text-gray-900">
                    {new Date(refund.createdAt).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            </div>

            {/* User Info (Admin only) */}
            {isAdmin && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Informasi User</h3>
                <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Nama</p>
                    <p className="font-semibold text-gray-900">{refund.userName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Email</p>
                    <p className="font-semibold text-gray-900">{refund.userEmail}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Reason & Description */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Alasan & Deskripsi</h3>
              <div className="p-4 bg-gray-50 rounded-lg space-y-3">
                <div>
                  <p className="text-xs text-gray-600 mb-1">Alasan</p>
                  <p className="font-semibold text-gray-900">{refund.reason}</p>
                </div>
                {refund.description && (
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Deskripsi</p>
                    <p className="text-gray-900">{refund.description}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Evidence */}
            {refund.evidence && refund.evidence.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">
                  Bukti Foto/Video ({refund.evidence.length})
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {refund.evidence.map((evidence, index) => (
                    <div
                      key={evidence.id}
                      className="relative group cursor-pointer"
                      onClick={() => setSelectedImageIndex(index)}
                    >
                      <div className="aspect-square bg-gray-200 rounded-lg overflow-hidden border-2 border-gray-300 relative">
                        {evidence.type === 'image' ? (
                          evidence.url && evidence.url.length > 0 ? (
                            <>
                              {/* Loading spinner */}
                              <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                                <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                              </div>
                              {/* Actual image */}
                              <img
                                src={evidence.url}
                                alt={evidence.fileName}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform relative z-10"
                                crossOrigin="anonymous"
                                loading="lazy"
                                onLoad={(e) => {
                                  // Hide loading spinner when image loads
                                  const target = e.target as HTMLImageElement;
                                  const parent = target.parentElement;
                                  if (parent) {
                                    const spinner = parent.querySelector('div');
                                    if (spinner) spinner.style.display = 'none';
                                  }
                                  console.info('✅ Image loaded successfully:', evidence.fileName);
                                }}
                                onError={(e) => {
                                  // Fallback if image fails to load
                                  console.error('❌ Failed to load image:', evidence.url);
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                  const parent = target.parentElement;
                                  if (parent) {
                                    parent.innerHTML = `
                                      <div class="w-full h-full flex flex-col items-center justify-center bg-red-50">
                                        <svg class="w-12 h-12 text-red-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                        </svg>
                                        <p class="text-xs text-red-600 font-medium">Gagal memuat gambar</p>
                                        <p class="text-xs text-red-500 mt-1 px-2 text-center">Coba refresh halaman</p>
                                      </div>
                                    `;
                                  }
                                }}
                              />
                            </>
                          ) : (
                            // Show placeholder if URL is empty
                            <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100">
                              <ImageIcon className="w-12 h-12 text-gray-400 mb-2" />
                              <p className="text-xs text-gray-500 text-center px-2">Tidak ada gambar</p>
                            </div>
                          )
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gray-100">
                            <Video className="w-12 h-12 text-gray-400" />
                          </div>
                        )}
                      </div>
                      
                      {/* Overlay on hover */}
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 rounded-lg transition-all flex items-center justify-center">
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                          {evidence.type === 'image' ? (
                            <ImageIcon className="w-8 h-8 text-white" />
                          ) : (
                            <Video className="w-8 h-8 text-white" />
                          )}
                        </div>
                      </div>
                      
                      {/* File info */}
                      <div className="mt-1 text-xs text-gray-600 truncate" title={evidence.fileName}>
                        {evidence.fileName}
                      </div>
                      <div className="text-xs text-gray-500">
                        {(evidence.fileSize / 1024 / 1024).toFixed(2)} MB
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Return Shipping Info */}
            {refund.returnShipping && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Informasi Pengiriman Barang</h3>
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-blue-700 mb-1">Kurir</p>
                      <p className="font-semibold text-blue-900">{refund.returnShipping.courier}</p>
                    </div>
                    <div>
                      <p className="text-xs text-blue-700 mb-1">Nomor Resi</p>
                      <p className="font-semibold text-blue-900">{refund.returnShipping.trackingNumber}</p>
                    </div>
                    <div>
                      <p className="text-xs text-blue-700 mb-1">Tanggal Kirim</p>
                      <p className="font-semibold text-blue-900">
                        {new Date(refund.returnShipping.shippedAt).toLocaleDateString('id-ID')}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-blue-700 mb-1">Status</p>
                      <Badge className="bg-blue-600 text-white">
                        {refund.returnShipping.status === 'pending' && 'Menunggu'}
                        {refund.returnShipping.status === 'shipped' && 'Dalam Pengiriman'}
                        {refund.returnShipping.status === 'received' && 'Diterima'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Admin Note */}
            {refund.adminNote && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Catatan Admin</h3>
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-gray-900">{refund.adminNote}</p>
                  {refund.reviewedByName && (
                    <p className="text-xs text-gray-600 mt-2">
                      Oleh: {refund.reviewedByName} • {refund.reviewedAt && new Date(refund.reviewedAt).toLocaleString('id-ID')}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Refund Method */}
            {refund.refundMethod && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Metode Pengembalian Dana</h3>
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="font-semibold text-green-900">{refund.refundMethod}</p>
                  {refund.refundedAt && (
                    <p className="text-xs text-green-700 mt-1">
                      Dana dikembalikan pada: {new Date(refund.refundedAt).toLocaleString('id-ID')}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Status History */}
            {refund.statusHistory && refund.statusHistory.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Riwayat Status</h3>
                <div className="space-y-3">
                  {refund.statusHistory.map((history, index) => (
                    <div
                      key={index}
                      className="flex gap-3 p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex-shrink-0 mt-1">
                        {getStatusIcon(history.status)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-gray-900 capitalize">
                            {history.status}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(history.timestamp).toLocaleString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700">{history.note}</p>
                        {history.updatedByName && (
                          <p className="text-xs text-gray-500 mt-1">
                            Oleh: {history.updatedByName}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-gray-200">
            <Button
              onClick={onClose}
              className="w-full bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600"
            >
              Tutup
            </Button>
          </div>
        </div>
      </div>

      {/* Image Viewer Modal */}
      {selectedImageIndex !== null && refund.evidence && refund.evidence[selectedImageIndex] && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 z-[60] flex items-center justify-center p-4"
          onClick={() => setSelectedImageIndex(null)}
        >
          <div className="max-w-4xl w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">
                {refund.evidence[selectedImageIndex].fileName}
              </h3>
              <button
                onClick={() => setSelectedImageIndex(null)}
                className="text-white hover:text-gray-300"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            {refund.evidence[selectedImageIndex].type === 'image' ? (
              <img
                src={refund.evidence[selectedImageIndex].url}
                alt={refund.evidence[selectedImageIndex].fileName}
                className="w-full h-auto rounded-lg"
              />
            ) : (
              <video
                src={refund.evidence[selectedImageIndex].url}
                controls
                className="w-full h-auto rounded-lg"
              />
            )}

            {/* Navigation */}
            <div className="flex items-center justify-center gap-4 mt-4">
              <Button
                variant="outline"
                onClick={() => setSelectedImageIndex(Math.max(0, selectedImageIndex - 1))}
                disabled={selectedImageIndex === 0}
                className="bg-white"
              >
                Previous
              </Button>
              <span className="text-white">
                {selectedImageIndex + 1} / {refund.evidence?.length || 0}
              </span>
              <Button
                variant="outline"
                onClick={() => setSelectedImageIndex(Math.min((refund.evidence?.length || 1) - 1, selectedImageIndex + 1))}
                disabled={selectedImageIndex === (refund.evidence?.length || 1) - 1}
                className="bg-white"
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}