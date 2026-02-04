import { PaymentMethod } from '@/lib/paymentStore';

/**
 * Get payment logo/icon based on payment method
 * Returns emoji or styled text for payment methods
 */
export function getPaymentLogo(method: PaymentMethod): JSX.Element {
  switch (method) {
    // QRIS
    case 'QRIS':
      return (
        <div className="text-2xl font-bold bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
          QR
        </div>
      );

    // E-Wallets
    case 'Gopay':
    case 'GoPay':
      return (
        <div className="w-full h-full flex items-center justify-center">
          <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white font-bold text-xs">
            GP
          </div>
        </div>
      );

    case 'OVO':
      return (
        <div className="w-full h-full flex items-center justify-center">
          <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold text-xs">
            OVO
          </div>
        </div>
      );

    case 'DANA':
      return (
        <div className="w-full h-full flex items-center justify-center">
          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-xs">
            DA
          </div>
        </div>
      );

    case 'ShopeePay':
      return (
        <div className="w-full h-full flex items-center justify-center">
          <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold text-xs">
            SP
          </div>
        </div>
      );

    case 'LinkAja':
      return (
        <div className="w-full h-full flex items-center justify-center">
          <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center text-white font-bold text-xs">
            LA
          </div>
        </div>
      );

    // Virtual Accounts
    case 'BCA_VA':
      return (
        <div className="w-full h-full flex items-center justify-center">
          <div className="text-blue-600 font-bold text-sm">BCA</div>
        </div>
      );

    case 'BRI_VA':
      return (
        <div className="w-full h-full flex items-center justify-center">
          <div className="text-blue-700 font-bold text-sm">BRI</div>
        </div>
      );

    case 'Mandiri_VA':
      return (
        <div className="w-full h-full flex items-center justify-center">
          <div className="text-yellow-600 font-bold text-sm">MDR</div>
        </div>
      );

    case 'BNI_VA':
      return (
        <div className="w-full h-full flex items-center justify-center">
          <div className="text-orange-600 font-bold text-sm">BNI</div>
        </div>
      );

    // Credit Card
    case 'Credit_Card':
      return (
        <div className="w-full h-full flex items-center justify-center">
          <div className="text-2xl">💳</div>
        </div>
      );

    // COD
    case 'COD':
      return (
        <div className="w-full h-full flex items-center justify-center">
          <div className="text-2xl">💵</div>
        </div>
      );

    default:
      return (
        <div className="w-full h-full flex items-center justify-center">
          <div className="text-2xl">💳</div>
        </div>
      );
  }
}

/**
 * Get shipping provider logo/icon
 * Returns emoji or styled element for shipping providers
 */
export function getShippingLogo(provider: string): JSX.Element {
  const lowerProvider = provider.toLowerCase();

  if (lowerProvider.includes('jne')) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-red-600 font-bold text-xs">JNE</div>
      </div>
    );
  }

  if (lowerProvider.includes('jnt') || lowerProvider.includes('j&t')) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-red-500 font-bold text-xs">J&T</div>
      </div>
    );
  }

  if (lowerProvider.includes('sicepat')) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-yellow-600 font-bold text-xs">SC</div>
      </div>
    );
  }

  if (lowerProvider.includes('ninja')) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-green-600 font-bold text-xs">NJ</div>
      </div>
    );
  }

  if (lowerProvider.includes('anteraja')) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-red-700 font-bold text-xs">AR</div>
      </div>
    );
  }

  if (lowerProvider.includes('pos')) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-orange-600 font-bold text-xs">POS</div>
      </div>
    );
  }

  if (lowerProvider.includes('gosend') || lowerProvider.includes('gojek')) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-green-500 font-bold text-xs">GO</div>
      </div>
    );
  }

  if (lowerProvider.includes('grab')) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-green-600 font-bold text-xs">GB</div>
      </div>
    );
  }

  // Default: show truck emoji
  return (
    <div className="w-full h-full flex items-center justify-center">
      <div className="text-xl">🚚</div>
    </div>
  );
}
