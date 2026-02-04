import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { projectId, publicAnonKey } from '/utils/supabase'; // ✅ FIXED: Corrected import path
import { useProducts } from '@/lib/useProducts';
import { Product, useProductStore } from '@/lib/store';
import AdminLayout from '@/app/components/Layout/AdminLayout';
import { getAccessToken } from '@/lib/authHelper';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Card } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { 
  Zap, 
  Search, 
  Check, 
  AlertCircle, 
  Plus, 
  X, 
  Clock, 
  Calendar, 
  Percent 
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/app/components/ui/dialog';
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

export default function AdminFlashSale() {
  const { products, isLoading, reloadProducts } = useProducts();
  const { setProducts: updateProducts } = useProductStore();
  const [search, setSearch] = useState('');
  const [flashSaleProducts, setFlashSaleProducts] = useState<Product[]>([]);
  const [otherProducts, setOtherProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [flashSaleEndTime, setFlashSaleEndTime] = useState('');
  const [discountPercentage, setDiscountPercentage] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showRefreshDialog, setShowRefreshDialog] = useState(false);

  // Filter products based on flash sale status
  useEffect(() => {
    // ✅ FIX: Filter lebih ketat - hanya produk dengan isFlashSale === true yang masuk flash sale
    const flashSale = products.filter((p) => p.isFlashSale === true);
    // ✅ FIX: Produk lain adalah yang isFlashSale !== true (false atau undefined)
    const others = products.filter((p) => p.isFlashSale !== true);
    setFlashSaleProducts(flashSale);
    setOtherProducts(others);
    
    // ✅ Debug log untuk memastikan filtering bekerja
    console.info('=== FLASH SALE FILTERING ===');
    console.info('📊 Total Products:', products.length);
    console.info('⚡ Flash Sale Products:', flashSale.length);
    console.info('📦 Other Products (available to add):', others.length);
    console.info('🔍 Flash Sale Product Details:', flashSale.map(p => ({ id: p.id, name: p.name, isFlashSale: p.isFlashSale })));
    console.info('🔍 Other Product Details:', others.map(p => ({ id: p.id, name: p.name, isFlashSale: p.isFlashSale })));
  }, [products]);

  // Filter products based on search
  const filteredOtherProducts = otherProducts.filter((product) =>
    product.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleAddToFlashSale = async (product: Product) => {
    setIsSubmitting(true);
    try {
      // ✅ FIXED: Use auth helper instead of localStorage
      const accessToken = await getAccessToken();

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-adb995ba/products/${product.id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'X-Session-Token': accessToken || '',
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            ...product,
            isFlashSale: true,
            flashSaleEndTime: flashSaleEndTime,
            discount: discountPercentage,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Failed to add product to flash sale:', errorData);
        throw new Error(errorData.error || 'Failed to add product to flash sale');
      }

      toast.success(`${product.name} ditambahkan ke Flash Sale!`);
      await reloadProducts();
      setIsDialogOpen(false);
      setSelectedProduct(null);
    } catch (error) {
      console.error('Error adding to flash sale:', error);
      toast.error('Gagal menambahkan produk ke Flash Sale');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveFromFlashSale = async (product: Product) => {
    try {
      // ✅ FIXED: Use auth helper instead of localStorage
      const accessToken = await getAccessToken();

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-adb995ba/products/${product.id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'X-Session-Token': accessToken || '',
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            ...product,
            isFlashSale: false,
            flashSaleEndTime: null,
            discount: null,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Failed to remove product from flash sale:', errorData);
        throw new Error(errorData.error || 'Failed to remove product from flash sale');
      }

      toast.success(`${product.name} dihapus dari Flash Sale`);
      await reloadProducts();
    } catch (error) {
      console.error('Error removing from flash sale:', error);
      toast.error('Gagal menghapus produk dari Flash Sale');
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const formatDateTime = (dateTime: string) => {
    return new Date(dateTime).toLocaleString('id-ID', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center shadow-lg">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Kelola Flash Sale</h1>
              <p className="text-gray-600 mt-1">
                Atur produk yang akan ditampilkan di Flash Sale
              </p>
            </div>
          </div>
          
          {flashSaleProducts.length > 0 && (
            <Button
              variant="outline"
              onClick={() => setShowRefreshDialog(true)}
              className="gap-2"
            >
              <AlertCircle className="w-4 h-4" />
              Refresh Flash Sale
            </Button>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6 bg-gradient-to-br from-orange-50 to-red-50 border-orange-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Produk Flash Sale</p>
                <p className="text-3xl font-bold text-orange-600">{flashSaleProducts.length}</p>
              </div>
              <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center">
                <Zap className="w-6 h-6 text-white" />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Produk Tersedia</p>
                <p className="text-3xl font-bold text-blue-600">{otherProducts.length}</p>
              </div>
              <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                <Search className="w-6 h-6 text-white" />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Produk</p>
                <p className="text-3xl font-bold text-green-600">{products.length}</p>
              </div>
              <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center">
                <Check className="w-6 h-6 text-white" />
              </div>
            </div>
          </Card>
        </div>

        {/* Produk Flash Sale */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-orange-600" />
              <h2 className="text-xl font-bold text-gray-900">Produk Flash Sale</h2>
              <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                {flashSaleProducts.length} Produk
              </Badge>
            </div>
          </div>

          {flashSaleProducts.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 font-medium">Belum ada produk di Flash Sale</p>
              <p className="text-gray-500 text-sm mt-2">
                Tambahkan produk dari daftar di bawah
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {flashSaleProducts.map((product) => (
                <Card key={product.id} className="p-4 hover:shadow-lg transition border-2 border-orange-200">
                  <div className="flex gap-4">
                    <img
                      src={product.images?.[0] || product.image || 'https://via.placeholder.com/100'}
                      alt={product.name}
                      className="w-20 h-20 object-cover rounded-lg"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 line-clamp-2 mb-1">
                        {product.name}
                      </h3>
                      <div className="space-y-1">
                        {product.originalPrice && (
                          <p className="text-xs text-gray-400 line-through">
                            {formatPrice(product.originalPrice)}
                          </p>
                        )}
                        <p className="text-sm font-bold text-orange-600">
                          {formatPrice(product.price)}
                        </p>
                        {product.discount && (
                          <Badge className="bg-red-500 text-white text-xs">
                            -{product.discount}%
                          </Badge>
                        )}
                        {product.flashSaleEndTime && (
                          <div className="flex items-center gap-1 text-xs text-gray-600">
                            <Clock className="w-3 h-3" />
                            <span>Berakhir: {formatDateTime(product.flashSaleEndTime)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRemoveFromFlashSale(product)}
                    className="w-full mt-3 border-red-300 text-red-600 hover:bg-red-50"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Hapus dari Flash Sale
                  </Button>
                </Card>
              ))}
            </div>
          )}
        </Card>

        {/* Tambah Produk ke Flash Sale */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-green-600" />
              <h2 className="text-xl font-bold text-gray-900">Tambah ke Flash Sale</h2>
            </div>
          </div>

          {/* Search */}
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              placeholder="Cari produk..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Product List */}
          {filteredOtherProducts.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 font-medium">
                {search ? 'Produk tidak ditemukan' : 'Semua produk sudah ada di Flash Sale'}
              </p>
              {!search && otherProducts.length === 0 && (
                <p className="text-gray-500 text-sm mt-2">
                  ✅ Semua {products.length} produk telah ditambahkan ke Flash Sale
                </p>
              )}
            </div>
          ) : (
            <>
              {/* ✅ Info Banner */}
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-700">
                  <strong>{filteredOtherProducts.length}</strong> produk tersedia untuk ditambahkan ke Flash Sale
                  {search && <span> (dari hasil pencarian)</span>}
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredOtherProducts.map((product) => (
                  <Card key={product.id} className="p-4 hover:shadow-lg transition">
                    <div className="flex gap-4">
                      <img
                        src={product.images?.[0] || product.image || 'https://via.placeholder.com/100'}
                        alt={product.name}
                        className="w-20 h-20 object-cover rounded-lg"
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 line-clamp-2 mb-1">
                          {product.name}
                        </h3>
                        <div className="space-y-0.5">
                          {product.originalPrice && (
                            <p className="text-xs text-gray-400 line-through">
                              {formatPrice(product.originalPrice)}
                            </p>
                          )}
                          <p className="text-sm font-bold text-green-600">
                            {formatPrice(product.price)}
                          </p>
                          {product.discount && (
                            <Badge className="bg-orange-500 text-white text-xs mt-1">
                              Diskon {product.discount}%
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleAddToFlashSale(product)}
                      className="w-full mt-3 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Tambah ke Flash Sale
                    </Button>
                  </Card>
                ))}
              </div>
            </>
          )}
        </Card>

        {/* Dialog for setting flash sale end time */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Tambah ke Flash Sale</DialogTitle>
              <DialogDescription>
                Atur waktu berakhir flash sale untuk produk ini
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {selectedProduct && (
                <>
                  <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                    <img
                      src={selectedProduct.images?.[0] || selectedProduct.image || 'https://via.placeholder.com/100'}
                      alt={selectedProduct.name}
                      className="w-16 h-16 object-cover rounded-lg"
                    />
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{selectedProduct.name}</h3>
                      <p className="text-sm text-gray-600">{formatPrice(selectedProduct.price)}</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        Waktu Berakhir Flash Sale
                      </div>
                    </label>
                    <Input
                      type="datetime-local"
                      value={flashSaleEndTime}
                      onChange={(e) => setFlashSaleEndTime(e.target.value)}
                      className="w-full"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Flash sale akan otomatis berakhir pada waktu yang ditentukan
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <div className="flex items-center gap-2">
                        <Percent className="w-4 h-4" />
                        Diskon (%)
                      </div>
                    </label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={discountPercentage}
                      onChange={(e) => {
                        const value = Number(e.target.value);
                        // Validate range 0-100
                        if (value < 0) {
                          setDiscountPercentage(0);
                        } else if (value > 100) {
                          setDiscountPercentage(100);
                        } else {
                          setDiscountPercentage(value);
                        }
                      }}
                      className="w-full"
                      placeholder="Contoh: 25"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Masukkan persentase diskon (0-100%)
                    </p>
                  </div>

                  {/* Price Preview */}
                  {discountPercentage > 0 && (
                    <div className="p-4 bg-gradient-to-r from-orange-50 to-red-50 rounded-lg border-2 border-orange-200">
                      <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <Zap className="w-4 h-4 text-orange-600" />
                        Preview Harga Flash Sale
                      </h4>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Harga Asli:</span>
                          <span className="text-sm font-medium text-gray-900">
                            {formatPrice(selectedProduct.originalPrice || selectedProduct.price)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Diskon:</span>
                          <Badge className="bg-red-500 text-white">
                            -{discountPercentage}%
                          </Badge>
                        </div>
                        <div className="h-px bg-orange-200 my-2"></div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-gray-900">Harga Setelah Diskon:</span>
                          <span className="text-lg font-bold text-orange-600">
                            {formatPrice(
                              Math.round((selectedProduct.originalPrice || selectedProduct.price) * (1 - discountPercentage / 100))
                            )}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">Hemat:</span>
                          <span className="text-xs font-medium text-green-600">
                            {formatPrice(
                              Math.round((selectedProduct.originalPrice || selectedProduct.price) * (discountPercentage / 100))
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                      disabled={isSubmitting}
                      className="flex-1"
                    >
                      Batal
                    </Button>
                    <Button
                      onClick={handleConfirmAddToFlashSale}
                      disabled={isSubmitting || !flashSaleEndTime}
                      className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Menambahkan...
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4 mr-2" />
                          Tambahkan
                        </>
                      )}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Refresh Flash Sale Dialog */}
        <AlertDialog open={showRefreshDialog} onOpenChange={setShowRefreshDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Refresh Flash Sale</AlertDialogTitle>
              <AlertDialogDescription>
                Anda yakin ingin mereset semua produk Flash Sale? Produk akan dihapus dan harus ditambahkan kembali dengan diskon.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setShowRefreshDialog(false)}>
                Batal
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={async () => {
                  try {
                    // ✅ FIXED: Use auth helper instead of localStorage
                    const accessToken = getAccessToken();
                    
                    for (const product of flashSaleProducts) {
                      await fetch(
                        `https://${projectId}.supabase.co/functions/v1/make-server-adb995ba/products/${product.id}`,
                        {
                          method: 'PUT',
                          headers: {
                            'Content-Type': 'application/json',
                            'X-Session-Token': accessToken || '',
                            Authorization: `Bearer ${publicAnonKey}`,
                          },
                          body: JSON.stringify({
                            ...product,
                            isFlashSale: false,
                            flashSaleEndTime: null,
                            discount: null,
                          }),
                        }
                      );
                    }
                    
                    await reloadProducts();
                    toast.success('Semua produk Flash Sale berhasil di-refresh!');
                  } catch (error) {
                    toast.error('Gagal refresh produk Flash Sale');
                  } finally {
                    setShowRefreshDialog(false);
                  }
                }}
                className="bg-red-500 hover:bg-red-600"
              >
                Refresh Flash Sale
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  );
}