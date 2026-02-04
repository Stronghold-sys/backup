import { useState } from 'react';
import { Card } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { PAYMENT_METHODS, PaymentMethod } from '@/lib/paymentStore';
import { Check, CreditCard, Wallet, Building2, Smartphone, Banknote } from 'lucide-react';
import { getPaymentLogo } from '@/app/components/payment/PaymentLogos';

interface PaymentMethodSelectorProps {
  selectedMethod: PaymentMethod | null;
  onSelectMethod: (method: PaymentMethod) => void;
}

export default function PaymentMethodSelector({
  selectedMethod,
  onSelectMethod,
}: PaymentMethodSelectorProps) {
  const getIcon = (type: string) => {
    switch (type) {
      case 'qris':
        return <Smartphone className="w-6 h-6" />;
      case 'ewallet':
        return <Wallet className="w-6 h-6" />;
      case 'bank_transfer':
        return <Building2 className="w-6 h-6" />;
      case 'card':
        return <CreditCard className="w-6 h-6" />;
      case 'cod':
        return <Banknote className="w-6 h-6" />;
      default:
        return <CreditCard className="w-6 h-6" />;
    }
  };

  const groupedMethods = {
    qris: PAYMENT_METHODS.filter((m) => m.type === 'qris'),
    ewallet: PAYMENT_METHODS.filter((m) => m.type === 'ewallet'),
    bank_transfer: PAYMENT_METHODS.filter((m) => m.type === 'bank_transfer'),
    card: PAYMENT_METHODS.filter((m) => m.type === 'card'),
    cod: PAYMENT_METHODS.filter((m) => m.type === 'cod'),
  };

  return (
    <div className="space-y-6">
      {/* QRIS - Priority */}
      {groupedMethods.qris.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <h3 className="font-semibold text-gray-900">QRIS (Rekomendasi)</h3>
            <Badge className="bg-green-500 text-white">Tercepat</Badge>
          </div>
          <div className="grid gap-3">
            {groupedMethods.qris.map((method) => (
              <Card
                key={method.id}
                onClick={() => method.available && onSelectMethod(method.id)}
                className={`p-4 cursor-pointer transition border-2 ${
                  selectedMethod === method.id
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 hover:border-green-300 hover:bg-gray-50'
                } ${!method.available ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-12 h-12 rounded-lg flex items-center justify-center p-2 ${
                        selectedMethod === method.id ? 'bg-white' : 'bg-white border border-gray-200'
                      }`}
                    >
                      {getPaymentLogo(method.id)}
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">{method.name}</h4>
                      <p className="text-sm text-gray-600">{method.description}</p>
                    </div>
                  </div>
                  {selectedMethod === method.id && (
                    <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* E-Wallet */}
      {groupedMethods.ewallet.length > 0 && (
        <div>
          <h3 className="font-semibold text-gray-900 mb-3">Dompet Digital</h3>
          <div className="grid gap-3">
            {groupedMethods.ewallet.map((method) => (
              <Card
                key={method.id}
                onClick={() => method.available && onSelectMethod(method.id)}
                className={`p-4 cursor-pointer transition border-2 ${
                  selectedMethod === method.id
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 hover:border-green-300 hover:bg-gray-50'
                } ${!method.available ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-12 h-12 rounded-lg flex items-center justify-center p-2 ${
                        selectedMethod === method.id ? 'bg-white' : 'bg-white border border-gray-200'
                      }`}
                    >
                      {getPaymentLogo(method.id)}
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">{method.name}</h4>
                      <p className="text-sm text-gray-600">{method.description}</p>
                    </div>
                  </div>
                  {selectedMethod === method.id && (
                    <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Bank Transfer */}
      {groupedMethods.bank_transfer.length > 0 && (
        <div>
          <h3 className="font-semibold text-gray-900 mb-3">Transfer Bank (Virtual Account)</h3>
          <div className="grid gap-3">
            {groupedMethods.bank_transfer.map((method) => (
              <Card
                key={method.id}
                onClick={() => method.available && onSelectMethod(method.id)}
                className={`p-4 cursor-pointer transition border-2 ${
                  selectedMethod === method.id
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 hover:border-green-300 hover:bg-gray-50'
                } ${!method.available ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-12 h-12 rounded-lg flex items-center justify-center p-2 ${
                        selectedMethod === method.id ? 'bg-white' : 'bg-white border border-gray-200'
                      }`}
                    >
                      {getPaymentLogo(method.id)}
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">{method.name}</h4>
                      <p className="text-sm text-gray-600">{method.description}</p>
                    </div>
                  </div>
                  {selectedMethod === method.id && (
                    <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Credit Card */}
      {groupedMethods.card.length > 0 && (
        <div>
          <h3 className="font-semibold text-gray-900 mb-3">Kartu Kredit / Debit</h3>
          <div className="grid gap-3">
            {groupedMethods.card.map((method) => (
              <Card
                key={method.id}
                onClick={() => method.available && onSelectMethod(method.id)}
                className={`p-4 cursor-pointer transition border-2 ${
                  selectedMethod === method.id
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 hover:border-green-300 hover:bg-gray-50'
                } ${!method.available ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                        selectedMethod === method.id ? 'bg-green-100' : 'bg-gray-100'
                      }`}
                    >
                      {getIcon(method.type)}
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">{method.name}</h4>
                      <p className="text-sm text-gray-600">{method.description}</p>
                    </div>
                  </div>
                  {selectedMethod === method.id && (
                    <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* COD */}
      {groupedMethods.cod.length > 0 && (
        <div>
          <h3 className="font-semibold text-gray-900 mb-3">Bayar di Tempat</h3>
          <div className="grid gap-3">
            {groupedMethods.cod.map((method) => (
              <Card
                key={method.id}
                onClick={() => method.available && onSelectMethod(method.id)}
                className={`p-4 cursor-pointer transition border-2 ${
                  selectedMethod === method.id
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 hover:border-green-300 hover:bg-gray-50'
                } ${!method.available ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-12 h-12 rounded-lg flex items-center justify-center p-2 ${
                        selectedMethod === method.id ? 'bg-white' : 'bg-white border border-gray-200'
                      }`}
                    >
                      {getPaymentLogo(method.id)}
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">{method.name}</h4>
                      <p className="text-sm text-gray-600">{method.description}</p>
                    </div>
                  </div>
                  {selectedMethod === method.id && (
                    <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Security Badge */}
      <div className="flex items-center justify-center gap-2 text-sm text-gray-600 pt-4 border-t">
        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
        <span className="font-medium">Pembayaran Aman & Terenkripsi</span>
      </div>
      <p className="text-xs text-center text-gray-500">
        Transaksi diproses melalui sistem pembayaran nasional yang terpercaya
      </p>
    </div>
  );
}