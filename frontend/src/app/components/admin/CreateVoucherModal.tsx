import { useState, useEffect } from 'react';
import { X, Tag, RefreshCw, Copy, Check, Sparkles } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { projectId, publicAnonKey } from '/utils/supabase'; // ✅ FIXED: Corrected import path
import { useAuthStore } from '@/lib/store';
import { toast } from 'sonner';

interface CreateVoucherModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVoucherCreated?: () => void;
}

export default function CreateVoucherModal({ isOpen, onClose, onVoucherCreated }: CreateVoucherModalProps) {
  const { accessToken } = useAuthStore();
  const [voucherCode, setVoucherCode] = useState('');
  const [discountValue, setDiscountValue] = useState('10');
  const [userEmail, setUserEmail] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      generateVoucherCode();
    }
  }, [isOpen]);

  // Generate random voucher code
  const generateVoucherCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = 'PROMO';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setVoucherCode(code);
    setIsCopied(false);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(voucherCode);
    setIsCopied(true);
    toast.success('Kode voucher disalin!');
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validations
    if (!voucherCode || !discountValue || !userEmail) {
      toast.error('Semua field harus diisi');
      return;
    }

    setIsCreating(true);

    try {
      // ✅ Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-adb995ba/vouchers/create`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`, // ✅ Required by Supabase Edge Functions
            'X-Session-Token': accessToken!, // ✅ Our custom user token
          },
          body: JSON.stringify({
            code: voucherCode.toUpperCase(),
            discountValue: parseInt(discountValue),
            userEmail: userEmail.trim().toLowerCase(),
          }),
          signal: controller.signal, // ✅ Add abort signal
        }
      );

      clearTimeout(timeoutId);

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success('Voucher berhasil dibuat!');
        onClose();
        // Call callback to refresh parent data
        if (onVoucherCreated) {
          onVoucherCreated();
        }
      } else {
        toast.error(data.error || 'Gagal membuat voucher');
      }
    } catch (error: any) {
      // ✅ Better error handling
      if (error.name === 'AbortError') {
        toast.error('Request timeout. Server mungkin sedang sibuk, silakan coba lagi.');
      } else if (error.message?.includes('Failed to fetch')) {
        toast.error('Gagal terhubung ke server. Periksa koneksi internet atau coba lagi nanti.');
      } else if (error.message?.includes('401') || error.message?.includes('403')) {
        toast.error('Anda tidak memiliki akses untuk membuat voucher.');
      } else {
        toast.error('Terjadi kesalahan saat membuat voucher. Silakan coba lagi.');
      }
    } finally {
      setIsCreating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-orange-50 to-pink-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-pink-600 rounded-lg flex items-center justify-center">
              <Tag className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Buat Voucher Baru</h2>
              <p className="text-sm text-gray-600">Buat voucher diskon untuk pengguna</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white hover:bg-gray-100 flex items-center justify-center transition shadow-sm"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Voucher Code */}
          <div className="space-y-2">
            <Label htmlFor="voucherCode" className="text-sm font-semibold text-gray-700">
              Kode Voucher <span className="text-red-500">*</span>
            </Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="voucherCode"
                  value={voucherCode}
                  onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                  placeholder="PROMO123ABC"
                  className="font-mono font-bold text-lg uppercase pr-10"
                  maxLength={20}
                  required
                />
                <button
                  type="button"
                  onClick={copyToClipboard}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 hover:bg-gray-100 rounded transition"
                  title="Salin kode"
                >
                  {isCopied ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4 text-gray-400" />
                  )}
                </button>
              </div>
              <Button
                type="button"
                onClick={generateVoucherCode}
                variant="outline"
                size="icon"
                className="flex-shrink-0"
                title="Generate kode baru"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Klik tombol refresh untuk generate kode otomatis
            </p>
          </div>

          {/* Discount Value */}
          <div className="space-y-2">
            <Label htmlFor="discountValue" className="text-sm font-semibold text-gray-700">
              Persentase Diskon <span className="text-red-500">*</span>
            </Label>
            <Select value={discountValue} onValueChange={setDiscountValue}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih diskon..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5% - Diskon Ringan</SelectItem>
                <SelectItem value="10">10% - Diskon Standar</SelectItem>
                <SelectItem value="15">15% - Diskon Menarik</SelectItem>
                <SelectItem value="20">20% - Diskon Besar</SelectItem>
                <SelectItem value="25">25% - Diskon Spesial</SelectItem>
                <SelectItem value="30">30% - Diskon Fantastis</SelectItem>
                <SelectItem value="50">50% - Diskon Jumbo</SelectItem>
                <SelectItem value="75">75% - Diskon Super</SelectItem>
                <SelectItem value="100">100% - Gratis!</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">
              Diskon akan diterapkan pada total belanja pengguna
            </p>
          </div>

          {/* User Email */}
          <div className="space-y-2">
            <Label htmlFor="userEmail" className="text-sm font-semibold text-gray-700">
              Email Pengguna <span className="text-red-500">*</span>
            </Label>
            <Input
              id="userEmail"
              type="email"
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
              placeholder="user@example.com"
              className="lowercase"
              required
            />
            <p className="text-xs text-gray-500">
              Voucher hanya dapat digunakan oleh email ini
            </p>
          </div>

          {/* Info Card */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-blue-900 mb-2">💡 Informasi</h4>
            <ul className="text-xs text-blue-800 space-y-1">
              <li>• Voucher bersifat personal dan hanya bisa digunakan sekali</li>
              <li>• Kode voucher harus unik dan belum digunakan sebelumnya</li>
              <li>• Pengguna akan melihat voucher ini di halaman checkout</li>
              <li>• Voucher otomatis aktif setelah dibuat</li>
            </ul>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
              className="flex-1"
              disabled={isCreating}
            >
              Batal
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-gradient-to-r from-orange-500 to-pink-600 hover:from-orange-600 hover:to-pink-700 text-white"
              disabled={isCreating}
            >
              {isCreating ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Membuat...
                </>
              ) : (
                <>
                  <Tag className="w-4 h-4 mr-2" />
                  Buat Voucher
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}