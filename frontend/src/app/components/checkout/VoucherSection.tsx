import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { projectId, publicAnonKey } from '/utils/supabase'; // ✅ FIXED: Corrected import path
import { Card } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Tag, AlertCircle, CheckCircle2, X, Gift } from 'lucide-react';

// ✅ FIXED: Use interface that matches server response
interface Voucher {
  id: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  status: 'active' | 'used' | 'expired';
  userId: string | null;
  userEmail?: string;
  minPurchase?: number;
  maxDiscount?: number;
  description?: string;
  usedAt?: string;
  usedInOrderId?: string;
  usedByUserIds?: string[];
  maxUsage?: number;
  usageCount?: number;
  createdAt: string;
  expiresAt?: string;
  discount?: number;
}

interface VoucherSectionProps {
  userId: string;
  accessToken: string | null;
  subtotal: number;
  onVoucherApplied: (voucher: any, discountAmount: number) => void;
  onVoucherRemoved: () => void;
  appliedVoucher?: any | null;
  voucherDiscount: number;
}

export default function VoucherSection({
  userId,
  accessToken,
  subtotal,
  onVoucherApplied,
  onVoucherRemoved,
  appliedVoucher,
  voucherDiscount,
}: VoucherSectionProps) {
  const [code, setCode] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState('');
  const [userVouchers, setUserVouchers] = useState<Voucher[]>([]);
  const [loadingVouchers, setLoadingVouchers] = useState(true);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  // ✅ Fetch user's personal vouchers on mount
  useEffect(() => {
    const fetchUserVouchers = async () => {
      if (!accessToken) {
        setLoadingVouchers(false);
        return;
      }

      try {
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-adb995ba/vouchers/my`, // ✅ FIXED: Changed from /user to /my
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`,
              'X-Session-Token': accessToken,
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.vouchers) {
            // ✅ Filter hanya voucher yang available (backend sudah filter, tapi double-check)
            const activeVouchers = data.vouchers.filter(
              (v: Voucher) => v.status === 'active'
            );
            setUserVouchers(activeVouchers);
            console.info(`✅ [VoucherSection] Loaded ${activeVouchers.length} available vouchers for user`);
          }
        }
      } catch (error) {
        console.error('Error fetching user vouchers:', error);
      } finally {
        setLoadingVouchers(false);
      }
    };

    fetchUserVouchers();
    
    // ✅ Auto-refresh vouchers setiap 5 detik untuk update real-time
    const interval = setInterval(() => {
      fetchUserVouchers();
    }, 5000);
    
    return () => clearInterval(interval);
  }, [accessToken]);

  const handleApplyVoucher = async (voucherCode?: string) => {
    const codeToUse = voucherCode || code.trim();
    
    if (!codeToUse) {
      setError('Masukkan kode voucher');
      return;
    }

    setIsValidating(true);
    setError('');

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-adb995ba/vouchers/validate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
            'X-Session-Token': accessToken || '',
          },
          body: JSON.stringify({
            code: codeToUse.toUpperCase(),
            totalAmount: subtotal,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.error || 'Gagal memvalidasi voucher');
        toast.error(errorData.error || 'Gagal memvalidasi voucher');
        return;
      }

      const data = await response.json();

      if (data.success && data.voucher) {
        const discount = data.voucher.discount || 0;
        onVoucherApplied(data.voucher, discount);
        toast.success('✅ Voucher berhasil diterapkan!');
        setCode('');
      } else {
        setError(data.error || 'Voucher tidak valid');
        toast.error(data.error || 'Voucher tidak valid');
      }
    } catch (error) {
      console.error('Error validating voucher:', error);
      setError('Gagal memvalidasi voucher');
      toast.error('Gagal memvalidasi voucher');
    } finally {
      setIsValidating(false);
    }
  };

  const handleRemove = () => {
    onVoucherRemoved();
    setCode('');
    setError('');
    toast.info('Voucher dihapus');
  };

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Tag className="w-5 h-5 text-orange-500" />
        <h2 className="font-bold text-lg text-gray-900">Kode Voucher</h2>
      </div>

      {!appliedVoucher ? (
        <>
          {/* Input Section */}
          <div className="flex gap-2 mb-3">
            <Input
              type="text"
              placeholder="Masukkan kode voucher"
              value={code}
              onChange={(e) => {
                setCode(e.target.value.toUpperCase());
                setError('');
              }}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleApplyVoucher();
                }
              }}
              disabled={isValidating}
              className="flex-1 uppercase"
            />
            <Button
              onClick={() => handleApplyVoucher()}
              disabled={isValidating || !code.trim()}
              className="bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600"
            >
              {isValidating ? 'Validasi...' : 'Terapkan'}
            </Button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded mb-3">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}

          {/* Personal Vouchers Section */}
          {!loadingVouchers && userVouchers.length > 0 && (
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-lg p-4 mb-3">
              <div className="flex items-center gap-2 mb-3">
                <Gift className="w-5 h-5 text-purple-600" />
                <p className="text-sm font-bold text-purple-800">
                  🎁 Voucher Pribadi Anda
                </p>
              </div>
              <div className="space-y-2">
                {userVouchers.map((voucher) => (
                  <div
                    key={voucher.id}
                    className="bg-white border border-purple-200 rounded-lg p-3 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono font-bold text-purple-800">
                            {voucher.code}
                          </span>
                          <span className="bg-purple-600 text-white text-xs px-2 py-0.5 rounded-full">
                            {voucher.discountType === 'percentage'
                              ? `${voucher.discountValue}%`
                              : formatPrice(voucher.discountValue)}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600">
                          {voucher.description || `Diskon ${voucher.discountValue}%`}
                        </p>
                        {voucher.minPurchase && (
                          <p className="text-xs text-gray-500 mt-1">
                            Min. pembelian: {formatPrice(voucher.minPurchase)}
                          </p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleApplyVoucher(voucher.code)}
                        disabled={isValidating}
                        className="bg-purple-600 hover:bg-purple-700 text-white"
                      >
                        Gunakan
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ❌ REMOVED: Public Vouchers Info Box */}
        </>
      ) : (
        /* Applied Voucher Display */
        <div className="bg-green-50 border-2 border-green-500 rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <span className="font-bold text-green-800 font-mono text-lg">
                  {appliedVoucher.code}
                </span>
                <span className="bg-green-600 text-white text-xs px-2 py-1 rounded-full">
                  {appliedVoucher.discountType === 'percentage'
                    ? `${appliedVoucher.discountValue}%`
                    : formatPrice(appliedVoucher.discountValue)}
                </span>
              </div>
              <p className="text-sm text-green-700 mb-3">
                {appliedVoucher.description || `Diskon ${appliedVoucher.discountValue}%`}
              </p>
              <div className="flex items-center justify-between text-sm">
                <span className="text-green-700">Hemat:</span>
                <span className="font-bold text-green-800 text-lg">
                  - {formatPrice(voucherDiscount)}
                </span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRemove}
              className="text-red-600 hover:text-red-700 hover:bg-red-100 ml-2"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}