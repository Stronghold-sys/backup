import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import {
  ArrowLeft,
  Upload,
  FileText,
  AlertCircle,
  Check,
  X,
  Image as ImageIcon,
  Video,
  Loader2,
} from 'lucide-react';
import Layout from '@/app/components/Layout/Layout';
import { Card } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Input } from '@/app/components/ui/input';
import { toast } from 'sonner';
import { useAuthStore, Order } from '@/lib/store';
import { REFUND_REASONS } from '@/lib/refundTypes';
import { projectId, publicAnonKey } from '/utils/supabase'; // ✅ FIXED: Use correct path
import { ImageWithFallback } from '@/app/components/figma/ImageWithFallback';

interface UploadedEvidence {
  id: string;
  type: 'image' | 'video';
  url: string;
  fileName: string;
  fileSize: number;
  uploadedAt: string;
  preview?: string; // For local preview before upload
}

export default function RefundRequestPage() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { user, accessToken } = useAuthStore();

  const [order, setOrder] = useState<Order | null>(null);
  const [isLoadingOrder, setIsLoadingOrder] = useState(true);

  // Form state
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [evidence, setEvidence] = useState<UploadedEvidence[]>([]);
  
  // Upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // Submit state
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (orderId) {
      loadOrder();
    }
  }, [orderId]);

  const loadOrder = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-adb995ba/orders/${orderId}`,
        {
          method: 'GET',
          headers: {
            'X-Session-Token': accessToken || '',
            Authorization: `Bearer ${publicAnonKey}`,
          },
        }
      );

      const data = await response.json();

      if (data.success) {
        setOrder(data.order);

        // Check if order is eligible for refund
        if (data.order.status !== 'delivered') {
          toast.error('Hanya pesanan yang sudah diterima yang bisa diajukan refund');
          navigate(`/orders/${orderId}`);
        }

        // Check if already has refund
        if (data.order.hasRefund) {
          toast.error('Pesanan ini sudah memiliki pengajuan refund');
          navigate(`/orders/${orderId}`);
        }
      } else {
        toast.error('Pesanan tidak ditemukan');
        navigate('/orders');
      }
    } catch (error) {
      console.error('Error loading order:', error);
      toast.error('Gagal memuat data pesanan');
    } finally {
      setIsLoadingOrder(false);
    }
  };

  /**
   * Handle file upload to Supabase Storage
   */
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Validate file count
    if (evidence.length + files.length > 5) {
      toast.error('Maksimal 5 file bukti');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        // Validate file type
        const isImage = file.type.startsWith('image/');
        const isVideo = file.type.startsWith('video/');

        if (!isImage && !isVideo) {
          toast.error(`File ${file.name} harus berupa gambar atau video`);
          return null;
        }

        // Validate file size
        const maxSize = isVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024; // 50MB for video, 10MB for image
        if (file.size > maxSize) {
          toast.error(
            `File ${file.name} terlalu besar. Maksimal ${
              isVideo ? '50MB' : '10MB'
            }`
          );
          return null;
        }

        // Convert file to base64
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        const base64Data = await base64Promise;
        const base64Content = base64Data.split(',')[1]; // Remove data:image/jpeg;base64, prefix

        // Upload to Supabase Storage via API
        const uploadResponse = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-adb995ba/storage/refund-evidence`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Session-Token': accessToken || '',
              Authorization: `Bearer ${publicAnonKey}`,
            },
            body: JSON.stringify({
              fileName: `${user!.id}/${Date.now()}-${file.name}`,
              fileData: base64Content,
              contentType: file.type,
            }),
          }
        );

        const uploadData = await uploadResponse.json();

        if (!uploadData.success) {
          throw new Error(uploadData.error || 'Gagal upload file');
        }

        return {
          id: `evidence-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: isVideo ? 'video' : 'image',
          url: uploadData.url,
          fileName: file.name,
          fileSize: file.size,
          uploadedAt: new Date().toISOString(),
          preview: isVideo ? undefined : base64Data,
        } as UploadedEvidence;
      });

      const results = await Promise.all(uploadPromises);
      const successfulUploads = results.filter((r) => r !== null) as UploadedEvidence[];

      setEvidence((prev) => [...prev, ...successfulUploads]);
      toast.success(`${successfulUploads.length} file berhasil diupload`);
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Gagal upload file');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  /**
   * Remove evidence
   */
  const removeEvidence = (id: string) => {
    setEvidence((prev) => prev.filter((e) => e.id !== id));
  };

  /**
   * Submit refund request
   */
  const handleSubmit = async () => {
    // Validation
    if (!reason) {
      toast.error('Pilih alasan refund');
      return;
    }

    if (evidence.length === 0) {
      toast.error('Upload minimal 1 bukti foto/video');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-adb995ba/refunds`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Session-Token': accessToken || '',
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            orderId: order!.id,
            type: 'user_request',
            reason,
            description,
            amount: order!.totalAmount,
            evidence: evidence.map((e) => ({
              id: e.id,
              type: e.type,
              url: e.url,
              fileName: e.fileName,
              fileSize: e.fileSize,
              uploadedAt: e.uploadedAt,
            })),
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        toast.success('Pengajuan refund berhasil dikirim!');
        setTimeout(() => {
          navigate(`/orders/${orderId}`);
        }, 1500);
      } else {
        toast.error(data.error || 'Gagal mengajukan refund');
      }
    } catch (error) {
      console.error('Submit refund error:', error);
      toast.error('Terjadi kesalahan saat mengajukan refund');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  if (isLoadingOrder) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="w-12 h-12 animate-spin text-orange-500" />
        </div>
      </Layout>
    );
  }

  if (!order) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-gray-500">Pesanan tidak ditemukan</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(`/orders/${orderId}`)}
            className="hover:bg-gray-100"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Ajukan Pengembalian / Refund
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Pesanan #{order.id.substring(0, 12)}...
            </p>
          </div>
        </div>

        {/* Info Banner */}
        <Card className="p-4 mb-6 bg-blue-50 border-blue-200">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-blue-900">
                Informasi Penting
              </p>
              <ul className="text-xs text-blue-700 mt-2 space-y-1 list-disc list-inside">
                <li>Upload foto/video bukti unboxing wajib dilakukan</li>
                <li>Admin akan menginvestigasi pengajuan Anda dalam 1-3 hari kerja</li>
                <li>
                  Jika disetujui, Anda akan diminta mengirim barang kembali
                </li>
                <li>Dana akan dikembalikan setelah barang diterima dan diverifikasi</li>
              </ul>
            </div>
          </div>
        </Card>

        {/* Order Summary */}
        <Card className="p-6 mb-6">
          <h2 className="font-bold text-gray-900 mb-4">Ringkasan Pesanan</h2>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal Produk</span>
              <span className="font-medium">{formatPrice(order.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Ongkos Kirim</span>
              <span className="font-medium">
                {formatPrice(order.shippingCost)}
              </span>
            </div>
            {order.discount && order.discount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Diskon Voucher</span>
                <span className="font-medium text-green-600">
                  -{formatPrice(order.discount)}
                </span>
              </div>
            )}
            <div className="h-px bg-gray-200"></div>
            <div className="flex justify-between">
              <span className="font-semibold text-gray-900">
                Total yang akan dikembalikan
              </span>
              <span className="text-lg font-bold text-orange-600">
                {formatPrice(order.totalAmount)}
              </span>
            </div>
          </div>
        </Card>

        {/* Refund Form */}
        <Card className="p-6 mb-6">
          <h2 className="font-bold text-gray-900 mb-6">Form Pengajuan Refund</h2>

          {/* Reason */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Alasan Refund <span className="text-red-500">*</span>
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="">Pilih alasan...</option>
              {REFUND_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Deskripsi Tambahan
              <span className="text-gray-500 text-xs ml-2">(Opsional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Jelaskan kondisi barang atau alasan refund lebih detail..."
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Evidence Upload */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bukti Foto / Video <span className="text-red-500">*</span>
            </label>
            <p className="text-xs text-gray-500 mb-3">
              Upload foto/video unboxing atau kondisi barang (Maksimal 5 file)
            </p>

            {/* Upload Button */}
            <div className="mb-4">
              <input
                type="file"
                id="evidence-upload"
                accept="image/*,video/*"
                multiple
                onChange={handleFileUpload}
                className="hidden"
                disabled={isUploading || evidence.length >= 5}
              />
              <label
                htmlFor="evidence-upload"
                className={`flex items-center justify-center gap-2 px-6 py-3 border-2 border-dashed rounded-lg cursor-pointer transition ${
                  isUploading || evidence.length >= 5
                    ? 'border-gray-300 bg-gray-50 cursor-not-allowed'
                    : 'border-orange-300 bg-orange-50 hover:bg-orange-100'
                }`}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin text-orange-600" />
                    <span className="text-orange-600 font-medium">
                      Uploading... {uploadProgress}%
                    </span>
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5 text-orange-600" />
                    <span className="text-orange-600 font-medium">
                      {evidence.length >= 5
                        ? 'Maksimal 5 file tercapai'
                        : 'Klik untuk upload bukti'}
                    </span>
                  </>
                )}
              </label>
            </div>

            {/* Evidence Preview */}
            {evidence.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {evidence.map((item) => (
                  <div
                    key={item.id}
                    className="relative group border border-gray-200 rounded-lg overflow-hidden"
                  >
                    {item.type === 'image' ? (
                      <div className="aspect-square">
                        <ImageWithFallback
                          src={item.preview || item.url}
                          alt={item.fileName}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="aspect-square bg-gray-100 flex flex-col items-center justify-center">
                        <Video className="w-12 h-12 text-gray-400 mb-2" />
                        <p className="text-xs text-gray-600 px-2 text-center">
                          {item.fileName}
                        </p>
                      </div>
                    )}

                    {/* Remove button */}
                    <button
                      onClick={() => removeEvidence(item.id)}
                      className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-red-600"
                    >
                      <X className="w-4 h-4" />
                    </button>

                    {/* File info */}
                    <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="text-xs truncate">{item.fileName}</p>
                      <p className="text-xs">
                        {(item.fileSize / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {evidence.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-8 border border-dashed border-gray-300 rounded-lg">
                Belum ada bukti yang diupload
              </p>
            )}
          </div>
        </Card>

        {/* Submit Button */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => navigate(`/orders/${orderId}`)}
            disabled={isSubmitting}
            className="flex-1"
          >
            Batal
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !reason || evidence.length === 0}
            className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold py-3"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Mengirim...
              </>
            ) : (
              <>
                <Check className="w-5 h-5 mr-2" />
                Kirim Pengajuan Refund
              </>
            )}
          </Button>
        </div>
      </div>
    </Layout>
  );
}