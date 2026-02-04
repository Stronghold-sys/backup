import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { useProducts } from '@/lib/useProducts';
import { useCartSync } from '@/lib/useCartSync';
import { useCartStore, useAuthStore, useOrderStore, authStoreHelpers } from '@/lib/store';
import { usePaymentStore, PAYMENT_METHODS, generateVirtualAccount } from '@/lib/paymentStore';
import { useNotificationStore } from '@/lib/notificationStore';
import { projectId, publicAnonKey } from '/utils/supabase';
import { useMaintenanceStore } from '@/lib/maintenanceStore';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Label } from '@/app/components/ui/label';
import { Input } from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/app/components/ui/radio-group';
import { Separator } from '@/app/components/ui/separator';
import { Badge } from '@/app/components/ui/badge';
import { toast } from 'sonner';
import { 
  MapPin, 
  Truck, 
  CreditCard, 
  ShoppingBag, 
  AlertTriangle,
  Wallet,
  Building2,
  Smartphone,
  Tag,
  Loader2,
  X
} from 'lucide-react';
import type { Address, PaymentMethod, PaymentStatus } from '@/types';
import { ButtonLoader } from '@/app/components/loading/ButtonLoader';
import Layout from '@/app/components/Layout/Layout';
import { ImageWithFallback } from '@/app/components/figma/ImageWithFallback';
import VoucherSection from '@/app/components/checkout/VoucherSection'; // ✅ FIXED: Corrected path from voucher/ to checkout/
import PaymentMethodSelector from '@/app/components/payment/PaymentMethodSelector';
import QRISModal from '@/app/components/payment/QRISModal';
import VirtualAccountModal from '@/app/components/payment/VirtualAccountModal';
import EWalletModal from '@/app/components/payment/EWalletModal';
import AddressModal from '@/app/components/checkout/AddressModal'; // ✅ FIXED: Corrected path from address/ to checkout/
import { getShippingLogo } from '@/app/components/payment/PaymentLogos';

// ✅ Pure function helpers for store updates (no Zustand dependencies)
const orderStoreHelpers = {
  updateOrder: (orderId: string, updates: any) => {
    // This will be called from useOrderStore hook
  }
};

const paymentStoreHelpers = {
  updatePaymentStatus: (orderId: string, status: PaymentStatus, paidAt?: string) => {
    // Updates will be handled by the payment store
  }
};

