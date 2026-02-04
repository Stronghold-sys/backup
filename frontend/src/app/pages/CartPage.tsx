import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Button } from '@/app/components/ui/button';
import { Card } from '@/app/components/ui/card';
import { Checkbox } from '@/app/components/ui/checkbox';
import { ShoppingBag, Plus, Minus, Trash2 } from 'lucide-react';
import Layout from '@/app/components/Layout/Layout';
import { useCartStore } from '@/lib/store';
import { useCartSync } from '@/lib/useCartSync'; // ✅ FIXED: Back to original import
import { useProducts } from '@/lib/useProducts';
import { useMaintenanceGuard } from '@/lib/maintenanceGuard'; // ✅ FIXED v2.0: Now using .tsx file
import { toast } from 'sonner';
import { ImageWithFallback } from '@/app/components/figma/ImageWithFallback';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/app/components/ui/alert-dialog';

function CartPage() {
  const navigate = useNavigate();
  const { items, removeItem, updateQuantity, clearCart, getTotalItems, getTotalPrice } = useCartStore();
  const [showClearDialog, setShowClearDialog] = useState(false);
  const { checkAndBlock } = useMaintenanceGuard();
  
  // Load products untuk sinkronisasi
  useProducts();
  
  // ✅ RE-ENABLED: Cart sync with improved debounce mechanism
  // Sinkronisasi cart dengan product data terbaru
  useCartSync();

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const handleClearCart = () => {
    setShowClearDialog(true);
  };

  const confirmClearCart = () => {
    clearCart();
    toast.success('Keranjang berhasil dikosongkan');
    setShowClearDialog(false);
  };

  const handleCheckout = () => {
    // ✅ Check maintenance mode before checkout
    if (!checkAndBlock('checkout')) {
      return; // Blocked by maintenance
    }
    navigate('/checkout');
  };

  // Render empty state without early return
  const isEmpty = items.length === 0;

  return (
    <Layout>
      {isEmpty ? (
        <div className="flex-1 bg-gray-50 flex items-center justify-center py-12">
          <div className="text-center">
            <ShoppingBag className="w-20 h-20 text-gray-300 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Keranjang Anda Kosong</h2>
            <p className="text-gray-500 mb-6">Ayo mulai belanja dan tambahkan produk ke keranjang!</p>
            <Link to="/products">
              <Button className="bg-green-600 hover:bg-green-700">
                Mulai Belanja
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="flex-1 bg-gray-50 py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h1 className="text-2xl font-bold mb-6">Keranjang Belanja</h1>

            <div className="grid lg:grid-cols-3 gap-6">
              {/* Cart Items */}
              <div className="lg:col-span-2 space-y-4">
                <Card className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <label className="flex items-center space-x-2">
                      <Checkbox defaultChecked />
                      <span className="font-medium">Pilih Semua ({items.length})</span>
                    </label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleClearCart}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      Hapus Semua
                    </Button>
                  </div>

                  <div className="space-y-4">
                    {items.map((item) => (
                      <div key={item.productId} className="flex gap-4 pb-4 border-b last:border-0">
                        <Checkbox defaultChecked />

                        <ImageWithFallback
                          src={item.product?.images?.[0] || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200&h=200&fit=crop'}
                          alt={item.product?.name || 'Product'}
                          className="w-24 h-24 object-cover rounded-lg"
                        />

                        <div className="flex-1">
                          <Link
                            to={`/products/${item.product?.id || item.productId}`}
                            className="font-medium text-gray-900 hover:text-green-600 line-clamp-2"
                          >
                            {item.product?.name || 'Produk'}
                          </Link>
                          
                          {item.product?.stock > 0 && item.product?.stock <= 10 && (
                            <p className="text-xs text-orange-600 mt-1">Tersisa {item.product.stock} pcs</p>
                          )}

                          <div className="flex items-center justify-between mt-3">
                            <div className="space-y-0.5">
                              {item.product?.originalPrice && (
                                <p className="text-xs text-gray-400 line-through">
                                  {formatPrice(item.product.originalPrice)}
                                </p>
                              )}
                              <span className="text-lg font-bold text-green-600 block">
                                {formatPrice(item.product?.price || 0)}
                              </span>
                            </div>

                            <div className="flex items-center space-x-3">
                              <div className="flex items-center border rounded-lg">
                                <button
                                  onClick={() => updateQuantity(item.productId, Math.max(1, item.quantity - 1))}
                                  className="px-2 py-1 hover:bg-gray-100"
                                  disabled={item.quantity <= 1}
                                >
                                  <Minus className="w-4 h-4" />
                                </button>
                                <input
                                  type="number"
                                  value={item.quantity}
                                  onChange={(e) => {
                                    const qty = parseInt(e.target.value) || 1;
                                    updateQuantity(item.productId, Math.max(1, Math.min(item.product?.stock || 999, qty)));
                                  }}
                                  className="w-12 text-center border-x py-1"
                                />
                                <button
                                  onClick={() => updateQuantity(item.productId, Math.min(item.product?.stock || 999, item.quantity + 1))}
                                  className="px-2 py-1 hover:bg-gray-100"
                                  disabled={item.quantity >= (item.product?.stock || 999)}
                                >
                                  <Plus className="w-4 h-4" />
                                </button>
                              </div>

                              <button
                                onClick={() => removeItem(item.productId)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>

              {/* Order Summary */}
              <div className="lg:col-span-1">
                <Card className="p-6 sticky top-20">
                  <h3 className="font-bold text-lg mb-4">Ringkasan Belanja</h3>

                  <div className="space-y-3 mb-6">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Total Harga ({getTotalItems()} barang)</span>
                      <span className="font-medium">{formatPrice(getTotalPrice())}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Biaya Pengiriman</span>
                      <span className="font-medium text-green-600">GRATIS</span>
                    </div>
                  </div>

                  <div className="border-t pt-4 mb-6">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold">Total</span>
                      <span className="text-2xl font-bold text-green-600">
                        {formatPrice(getTotalPrice())}
                      </span>
                    </div>
                  </div>

                  <Button
                    onClick={handleCheckout}
                    className="w-full bg-green-600 hover:bg-green-700 h-12 text-base"
                  >
                    Lanjut ke Pembayaran
                  </Button>

                  <div className="mt-4 space-y-2 text-xs text-gray-500">
                    <div className="flex items-center">
                      <span className="mr-1">✓</span>
                      <span>100% Pembayaran Aman</span>
                    </div>
                    <div className="flex items-center">
                      <span className="mr-1">✓</span>
                      <span>Garansi Uang Kembali</span>
                    </div>
                    <div className="flex items-center">
                      <span className="mr-1">✓</span>
                      <span>Gratis Ongkir Min. Rp 50.000</span>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Clear Cart Confirmation Dialog */}
      <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Kosongkan Keranjang</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin mengosongkan keranjang belanja Anda? Tindakan ini tidak dapat diurungkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Kembali</AlertDialogCancel>
            <AlertDialogAction onClick={confirmClearCart}>Hapus Semua</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}

export default CartPage;