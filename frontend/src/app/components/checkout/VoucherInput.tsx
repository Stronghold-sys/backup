import { useState } from 'react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Tag, X } from 'lucide-react';
import { projectId, publicAnonKey } from '/utils/supabase';
import { authStoreInstance } from '@/lib/store'; // ✅ FIXED: Import store instance

interface VoucherData {
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  discount: number;
  description: string;
  id?: string;
}

interface VoucherInputProps {
  totalAmount: number;
  onApply: (voucher: VoucherData) => void;
  onRemove: () => void;
  appliedVoucher?: VoucherData | null;
  disabled?: boolean;
}

export default function VoucherInput({
  totalAmount,
  onApply,
  onRemove,
  appliedVoucher,
  disabled = false,
}: VoucherInputProps) {
  const [code, setCode] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState('');
  const [showMyVouchers, setShowMyVouchers] = useState(false);

  const handleApplyVoucher = async () => {
    if (!code.trim()) {
      setError('Masukkan kode voucher');
      return;
    }

    setIsValidating(true);
    setError('');

    try {
      // ✅ FIXED: Get token from store instance (in-memory) instead of localStorage
      const { accessToken } = authStoreInstance.getState(); // ✅ Use instance
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-adb995ba/voucher/validate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
            'X-Session-Token': accessToken || '',
          },
          body: JSON.stringify({
            code: code.trim().toUpperCase(),
            totalAmount,
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        onApply(data.voucher);
        toast.success('✅ Voucher berhasil diterapkan!');
        setCode('');
      } else {
        setError(data.error || 'Voucher tidak valid');
        toast.error(data.error || 'Voucher tidak valid');
      }
    } catch (error) {
      setError('Gagal memvalidasi voucher');
      toast.error('Gagal memvalidasi voucher');
    } finally {
      setIsValidating(false);
    }
  };

  const handleRemove = () => {
    onRemove();
    setCode('');
    setError('');
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
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <Ticket className="w-5 h-5 text-orange-500" />
        <h3 className="font-semibold">Kode Voucher</h3>
      </div>

      {!appliedVoucher ? (
        <>
          <div className="flex gap-2">
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
              disabled={disabled || isValidating}
              className="flex-1 uppercase"
            />
            <Button
              onClick={handleApplyVoucher}
              disabled={disabled || isValidating || !code.trim()}
              className="bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600"
            >
              {isValidating ? 'Memvalidasi...' : 'Terapkan'}
            </Button>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}
        </>
      ) : (
        <div className="bg-green-50 border-2 border-green-500 rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <span className="font-bold text-green-800 font-mono">
                  {appliedVoucher.code}
                </span>
                <Badge className="bg-green-600 text-white">
                  {appliedVoucher.type === 'percentage'
                    ? `${appliedVoucher.value}%`
                    : formatPrice(appliedVoucher.value)}
                </Badge>
              </div>
              <p className="text-sm text-green-700 mb-3">
                {appliedVoucher.description}
              </p>
              <div className="flex items-center justify-between text-sm">
                <span className="text-green-700">Diskon:</span>
                <span className="font-bold text-green-800">
                  - {formatPrice(appliedVoucher.discount)}
                </span>
              </div>
            </div>
            {!disabled && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRemove}
                className="text-red-600 hover:text-red-700 hover:bg-red-100 ml-2"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      )}

      {disabled && appliedVoucher && (
        <div className="text-xs text-orange-600 text-center font-medium">
          🔒 Voucher terkunci untuk pesanan ini
        </div>
      )}

      <div className="mt-2">
        <Button
          onClick={() => setShowMyVouchers(true)}
          variant="outline"
          className="w-full border-orange-200 text-orange-700 hover:bg-orange-50"
          disabled={disabled || !!appliedVoucher}
        >
          <Gift className="w-4 h-4 mr-2" />
          Lihat Voucher Saya
        </Button>
      </div>

      <MyVouchersModal
        isOpen={showMyVouchers}
        onClose={() => setShowMyVouchers(false)}
        onSelectVoucher={(selectedCode) => {
          setCode(selectedCode);
          handleApplyVoucher();
        }}
        totalAmount={totalAmount}
      />
    </div>
  );
}