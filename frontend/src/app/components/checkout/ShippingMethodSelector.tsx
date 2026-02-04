import { useState, useEffect } from 'react';
import { Package, Truck, Zap, Clock, CheckCircle } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/app/components/ui/radio-group';
import { Label } from '@/app/components/ui/label';

export interface ShippingMethod {
  id: string;
  name: string;
  provider: 'JNE' | 'J&T' | 'SiCepat' | 'POS Indonesia' | 'Ninja Xpress';
  service: string;
  estimatedDays: string;
  price: number;
  logo?: string;
}

interface ShippingMethodSelectorProps {
  selectedMethod: ShippingMethod | null;
  onSelectMethod: (method: ShippingMethod) => void;
  onConfirm?: () => void;
  disabled?: boolean;
}

// Data jasa pengiriman dengan estimasi real
const shippingMethods: ShippingMethod[] = [
  {
    id: 'jne-reg',
    name: 'JNE Reguler',
    provider: 'JNE',
    service: 'REG',
    estimatedDays: '3-5 hari',
    price: 0, // Gratis ongkir
    logo: '🚚',
  },
  {
    id: 'jne-yes',
    name: 'JNE YES',
    provider: 'JNE',
    service: 'YES',
    estimatedDays: '1-2 hari',
    price: 25000,
    logo: '⚡',
  },
  {
    id: 'jnt-reg',
    name: 'J&T Reguler',
    provider: 'J&T',
    service: 'REG',
    estimatedDays: '3-4 hari',
    price: 0,
    logo: '📦',
  },
  {
    id: 'jnt-express',
    name: 'J&T Express',
    provider: 'J&T',
    service: 'EXPRESS',
    estimatedDays: '1-2 hari',
    price: 22000,
    logo: '🚀',
  },
  {
    id: 'sicepat-reg',
    name: 'SiCepat Reguler',
    provider: 'SiCepat',
    service: 'REG',
    estimatedDays: '3-5 hari',
    price: 0,
    logo: '🚛',
  },
  {
    id: 'sicepat-best',
    name: 'SiCepat BEST',
    provider: 'SiCepat',
    service: 'BEST',
    estimatedDays: '2-3 hari',
    price: 18000,
    logo: '⭐',
  },
  {
    id: 'pos-reg',
    name: 'POS Reguler',
    provider: 'POS Indonesia',
    service: 'REG',
    estimatedDays: '4-6 hari',
    price: 0,
    logo: '📮',
  },
  {
    id: 'ninja-reg',
    name: 'Ninja Reguler',
    provider: 'Ninja Xpress',
    service: 'REG',
    estimatedDays: '3-4 hari',
    price: 0,
    logo: '🥷',
  },
];

export default function ShippingMethodSelector({
  selectedMethod,
  onSelectMethod,
  onConfirm,
  disabled = false,
}: ShippingMethodSelectorProps) {
  const [tempSelected, setTempSelected] = useState<ShippingMethod | null>(
    selectedMethod
  );
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    setTempSelected(selectedMethod);
  }, [selectedMethod]);

  const formatPrice = (price: number) => {
    if (price === 0) return 'GRATIS ONGKIR';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const handleSelect = (methodId: string) => {
    if (disabled) return;
    const method = shippingMethods.find((m) => m.id === methodId);
    if (method) {
      setTempSelected(method);
      onSelectMethod(method);
      
      // Show saved indicator
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    }
  };

  return (
    <div className="space-y-4">
      {/* Saved Indicator */}
      {isSaved && !disabled && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg animate-in fade-in slide-in-from-top-2 duration-300">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <p className="text-sm font-medium text-green-700">
            Jasa pengiriman tersimpan secara otomatis
          </p>
        </div>
      )}

      {disabled && selectedMethod && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Package className="w-5 h-5 text-blue-600" />
            <p className="text-sm font-semibold text-blue-900">
              Jasa Pengiriman Terkonfirmasi
            </p>
          </div>
          <p className="text-xs text-blue-700">
            Pilihan pengiriman telah dikunci dan tidak dapat diubah
          </p>
        </div>
      )}

      <RadioGroup
        value={tempSelected?.id || ''}
        onValueChange={handleSelect}
        disabled={disabled}
        className="space-y-3"
      >
        {shippingMethods.map((method) => (
          <div
            key={method.id}
            className={`relative flex items-center p-4 border-2 rounded-lg transition-all cursor-pointer hover:shadow-md ${
              tempSelected?.id === method.id
                ? 'border-green-500 bg-green-50'
                : 'border-gray-200 bg-white hover:border-green-300'
            } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
            onClick={() => !disabled && handleSelect(method.id)}
          >
            <RadioGroupItem
              value={method.id}
              id={method.id}
              className="mr-4"
              disabled={disabled}
            />
            
            <div className="flex-1 flex items-center gap-4">
              {/* Logo */}
              <div className="text-4xl">{method.logo}</div>

              {/* Details */}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Label
                    htmlFor={method.id}
                    className="font-semibold text-gray-900 cursor-pointer"
                  >
                    {method.name}
                  </Label>
                  {method.price === 0 && (
                    <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full font-bold">
                      GRATIS
                    </span>
                  )}
                </div>
                
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {method.estimatedDays}
                  </span>
                  <span className="flex items-center gap-1">
                    <Package className="w-4 h-4" />
                    {method.service}
                  </span>
                </div>
              </div>

              {/* Price */}
              <div className="text-right">
                <p
                  className={`font-bold text-lg ${
                    method.price === 0 ? 'text-green-600' : 'text-gray-900'
                  }`}
                >
                  {formatPrice(method.price)}
                </p>
              </div>
            </div>

            {/* Selected Indicator */}
            {tempSelected?.id === method.id && (
              <div className="absolute top-2 right-2">
                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-white" />
                </div>
              </div>
            )}
          </div>
        ))}
      </RadioGroup>

      {/* Info Box */}
      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-xs text-gray-600 leading-relaxed">
          <strong>Catatan:</strong> Estimasi waktu pengiriman dihitung dari hari
          pesanan diproses. Pilihan jasa pengiriman akan otomatis tersimpan dan
          langsung terlihat di admin panel secara real-time.
        </p>
      </div>
    </div>
  );
}

export { shippingMethods };
