import { useState } from 'react';
import { toast } from 'sonner';
import { Tag, Check, X, Loader2 } from 'lucide-react';
import { Card } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Button } from '@/app/components/ui/button';
import { projectId, publicAnonKey } from '/utils/supabase'; // ✅ FIXED: Use correct path

interface Voucher {
  id: string;
  code: string;
  discountType: 'percentage';
  discountValue: number;
  status: 'active' | 'used' | 'expired';
}

interface VoucherSectionProps {
  userId: string;
  accessToken: string;
  subtotal: number;
  onVoucherApplied: (voucher: Voucher, discountAmount: number) => void;
  onVoucherRemoved: () => void;
  appliedVoucher?: Voucher | null;
  voucherDiscount?: number;
}

export default function VoucherSection({
  userId,
  accessToken,
  subtotal,
  onVoucherApplied,
  onVoucherRemoved,
  appliedVoucher,
  voucherDiscount = 0,
}: VoucherSectionProps) {
  const [voucherCode, setVoucherCode] = useState('');
  const [isValidating, setIsValidating] = useState(false);

  const handleApplyVoucher = async () => {
    if (!voucherCode.trim()) {
      toast.error('Masukkan kode voucher terlebih dahulu');
      return;
    }

    setIsValidating(true);

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-adb995ba/vouchers/validate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Session-Token': accessToken,
          },
          body: JSON.stringify({
            code: voucherCode.trim().toUpperCase(),
          }),
        }
      );

      const data = await response.json();

      if (data.success && data.voucher) {
        const voucher = data.voucher;
        
        // Calculate discount amount
        const discountAmount = Math.round(subtotal * (voucher.discountValue / 100));
        
        onVoucherApplied(voucher, discountAmount);
        
        toast.success(data.message || 'Voucher berhasil digunakan!');
        setVoucherCode('');
      } else {
        toast.error(data.error || 'Kode voucher tidak valid');
      }
    } catch (error) {
      console.error('❌ Validate voucher error:', error);
      toast.error('Sistem voucher sedang bermasalah. Coba lagi.');
    } finally {
      setIsValidating(false);
    }
  };

  const handleRemoveVoucher = () => {
    onVoucherRemoved();
    toast.info('Voucher dihapus');
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Tag className="w-5 h-5 text-orange-600" />
        <h3 className="font-semibold text-gray-900">Voucher & Promo</h3>
      </div>

      {appliedVoucher ? (
        // Voucher Applied State
        <div className="space-y-2">
          <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                <Check className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-semibold text-green-700">{appliedVoucher.code}</p>
                <p className="text-xs text-green-600">
                  Diskon {appliedVoucher.discountValue}% · Hemat {formatPrice(voucherDiscount)}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRemoveVoucher}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-xs text-gray-500">
            Voucher telah diterapkan pada pesanan Anda
          </p>
        </div>
      ) : (
        // Voucher Input State
        <div className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="Masukkan kode voucher"
              value={voucherCode}
              onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
              disabled={isValidating}
              className="flex-1 uppercase"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleApplyVoucher();
                }
              }}
            />
            <Button
              onClick={handleApplyVoucher}
              disabled={isValidating || !voucherCode.trim()}
              className="bg-gradient-to-r from-orange-500 to-pink-600 hover:from-orange-600 hover:to-pink-700"
            >
              {isValidating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Validasi...
                </>
              ) : (
                'Gunakan'
              )}
            </Button>
          </div>
          <p className="text-xs text-gray-500">
            Gunakan voucher untuk mendapatkan potongan harga
          </p>
        </div>
      )}
    </Card>
  );
}