export default function CheckoutPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { items, getTotalPrice, clearCart } = useCartStore();
  const { user, accessToken } = useAuthStore();
  const { addOrder } = useOrderStore(); // ✅ Use hook
  const { addPayment } = usePaymentStore(); // ✅ Use hook
  const { addNotification } = useNotificationStore(); // ✅ Use notification store
  const { isUnderMaintenance } = useMaintenanceStore(); // ✅ NEW: Get maintenance status
  
  const isCheckingOutRef = useRef(false); // Use ref instead of state to avoid re-renders
  const hasInitialItemsRef = useRef(false); // Track if page loaded with items
  
  // ✅ FIX: Add missing isProcessing state
  const [isProcessing, setIsProcessing] = useState(false);
  
  console.info('🔍 CheckoutPage state - isProcessing:', isProcessing, 'items.length:', items.length);
  
  // Address states
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  
  // Voucher states
  const [appliedVoucher, setAppliedVoucher] = useState<any>(null);
  const [voucherDiscount, setVoucherDiscount] = useState(0);
  
  // ✅ FIX: Add missing shipping and payment method states
  const [shippingMethod, setShippingMethod] = useState<string>('jne-reg');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);
  
  // Modal states
  const [showQRISModal, setShowQRISModal] = useState(false);
  const [showEWalletModal, setShowEWalletModal] = useState(false);
  const [showVAModal, setShowVAModal] = useState(false);
  const [currentOrderId, setCurrentOrderId] = useState('');
  const [currentPaymentStatus, setCurrentPaymentStatus] = useState<PaymentStatus>('waiting_payment');
  const [qrCode, setQrCode] = useState('');
  const [virtualAccount, setVirtualAccount] = useState('');
  const [currentOrderAmount, setCurrentOrderAmount] = useState(0); // Store amount before cart is cleared

  // Load products untuk sinkronisasi
  useProducts();
  
  // ✅ RE-ENABLED: Cart sync with improved debounce mechanism
  // Sinkronisasi cart dengan product data terbaru
  useCartSync();

  // Track initial items on mount
  useEffect(() => {
    if (items.length > 0) {
      hasInitialItemsRef.current = true;
    }
  }, []); // Only run once on mount

  // Initialize default address
  useEffect(() => {
    if (user?.addresses && user.addresses.length > 0 && !selectedAddress) {
      const defaultAddr = user.addresses.find(addr => addr.isDefault) || user.addresses[0];
      setSelectedAddress(defaultAddr);
      console.info('✅ [CheckoutPage] Default address initialized:', defaultAddr);
    }
  }, [user?.addresses]); // ✅ FIX: Watch the entire addresses array for changes

  // Redirect to cart ONLY on initial load if empty
  useEffect(() => {
    // Only check on mount - if initially no items, redirect
    if (!hasInitialItemsRef.current && items.length === 0) {
      console.info('⚠️ Redirecting to cart: No items on initial load');
      navigate('/cart', { replace: true });
    }
  }, []); // Empty deps - only run on mount

  // Debug: Monitor showQRISModal state
  useEffect(() => {
    console.info('🔍 CheckoutPage - showQRISModal changed to:', showQRISModal);
    console.info('🔍 CheckoutPage - qrCode:', qrCode);
    console.info('🔍 CheckoutPage - currentOrderId:', currentOrderId);
  }, [showQRISModal, qrCode, currentOrderId]);

  // Update payment status from URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const status = urlParams.get('payment_status') as 'paid' | 'failed' | 'pending' | null;
    const orderId = urlParams.get('order_id');
    
    if (currentOrderId) {
      // Update payment status in store
      paymentStoreHelpers.updatePaymentStatus( // ✅ Use helper
        currentOrderId,
        status || 'pending',
        status === 'paid' ? new Date().toISOString() : undefined
      );

      // ✅ UPDATE PAYMENT STATUS (DON'T AUTO-UPDATE ORDER STATUS TO PROCESSING)
      // Order status should remain 'waiting_payment' until admin manually processes it
      if (status === 'paid' && accessToken) {
        // ✅ FIXED: Wrap async code in async IIFE
        (async () => {
          try {
            console.info('🔄 Updating payment status to paid - order remains waiting_payment...');
            const response = await fetch(
              `https://${projectId}.supabase.co/functions/v1/make-server-adb995ba/orders/${currentOrderId}/payment-status`,
              {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${publicAnonKey}`,
                  'X-Session-Token': accessToken,
                },
                body: JSON.stringify({
                  paymentStatus: 'paid',
                  status: 'waiting_payment', // ✅ FIXED: Keep status as waiting_payment, admin will process it
                  paidAt: new Date().toISOString(),
                }),
              }
            );

            if (response.ok) {
              const result = await response.json();
              console.info('✅ Payment status updated to paid:', result);
              
              // Update local order store
              if (result.order) {
                orderStoreHelpers.updateOrder(currentOrderId, result.order); // ✅ FIXED: Use helper
              }
            } else {
              console.error('❌ Failed to update payment status');
            }
          } catch (error) {
            console.error('❌ Error updating payment status:', error);
          }
        })();
      }
    }
  }, [location.search, currentOrderId, accessToken]);

  const shippingCost = shippingMethod.includes('same-day') ? 35000 : 
                       shippingMethod.includes('next-day') ? 25000 : 
                       shippingMethod.includes('express') ? 18000 : 
                       shippingMethod.includes('cargo') ? 15000 : 0;
  const subtotal = getTotalPrice();
  const total = subtotal + shippingCost - voucherDiscount;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const getBankName = (method: PaymentMethod): string => {
    const bankNames: Record<string, string> = {
      BCA_VA: 'BCA',
      BRI_VA: 'BRI',
      Mandiri_VA: 'Mandiri',
      BNI_VA: 'BNI',
    };
    return bankNames[method] || method;
  };

  const handlePaymentStatusChange = useCallback(async (status: PaymentStatus) => {
    console.info('💰 handlePaymentStatusChange called with status:', status);
    setCurrentPaymentStatus(status);
    
    if (currentOrderId) {
      // Update payment status in store
      paymentStoreHelpers.updatePaymentStatus( // ✅ FIXED: Use helper
        currentOrderId,
        status,
        status === 'paid' ? new Date().toISOString() : undefined
      );

      // ✅ UPDATE PAYMENT STATUS TO PAID AND ORDER STATUS TO PROCESSING
      // After payment is confirmed, order status should change to 'processing'
      if (status === 'paid' && accessToken) {
        try {
          console.info('🔄 Updating payment status to paid and order to processing...');
          const response = await fetch(
            `https://${projectId}.supabase.co/functions/v1/make-server-adb995ba/orders/${currentOrderId}/payment-status`,
            {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${publicAnonKey}`,
                'X-Session-Token': accessToken,
              },
              body: JSON.stringify({
                paymentStatus: 'paid',
                status: 'processing', // ✅ CHANGED: Update to processing after payment success
                statusNote: 'Pembayaran berhasil - Menunggu diproses admin',
                paidAt: new Date().toISOString(),
              }),
            }
          );

          if (response.ok) {
            const result = await response.json();
            console.info('✅ Payment and order status updated:', result);
            
            // Update local order store
            if (result.order) {
              orderStoreHelpers.updateOrder(currentOrderId, result.order); // ✅ FIXED: Use helper
            }
          } else {
            console.error('❌ Failed to update payment status');
          }
        } catch (error) {
          console.error('❌ Error updating payment status:', error);
        }
      }

      // Add notification
      if (status === 'paid' && user) {
        console.info('🔔 [Checkout] Adding payment success notification for user:', user.id);
        const userNotif = {
          id: `notif-${Date.now()}`,
          userId: user.id,
          title: 'Pembayaran Berhasil',
          message: `Pembayaran untuk pesanan ${currentOrderId} telah berhasil. Menunggu diproses admin.`,
          type: 'payment_success' as const,
          read: false,
          orderId: currentOrderId,
          createdAt: new Date().toISOString(),
        };
        console.info('🔔 [Checkout] User notification object:', userNotif);
        addNotification(userNotif);

        // Also add notification for admin
        console.info('🔔 [Checkout] Adding admin notification');
        const adminNotif = {
          id: `notif-admin-${Date.now()}`,
          userId: 'admin',
          title: 'Pembayaran Baru Diterima',
          message: `Pembayaran untuk pesanan ${currentOrderId} telah diterima. Siap diproses.`,
          type: 'payment_success' as const,
          read: false,
          orderId: currentOrderId,
          createdAt: new Date().toISOString(),
        };
        console.info('🔔 [Checkout] Admin notification object:', adminNotif);
        addNotification(adminNotif);
      } else if (status === 'failed' && user) {
        addNotification({
          id: `notif-${Date.now()}`,
          userId: user.id,
          title: 'Pembayaran Gagal',
          message: `Pembayaran untuk pesanan ${currentOrderId} gagal. Silakan coba lagi.`,
          type: 'payment_failed',
          read: false,
          orderId: currentOrderId,
          createdAt: new Date().toISOString(),
        });
      } else if (status === 'expired' && user) {
        addNotification({
          id: `notif-${Date.now()}`,
          userId: user.id,
          title: 'Pembayaran Kedaluwarsa',
          message: `Waktu pembayaran untuk pesanan ${currentOrderId} telah habis.`,
          type: 'payment_expired',
          read: false,
          orderId: currentOrderId,
          createdAt: new Date().toISOString(),
        });
      }

      // Close modal and redirect if paid
      if (status === 'paid') {
        // ✅ Clear cart after successful payment
        console.info('🗑️ Payment successful - clearing cart');
        clearCart();
        
        setTimeout(() => {
          setShowQRISModal(false);
          setShowEWalletModal(false);
          setShowVAModal(false);
          navigate(`/payment-status?orderId=${currentOrderId}`);
        }, 2000);
      }
    }
  }, [currentOrderId, user, addNotification, accessToken, clearCart]);

  const handleAddAddress = async (newAddress: Address) => {
    if (!user) return;

    try {
      // If this is set as default, remove default from other addresses
      let updatedAddresses = user.addresses || [];
      if (newAddress.isDefault) {
        updatedAddresses = updatedAddresses.map(addr => ({ ...addr, isDefault: false }));
      }

      // Add new address
      const allAddresses = [...updatedAddresses, newAddress];

      // ✅ FIX: Update addresses on backend first
      try {
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-adb995ba/profile/addresses`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${publicAnonKey}`,
              'X-Session-Token': accessToken!,
            },
            body: JSON.stringify({ addresses: allAddresses }),
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ Failed to update addresses on backend:', response.status, errorText);
          toast.error('Gagal menyimpan alamat ke server');
          return;
        }

        const data = await response.json();
        console.info('✅ Addresses updated on backend:', data);

        // ✅ FIX: Reload user data from server to ensure sync
        const profileResponse = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-adb995ba/profile`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${publicAnonKey}`,
              'X-Session-Token': accessToken!,
            },
          }
        );

        if (profileResponse.ok) {
          const profileData = await profileResponse.json();
          if (profileData.success && profileData.user) {
            console.info('✅ User profile reloaded from server:', profileData.user);
            
            // Update user in auth store with fresh data from server
            authStoreHelpers.setUser(profileData.user, accessToken);
            
            // ✅ FIX: Set selected address to the newly added address from server data
            const savedAddress = profileData.user.addresses?.find((addr: Address) => addr.id === newAddress.id);
            if (savedAddress) {
              setSelectedAddress(savedAddress);
              console.info('✅ Selected address updated:', savedAddress);
            }
            
            toast.success('Alamat berhasil ditambahkan dan dipilih');
            
            // ✅ FIX: Close modal after successful save
            setShowAddressModal(false);
          }
        } else {
          console.error('⚠️ Failed to reload profile, using local data');
          // Fallback: update local state
          const updatedUser = { ...user, addresses: allAddresses };
          authStoreHelpers.setUser(updatedUser, accessToken);
          setSelectedAddress(newAddress);
          toast.success('Alamat berhasil ditambahkan dan dipilih');
          
          // ✅ FIX: Close modal even in fallback case
          setShowAddressModal(false);
        }
      } catch (apiError) {
        console.error('❌ API error:', apiError);
        toast.error('Gagal menyimpan alamat');
      }
    } catch (error) {
      console.error('❌ Error adding address:', error);
      toast.error('Gagal menambahkan alamat');
    }
  };

  const handleSelectAddress = async (address: Address) => {
    if (!user) return;

    // Update addresses - set the selected one as default
    const updatedAddresses = user.addresses?.map((addr) => ({
      ...addr,
      isDefault: addr.id === address.id,
    })) || [];

    // Update user in auth store
    const updatedUser = { ...user, addresses: updatedAddresses };
    authStoreHelpers.setUser(updatedUser, accessToken); // ✅ FIXED: Use helper

    // ✅ FIX: Update addresses on backend with correct format
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-adb995ba/profile/addresses`,
        {
          method: 'PUT', // ✅ FIX: Changed from POST to PUT
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
            'X-Session-Token': accessToken!,
          },
          body: JSON.stringify({ addresses: updatedAddresses }), // ✅ FIX: Wrap in { addresses: [...] }
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API error (non-blocking):', response.status, errorText);
      } else {
        const data = await response.json();
        console.info('✅ Addresses updated on backend:', data);
      }
    } catch (apiError) {
      console.error('API error (non-blocking):', apiError);
    }

    toast.success('Alamat berhasil dipilih');
    setSelectedAddress(address);
  };

  // Voucher handlers
  const handleVoucherApplied = (voucher: any, discountAmount: number) => {
    setAppliedVoucher(voucher);
    setVoucherDiscount(discountAmount);
    console.info('🎫 Voucher applied:', voucher.code, '| Discount:', discountAmount);
  };

  const handleVoucherRemoved = () => {
    setAppliedVoucher(null);
    setVoucherDiscount(0);
    console.info('🎫 Voucher removed');
  };

  // Handle checkout
  const handleCheckout = async () => {
    if (isCheckingOutRef.current) {
      console.info('⚠️ Checkout already in progress, skipping...');
      return;
    }

    // ✅ CRITICAL: Check maintenance mode FIRST before any transaction
    if (isUnderMaintenance()) {
      console.info(' [Checkout] BLOCKED - System is under maintenance');
      toast.error('Sistem sedang dalam pemeliharaan. Transaksi tidak dapat dilakukan saat ini.', {
        duration: 5000,
      });
      return;
    }

    if (!selectedPaymentMethod) {
      toast.error('Pilih metode pembayaran terlebih dahulu');
      return;
    }

    if (!selectedAddress) {
      toast.error('Pilih alamat pengiriman terlebih dahulu');
      return;
    }

    console.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.info('🛒 CHECKOUT DEBUG - Cart Items:');
    items.forEach((item, index) => {
      console.info(`\nItem ${index + 1}:`, {
        productId: item.productId,
        productName: item.product?.name,
        productPrice: item.product?.price,
        productImages: item.product?.images,
        productImageSingular: item.product?.image,
        quantity: item.quantity,
      });
    });
    console.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    isCheckingOutRef.current = true;
    setIsProcessing(true);

    try {
      const orderData = {
        items: items.map(item => ({
          productId: item.productId || item.product?.id,
          quantity: item.quantity,
          price: item.product?.price || item.price || 0,
        })),
        totalAmount: total,
        subtotal: subtotal,
        shippingCost: shippingCost,
        shippingAddress: selectedAddress,
        shippingMethod: shippingMethod,
        paymentMethod: selectedPaymentMethod,
        voucherCode: appliedVoucher?.code || null,
        voucherDiscount: voucherDiscount || 0,
      };

      console.info('📤 Creating order with data:', orderData);
      console.info('📤 Headers:', {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey.substring(0, 20)}...`,
        'X-Session-Token': accessToken ? `${accessToken.substring(0, 20)}...` : 'MISSING',
      });

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-adb995ba/orders`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
            'X-Session-Token': accessToken,
          },
          body: JSON.stringify(orderData),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Order creation failed:', errorText);
        throw new Error(errorText || 'Gagal membuat pesanan');
      }

      const result = await response.json();
      console.info('✅ Order created successfully:', result);

      const orderId = result.order?.id || result.orderId || `ORD-${Date.now()}`;
      const qrCodeData = result.qrCode || `QRIS-${orderId}-${total}`;
      const vaNumber = result.virtualAccount || generateVirtualAccount(selectedPaymentMethod as any, orderId); // ✅ FIXED: Pass orderId as second parameter

      setCurrentOrderId(orderId);
      setQrCode(qrCodeData);
      setVirtualAccount(vaNumber);
      setCurrentPaymentStatus('waiting_payment');
      setCurrentOrderAmount(total); // ✅ SAVE AMOUNT BEFORE CART IS CLEARED

      // ✅ SAVE ORDER TO LOCAL STORE
      const newOrder = {
        id: orderId,
        userId: user?.id || '',
        items: items.map(item => {
          // Get price with proper fallback chain
          const itemPrice = item.product?.price || item.price || 0;
          console.info(`📊 Item ${item.productId}: product.price=${item.product?.price}, item.price=${item.price}, final=${itemPrice}`);
          console.info(`📷 Item ${item.productId} images:`, item.product?.images || item.product?.image || 'NO IMAGES');
          
          return {
            productId: item.productId,
            // ✅ CRITICAL FIX: Preserve ALL product data including images
            product: item.product ? {
              ...item.product, // Copy all product fields
              // Ensure images field is always an array
              images: item.product.images || (item.product.image ? [item.product.image] : []),
            } : {
              id: item.productId,
              name: 'Produk',
              price: itemPrice,
              images: [],
            },
            quantity: item.quantity,
            price: itemPrice,
          };
        }),
        totalAmount: total,
        subtotal: isNaN(subtotal) ? 0 : subtotal,
        shippingCost: isNaN(shippingCost) ? 0 : shippingCost,
        shippingAddress: selectedAddress!,
        shippingMethod: shippingMethod,
        paymentMethod: selectedPaymentMethod!,
        status: 'waiting_payment' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        statusHistory: [{
          status: 'waiting_payment',
          note: 'Menunggu pembayaran',
          timestamp: new Date().toISOString(),
        }],
      };

      console.info('💾 Saving order to local store:', newOrder);
      console.info('📊 Order totals - subtotal:', newOrder.subtotal, 'shipping:', newOrder.shippingCost, 'total:', newOrder.totalAmount);
      addOrder(newOrder);

      // ✅ SAVE PAYMENT TO LOCAL STORE
      const newPayment = {
        orderId: orderId,
        method: selectedPaymentMethod!,
        status: 'waiting_payment' as const,
        amount: total,
        qrCode: qrCodeData,
        virtualAccount: vaNumber,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      console.info('💾 Saving payment to local store:', newPayment);
      addPayment(newPayment);

      // ✅ FIXED: Don't clear cart immediately - only clear after modal is closed or payment succeeds
      // This prevents the checkout page from becoming empty while user is still in the payment flow
      console.info('ℹ️ Cart will be cleared after payment modal is closed or payment succeeds');

      // Get payment method type
      const paymentMethodObj = PAYMENT_METHODS.find(m => m.id === selectedPaymentMethod);
      const paymentType = paymentMethodObj?.type || 'qris';

      console.info('💳 Payment Type:', paymentType);

      // Small delay to ensure state is set before showing modal
      setTimeout(() => {
        if (paymentType === 'qris') {
          console.info('✅ Opening QRIS Modal');
          setShowQRISModal(true);
        } else if (paymentType === 'ewallet') {
          console.info('✅ Opening E-Wallet Modal');
          setShowEWalletModal(true);
        } else if (paymentType === 'bank_transfer') {
          console.info('✅ Opening Virtual Account Modal');
          setShowVAModal(true);
        } else if (paymentType === 'cod') {
          console.info('✅ COD - Direct redirect to payment status');
          
          // ✅ ADD NOTIFICATION FOR COD ORDER
          if (user) {
            console.info('🔔 [Checkout] Adding COD notification for user:', user.id);
            
            // Add notification for user
            const userCODNotif = {
              id: `notif-cod-${Date.now()}`,
              userId: user.id,
              title: 'Pesanan Berhasil Dibuat (COD)',
              message: `Pesanan ${orderId} berhasil dibuat dengan metode pembayaran COD (Cash on Delivery). Total pembayaran: ${formatPrice(total)}. Bayar saat barang diterima.`,
              type: 'order_created' as const,
              read: false,
              orderId: orderId,
              createdAt: new Date().toISOString(),
            };
            console.info(' [Checkout] User COD notification object:', userCODNotif);
            addNotification(userCODNotif);

            // Add notification for admin
            const adminCODNotif = {
              id: `notif-admin-cod-${Date.now()}`,
              userId: 'admin',
              title: 'Pesanan COD Baru',
              message: `Pesanan baru ${orderId} dengan metode COD sebesar ${formatPrice(total)}. Siap diproses.`,
              type: 'order_created' as const,
              read: false,
              orderId: orderId,
              createdAt: new Date().toISOString(),
            };
            console.info('🔔 [Checkout] Admin COD notification object:', adminCODNotif);
            addNotification(adminCODNotif);
          }
          
          // ✅ Clear cart for COD orders (order already created in backend)
          console.info('🗑️ COD order - clearing cart');
          clearCart();
          toast.success('Pesanan berhasil dibuat! Bayar saat barang diterima.');
          navigate(`/payment-status?orderId=${orderId}`);
        } else {
          console.info('⚠️ Unknown payment type, defaulting to QRIS Modal');
          setShowQRISModal(true);
        }
      }, 50);

    } catch (error: any) {
      console.error('❌ Checkout error:', error);
      toast.error(error.message || 'Terjadi kesalahan saat checkout');
      isCheckingOutRef.current = false;
      setIsProcessing(false);
    }
  };

  return (
    <Layout>
      <div className="flex-1 bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold mb-6 text-gray-900">Checkout</h1>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Left Column - Forms */}
            <div className="lg:col-span-2 space-y-6">
              {/* Shipping Address */}
              <Card className="p-6">
                <h2 className="font-bold text-lg mb-4 text-gray-900">Alamat Pengiriman</h2>
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="font-semibold text-gray-900">{selectedAddress?.name || user?.name}</p>
                  <p className="text-sm text-gray-600 mt-1">{selectedAddress?.address || 'Jl. Contoh No. 123'}</p>
                  <p className="text-sm text-gray-600">{selectedAddress?.city || 'Jakarta'}, {selectedAddress?.province || 'DKI Jakarta'} {selectedAddress?.postalCode || '12345'}</p>
                  <p className="text-sm text-gray-600 mt-1">{selectedAddress?.phone || '+62 812-3456-7890'}</p>
                  <Button variant="link" className="text-green-600 hover:text-green-700 p-0 h-auto mt-2" onClick={() => setShowAddressModal(true)}>
                    Ubah Alamat
                  </Button>
                </div>
              </Card>

              {/* Shipping Method */}
              <Card className="p-6">
                <h2 className="font-bold text-lg mb-4 text-gray-900">Metode Pengiriman</h2>
                <RadioGroup value={shippingMethod} onValueChange={setShippingMethod}>
                  {/* JNE - REG */}
                  <div className={`flex items-center justify-between p-4 border-2 rounded-lg mb-3 hover:border-green-300 transition ${shippingMethod === 'jne-reg' ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}>
                    <div className="flex items-center space-x-3 flex-1">
                      <RadioGroupItem value="jne-reg" id="jne-reg" />
                      <div className="w-12 h-8 bg-white border border-gray-200 rounded flex items-center justify-center p-1">
                        {getShippingLogo('jne')}
                      </div>
                      <Label htmlFor="jne-reg" className="cursor-pointer flex-1">
                        <p className="font-semibold text-gray-900">JNE Reguler</p>
                        <p className="text-sm text-gray-600">Estimasi: 3-4 hari</p>
                      </Label>
                    </div>
                    <span className="font-bold text-green-600">GRATIS</span>
                  </div>

                  {/* J&T - REG */}
                  <div className={`flex items-center justify-between p-4 border-2 rounded-lg mb-3 hover:border-green-300 transition ${shippingMethod === 'jnt-reg' ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}>
                    <div className="flex items-center space-x-3 flex-1">
                      <RadioGroupItem value="jnt-reg" id="jnt-reg" />
                      <div className="w-12 h-8 bg-white border border-gray-200 rounded flex items-center justify-center p-1">
                        {getShippingLogo('jnt')}
                      </div>
                      <Label htmlFor="jnt-reg" className="cursor-pointer flex-1">
                        <p className="font-semibold text-gray-900">J&T Reguler</p>
                        <p className="text-sm text-gray-600">Estimasi: 3-5 hari</p>
                      </Label>
                    </div>
                    <span className="font-bold text-green-600">GRATIS</span>
                  </div>

                  {/* SiCepat - REG */}
                  <div className={`flex items-center justify-between p-4 border-2 rounded-lg mb-3 hover:border-green-300 transition ${shippingMethod === 'sicepat-reg' ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}>
                    <div className="flex items-center space-x-3 flex-1">
                      <RadioGroupItem value="sicepat-reg" id="sicepat-reg" />
                      <div className="w-12 h-8 bg-white border border-gray-200 rounded flex items-center justify-center p-1">
                        {getShippingLogo('sicepat')}
                      </div>
                      <Label htmlFor="sicepat-reg" className="cursor-pointer flex-1">
                        <p className="font-semibold text-gray-900">SiCepat Reguler</p>
                        <p className="text-sm text-gray-600">Estimasi: 2-4 hari</p>
                      </Label>
                    </div>
                    <span className="font-bold text-green-600">GRATIS</span>
                  </div>

                  {/* Divider */}
                  <div className="my-4 border-t pt-4">
                    <p className="text-sm font-semibold text-gray-700 mb-3">Pengiriman Express</p>
                  </div>

                  {/* JNE - Express */}
                  <div className={`flex items-center justify-between p-4 border-2 rounded-lg mb-3 hover:border-green-300 transition ${shippingMethod === 'jne-express' ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}>
                    <div className="flex items-center space-x-3 flex-1">
                      <RadioGroupItem value="jne-express" id="jne-express" />
                      <div className="w-12 h-8 bg-white border border-gray-200 rounded flex items-center justify-center p-1">
                        {getShippingLogo('jne')}
                      </div>
                      <Label htmlFor="jne-express" className="cursor-pointer flex-1">
                        <p className="font-semibold text-gray-900">JNE YES</p>
                        <p className="text-sm text-gray-600">Estimasi: 1-2 hari</p>
                      </Label>
                    </div>
                    <span className="font-bold text-gray-900">Rp 18.000</span>
                  </div>

                  {/* Ninja Express */}
                  <div className={`flex items-center justify-between p-4 border-2 rounded-lg mb-3 hover:border-green-300 transition ${shippingMethod === 'ninja-express' ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}>
                    <div className="flex items-center space-x-3 flex-1">
                      <RadioGroupItem value="ninja-express" id="ninja-express" />
                      <div className="w-12 h-8 bg-white border border-gray-200 rounded flex items-center justify-center p-1">
                        {getShippingLogo('ninja')}
                      </div>
                      <Label htmlFor="ninja-express" className="cursor-pointer flex-1">
                        <p className="font-semibold text-gray-900">Ninja Xpress Standard</p>
                        <p className="text-sm text-gray-600">Estimasi: 2-3 hari</p>
                      </Label>
                    </div>
                    <span className="font-bold text-gray-900">Rp 15.000</span>
                  </div>

                  {/* AnterAja */}
                  <div className={`flex items-center justify-between p-4 border-2 rounded-lg mb-3 hover:border-green-300 transition ${shippingMethod === 'anteraja-express' ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}>
                    <div className="flex items-center space-x-3 flex-1">
                      <RadioGroupItem value="anteraja-express" id="anteraja-express" />
                      <div className="w-12 h-8 bg-white border border-gray-200 rounded flex items-center justify-center p-1">
                        {getShippingLogo('anteraja')}
                      </div>
                      <Label htmlFor="anteraja-express" className="cursor-pointer flex-1">
                        <p className="font-semibold text-gray-900">AnterAja Express</p>
                        <p className="text-sm text-gray-600">Estimasi: 1-2 hari</p>
                      </Label>
                    </div>
                    <span className="font-bold text-gray-900">Rp 18.000</span>
                  </div>

                  {/* Divider */}
                  <div className="my-4 border-t pt-4">
                    <p className="text-sm font-semibold text-gray-700 mb-3">Same Day / Next Day</p>
                  </div>

                  {/* JNE - Same Day */}
                  <div className={`flex items-center justify-between p-4 border-2 rounded-lg mb-3 hover:border-orange-300 transition ${shippingMethod === 'jne-same-day' ? 'border-orange-500 bg-orange-50' : 'border-gray-200'}`}>
                    <div className="flex items-center space-x-3 flex-1">
                      <RadioGroupItem value="jne-same-day" id="jne-same-day" />
                      <div className="w-12 h-8 bg-white border border-gray-200 rounded flex items-center justify-center p-1">
                        {getShippingLogo('jne')}
                      </div>
                      <Label htmlFor="jne-same-day" className="cursor-pointer flex-1">
                        <p className="font-semibold text-gray-900">JNE Same Day</p>
                        <p className="text-sm text-gray-600">Estimasi: Hari ini</p>
                      </Label>
                    </div>
                    <span className="font-bold text-orange-600">Rp 35.000</span>
                  </div>

                  {/* Ninja Next Day */}
                  <div className={`flex items-center justify-between p-4 border-2 rounded-lg hover:border-orange-300 transition ${shippingMethod === 'ninja-next-day' ? 'border-orange-500 bg-orange-50' : 'border-gray-200'}`}>
                    <div className="flex items-center space-x-3 flex-1">
                      <RadioGroupItem value="ninja-next-day" id="ninja-next-day" />
                      <div className="w-12 h-8 bg-white border border-gray-200 rounded flex items-center justify-center p-1">
                        {getShippingLogo('ninja')}
                      </div>
                      <Label htmlFor="ninja-next-day" className="cursor-pointer flex-1">
                        <p className="font-semibold text-gray-900">Ninja Next Day</p>
                        <p className="text-sm text-gray-600">Estimasi: Besok</p>
                      </Label>
                    </div>
                    <span className="font-bold text-orange-600">Rp 25.000</span>
                  </div>
                </RadioGroup>
              </Card>

              {/* Voucher Section */}
              {user && accessToken && (
                <VoucherSection
                  userId={user.id}
                  accessToken={accessToken}
                  subtotal={subtotal}
                  onVoucherApplied={handleVoucherApplied}
                  onVoucherRemoved={handleVoucherRemoved}
                  appliedVoucher={appliedVoucher}
                  voucherDiscount={voucherDiscount}
                />
              )}

              {/* Payment Method */}
              <Card className="p-6">
                <h2 className="font-bold text-lg mb-4 text-gray-900">Metode Pembayaran</h2>
                <PaymentMethodSelector
                  selectedMethod={selectedPaymentMethod}
                  onSelectMethod={setSelectedPaymentMethod}
                />
              </Card>
            </div>

            {/* Right Column - Order Summary (Sticky) */}
            <div className="lg:col-span-1">
              <Card className="p-6 sticky top-20">
                <h2 className="font-bold text-lg mb-4 text-gray-900">Ringkasan Pesanan</h2>
                <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
                  {items.map((item) => (
                    <div key={item.productId} className="flex gap-3 pb-3 border-b last:border-b-0">
                      <ImageWithFallback
                        src={item.product?.images?.[0] || item.product?.image || ''}
                        alt={item.product?.name || 'Product'}
                        className="w-16 h-16 object-cover rounded flex-shrink-0"
                        fallbackSrc="https://via.placeholder.com/150?text=No+Image"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-900 font-medium text-sm line-clamp-2">{item.product?.name || 'Produk'}</p>
                        <p className="text-gray-500 text-xs mt-1">x{item.quantity}</p>
                        {item.product?.originalPrice && (
                          <p className="text-xs text-gray-400 line-through mt-1">
                            {formatPrice((item.product.originalPrice) * item.quantity)}
                          </p>
                        )}
                        <p className="font-semibold text-green-600 text-sm mt-0.5">
                          {formatPrice((item.product?.price || item.price || 0) * item.quantity)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="font-semibold text-gray-900">{formatPrice(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Ongkir:</span>
                    <span className="font-semibold text-green-600">
                      {shippingCost === 0 ? 'GRATIS' : formatPrice(shippingCost)}
                    </span>
                  </div>
                  
                  {/* Voucher Discount */}
                  {appliedVoucher && voucherDiscount > 0 && (
                    <div className="flex justify-between text-sm bg-green-50 -mx-2 px-2 py-2 rounded">
                      <div className="flex flex-col">
                        <span className="text-green-700 font-medium">Diskon Voucher</span>
                        <span className="text-xs text-green-600">{appliedVoucher.code}</span>
                      </div>
                      <span className="font-semibold text-green-600">-{formatPrice(voucherDiscount)}</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between items-center pt-2 border-t">
                    <span className="font-bold text-gray-900">Total:</span>
                    <span className="text-xl font-bold text-green-600">{formatPrice(total)}</span>
                  </div>
                </div>

                <Button
                  onClick={handleCheckout}
                  className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 h-12 mt-6 text-base font-semibold"
                  disabled={isProcessing || !selectedPaymentMethod || isUnderMaintenance()}
                >
                  {isProcessing ? <ButtonLoader /> : isUnderMaintenance() ? 'Sistem Maintenance' : 'Bayar Sekarang'}
                </Button>
                
                {!selectedPaymentMethod && !isUnderMaintenance() && (
                  <p className="text-center text-xs text-red-600 mt-2">
                    Pilih metode pembayaran terlebih dahulu
                  </p>
                )}
                
                {isUnderMaintenance() && (
                  <p className="text-center text-xs text-orange-600 mt-2">
                    Sistem sedang dalam pemeliharaan
                  </p>
                )}
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* QRIS Modal */}
      <QRISModal
        isOpen={showQRISModal}
        onClose={() => {
          console.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.info('🚪 QRIS Modal onClose called');
          console.info('📊 Current payment status:', currentPaymentStatus);
          console.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          
          setShowQRISModal(false);
          isCheckingOutRef.current = false;
          
          // ✅ Clear cart when closing modal (order already created in backend)
          console.info('🗑️ Closing modal - clearing cart');
          clearCart();
          
          if (currentPaymentStatus === 'paid') {
            console.info(' Payment successful, navigating to payment-status');
            navigate(`/payment-status?orderId=${currentOrderId}`);
          } else {
            console.info('⚠️ Payment not completed, navigating to orders');
            navigate('/orders');
          }
        }}
        qrCode={qrCode}
        amount={currentOrderAmount || total}
        orderId={currentOrderId}
        paymentStatus={currentPaymentStatus}
        onPaymentStatusChange={handlePaymentStatusChange}
        expiryMinutes={10}
      />

      {/* Virtual Account Modal */}
      <VirtualAccountModal
        isOpen={showVAModal}
        onClose={() => {
          setShowVAModal(false);
          isCheckingOutRef.current = false;
          
          // ✅ Clear cart when closing modal (order already created in backend)
          console.info('🗑️ Closing modal - clearing cart');
          clearCart();
          
          if (currentPaymentStatus === 'paid') {
            navigate(`/payment-status?orderId=${currentOrderId}`);
          } else {
            // If not paid, redirect to orders page
            navigate('/orders');
          }
        }}
        virtualAccount={virtualAccount}
        amount={currentOrderAmount || total}
        orderId={currentOrderId}
        bankName={getBankName(selectedPaymentMethod!)}
        paymentMethod={selectedPaymentMethod!}
        paymentStatus={currentPaymentStatus}
        onPaymentStatusChange={handlePaymentStatusChange}
        expiryHours={24}
      />

      {/* E-Wallet Modal */}
      {selectedPaymentMethod && ['Gopay', 'OVO', 'DANA', 'ShopeePay', 'LinkAja'].includes(selectedPaymentMethod) && (
        <EWalletModal
          isOpen={showEWalletModal}
          onClose={() => {
            setShowEWalletModal(false);
            isCheckingOutRef.current = false;
            
            // ✅ Clear cart when closing modal (order already created in backend)
            console.info('🗑️ Closing modal - clearing cart');
            clearCart();
            
            if (currentPaymentStatus === 'paid') {
              navigate(`/payment-status?orderId=${currentOrderId}`);
            } else {
              navigate('/orders');
            }
          }}
          walletType={selectedPaymentMethod as 'Gopay' | 'OVO' | 'DANA' | 'ShopeePay' | 'LinkAja'}
          amount={currentOrderAmount || total}
          orderId={currentOrderId}
          paymentStatus={currentPaymentStatus}
          onPaymentStatusChange={handlePaymentStatusChange}
          expiryMinutes={10}
        />
      )}

      {/* Address Modal */}
      <AddressModal
        isOpen={showAddressModal}
        onClose={() => setShowAddressModal(false)}
        user={user!}
        selectedAddress={selectedAddress}
        onSelectAddress={handleSelectAddress}
        onAddAddress={handleAddAddress}
      />
    </Layout>
  );
}