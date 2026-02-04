import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { AlertCircle, X, Upload, Video, CheckCircle, ArrowLeft } from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import { useRefundStore, RefundEvidence } from '@/lib/refundStore';
import { projectId, publicAnonKey } from '/utils/supabase'; // ✅ FIXED: Corrected import path
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';

interface Order {
  id: string;
  totalAmount: number;
  items: any[];
  status: string;
  shippingAddress: any;
}

const REFUND_REASONS = [
  'Produk tidak sesuai deskripsi',
  'Produk rusak/cacat',
  'Produk tidak lengkap',
  'Produk palsu/KW',
  'Salah kirim produk',
  'Ukuran tidak sesuai',
  'Warna tidak sesuai',
  'Kualitas tidak memuaskan',
  'Lainnya',
];

export function CreateRefundPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, token } = useAuthStore();
  const { createRefund, isLoading } = useRefundStore();
  
  // Get order from navigation state
  const order: Order | null = location.state?.order || null;
  
  // Form state
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [uploadedEvidences, setUploadedEvidences] = useState<RefundEvidence[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login', { state: { from: '/refunds/create' } });
    }
    
    if (!order) {
      navigate('/orders');
    }
    
    // Check if order is eligible for refund (status must be delivered)
    if (order && order.status !== 'delivered') {
      setError('Refund hanya dapat diajukan untuk pesanan yang sudah terkirim');
    }
  }, [user, order, navigate]);

  // Upload files to Supabase Storage
  const uploadFileToSupabase = async (file: File): Promise<RefundEvidence | null> => {
    try {
      const bucketName = 'make-adb995ba-refund-evidence';
      const fileName = `temp/${Date.now()}-${file.name}`;
      
      // Create Supabase client
      const supabaseUrl = `https://${projectId}.supabase.co`;
      
      // Read file as base64 for now (we'll upload via backend)
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
      
      const base64Data = await base64Promise;
      
      // Create evidence object
      const evidence: RefundEvidence = {
        id: `EV-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: file.type.startsWith('video/') ? 'video' : 'image',
        url: base64Data, // Base64 for preview
        fileName: file.name,
        fileSize: file.size,
        uploadedAt: new Date().toISOString(),
      };
      
      return evidence;
    } catch (error: any) {
      console.error('Upload error:', error);
      return null;
    }
  };

  // Handle file selection
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (files.length === 0) return;
    
    // Validate file size (max 50MB per file)
    const invalidFiles = files.filter(f => f.size > 50 * 1024 * 1024);
    if (invalidFiles.length > 0) {
      setError(`File terlalu besar: ${invalidFiles.map(f => f.name).join(', ')}. Maksimal 50MB per file.`);
      return;
    }
    
    // Validate file type (image or video only)
    const invalidTypes = files.filter(f => !f.type.startsWith('image/') && !f.type.startsWith('video/'));
    if (invalidTypes.length > 0) {
      setError(`File tidak valid: ${invalidTypes.map(f => f.name).join(', ')}. Hanya image/video yang diperbolehkan.`);
      return;
    }
    
    setIsUploading(true);
    setError(null);
    
    try {
      const evidences: RefundEvidence[] = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadProgress(((i + 1) / files.length) * 100);
        
        const evidence = await uploadFileToSupabase(file);
        if (evidence) {
          evidences.push(evidence);
        }
      }
      
      setUploadedFiles([...uploadedFiles, ...files]);
      setUploadedEvidences([...uploadedEvidences, ...evidences]);
      setUploadProgress(0);
    } catch (error: any) {
      console.error('File upload error:', error);
      setError('Gagal mengupload file. Silakan coba lagi.');
    } finally {
      setIsUploading(false);
    }
  };

  // Remove uploaded file
  const removeFile = (index: number) => {
    setUploadedFiles(uploadedFiles.filter((_, i) => i !== index));
    setUploadedEvidences(uploadedEvidences.filter((_, i) => i !== index));
  };

  // Submit refund request
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!reason) {
      setError('Pilih alasan refund');
      return;
    }
    
    if (uploadedEvidences.length === 0) {
      setError('Upload minimal 1 bukti foto/video unboxing');
      return;
    }
    
    if (!token || !order) return;
    
    setError(null);
    
    try {
      const result = await createRefund({
        orderId: order.id,
        type: 'user_request',
        reason,
        description,
        amount: order.totalAmount,
        evidence: uploadedEvidences,
      }, token);
      
      if (result.success) {
        setSuccess(true);
        
        // Redirect after 2 seconds
        setTimeout(() => {
          navigate('/refunds');
        }, 2000);
      } else {
        setError(result.error || 'Gagal mengajukan refund');
      }
    } catch (error: any) {
      console.error('Submit refund error:', error);
      setError('Terjadi kesalahan. Silakan coba lagi.');
    }
  };

  if (!order) {
    return null;
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-pink-50 to-purple-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Refund Berhasil Diajukan!
            </h3>
            <p className="text-gray-600 mb-4">
              Pengajuan refund Anda sedang diproses oleh admin. Anda akan menerima notifikasi melalui email.
            </p>
            <p className="text-sm text-gray-500">
              Redirecting ke halaman refund...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-pink-50 to-purple-50 py-8">
      <div className="max-w-3xl mx-auto px-4">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali
          </Button>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Ajukan Pengembalian / Refund
          </h1>
          <p className="text-gray-600">
            Order ID: <span className="font-semibold">{order.id}</span>
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-red-900 mb-1">Error</h4>
              <p className="text-sm text-red-700">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-600 hover:text-red-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Detail Refund</CardTitle>
              <CardDescription>
                Isi form di bawah ini untuk mengajukan pengembalian barang dan dana
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Order Summary */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-2">Ringkasan Pesanan</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Produk:</span>
                    <span className="font-semibold">{order.items?.length || 0} item</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Pembayaran:</span>
                    <span className="font-semibold text-lg">
                      Rp {order.totalAmount.toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Reason */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Alasan Refund <span className="text-red-500">*</span>
                </label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  required
                >
                  <option value="">-- Pilih Alasan --</option>
                  {REFUND_REASONS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Deskripsi Tambahan (Opsional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                  rows={4}
                  placeholder="Jelaskan detail masalah yang Anda alami..."
                />
              </div>

              {/* Evidence Upload */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Upload Bukti Foto/Video <span className="text-red-500">*</span>
                </label>
                <p className="text-sm text-gray-600 mb-3">
                  Upload foto atau video unboxing produk untuk mempercepat proses refund. 
                  Maksimal 50MB per file.
                </p>
                
                {/* Upload Button */}
                <div className="relative">
                  <input
                    type="file"
                    id="evidence-upload"
                    accept="image/*,video/*"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                    disabled={isUploading}
                  />
                  <label
                    htmlFor="evidence-upload"
                    className={`
                      flex items-center justify-center gap-2 px-6 py-4 
                      border-2 border-dashed border-gray-300 rounded-lg
                      cursor-pointer hover:border-orange-500 hover:bg-orange-50
                      transition-colors
                      ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                  >
                    <Upload className="w-5 h-5 text-gray-500" />
                    <span className="font-medium text-gray-700">
                      {isUploading ? 'Uploading...' : 'Pilih Foto/Video'}
                    </span>
                  </label>
                </div>

                {/* Upload Progress */}
                {isUploading && (
                  <div className="mt-3">
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-orange-500 to-pink-500 transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    <p className="text-sm text-gray-600 mt-1 text-center">
                      Uploading... {Math.round(uploadProgress)}%
                    </p>
                  </div>
                )}

                {/* Uploaded Files Preview */}
                {uploadedEvidences.length > 0 && (
                  <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {uploadedEvidences.map((evidence, index) => (
                      <div key={evidence.id} className="relative group">
                        <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                          {evidence.type === 'image' ? (
                            <img
                              src={evidence.url}
                              alt={evidence.fileName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Video className="w-12 h-12 text-gray-400" />
                            </div>
                          )}
                        </div>
                        
                        {/* Remove button */}
                        <button
                          type="button"
                          onClick={() => removeFile(index)}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-4 h-4" />
                        </button>
                        
                        {/* File info */}
                        <div className="mt-1 text-xs text-gray-600 truncate">
                          {evidence.fileName}
                        </div>
                        <div className="text-xs text-gray-500">
                          {(evidence.fileSize / 1024 / 1024).toFixed(2)} MB
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-blue-900">
                    <p className="font-semibold mb-1">Informasi Penting:</p>
                    <ul className="list-disc list-inside space-y-1 text-blue-800">
                      <li>Pastikan foto/video jelas dan menunjukkan kondisi produk</li>
                      <li>Admin akan mereview pengajuan dalam 1-3 hari kerja</li>
                      <li>Jika disetujui, Anda akan mendapat instruksi pengiriman barang</li>
                      <li>Dana akan dikembalikan setelah barang diterima admin</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(-1)}
              className="flex-1"
              disabled={isLoading}
            >
              Batal
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white"
              disabled={isLoading || isUploading || uploadedEvidences.length === 0}
            >
              {isLoading ? 'Mengirim...' : 'Kirim Pengajuan Refund'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}