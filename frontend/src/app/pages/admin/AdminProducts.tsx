import { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, Search, Info, Zap } from 'lucide-react';
import AdminLayout from '@/app/components/Layout/AdminLayout';
import { Card } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/app/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/app/components/ui/alert-dialog';
import { api } from '@/lib/supabase';
import { Product, useAuthStore, useProductStore } from '@/lib/store';
import { useProducts } from '@/lib/useProducts';
import { toast } from 'sonner';
import ProductImageUpload from '@/app/components/ProductImageUpload';
import { ImageWithFallback } from '@/app/components/figma/ImageWithFallback';
import { useRealTimeSync } from '@/lib/useRealTimeSync';
import { Badge } from '@/app/components/ui/badge';
import { Star } from 'lucide-react';
import { Package } from 'lucide-react';

export default function AdminProducts() {
  const { accessToken } = useAuthStore();
  const { products: storeProducts, addProduct, updateProduct, deleteProduct } = useProductStore();
  const { isLoading: productsLoading, reloadProducts } = useProducts();
  
  // ✅ FIX: Real-time sync - useRealTimeSync expects number, not object
  useRealTimeSync(30000);
  
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  
  // Dialog states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  
  // Form states
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: 0,
    originalPrice: 0,
    discount: 0,
    category: '',
    stock: 0,
    images: [] as string[],
  });

  // 🔧 SYNC ALL PRODUCTS TO BACKEND ON MOUNT
  // ⚠️ DISABLED: Auto-sync can cause network errors if backend not ready
  // Products are synced when created/updated via admin panel
  /*
  useEffect(() => {
    const syncProductsToBackend = async () => {
      if (!accessToken || storeProducts.length === 0) return;

      console.info('🔄 Syncing all products to backend...');
      console.info('📦 Total products in store:', storeProducts.length);

      for (const product of storeProducts) {
        try {
          console.info(`📤 Syncing product: ${product.id} - ${product.name}`);
          await api.post('/products', product, accessToken);
          console.info(`✅ Synced: ${product.id}`);
        } catch (error) {
          console.error(`❌ Failed to sync: ${product.id}`, error);
        }
      }

      console.info('✅ All products synced to backend!');
    };

    syncProductsToBackend();
  }, [accessToken]); // Only run once when accessToken is available
  */

  useEffect(() => {
    filterProducts();
  }, [storeProducts, searchQuery, categoryFilter]);

  const filterProducts = () => {
    let filtered = storeProducts;

    if (categoryFilter !== 'all') {
      filtered = filtered.filter((product) => product.category === categoryFilter);
    }

    if (searchQuery) {
      filtered = filtered.filter((product) =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredProducts(filtered);
  };

  const handleAdd = async () => {
    try {
      // Create new product with ID
      const newProduct: Product = {
        id: `prod-${Date.now()}`,
        name: formData.name,
        description: formData.description,
        price: formData.price,
        originalPrice: formData.originalPrice,
        discount: formData.discount,
        category: formData.category,
        stock: formData.stock,
        images: formData.images,
        sold: 0,
        rating: 0,
        reviewCount: 0,
        // ✅ FIX: Produk baru TIDAK otomatis masuk Flash Sale
        isFlashSale: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Save to backend first
      if (accessToken) {
        console.info('📤 Saving product to backend:', newProduct.id);
        console.info('📤 Product data:', newProduct);
        
        const response = await api.post('/products', newProduct, accessToken);
        
        if (response.success) {
          console.info('✅ Product saved to backend successfully');
          
          // Add to local store
          addProduct(newProduct);
          
          // Reload products from backend to sync all users
          await reloadProducts();
          
          toast.success('Produk berhasil ditambahkan ke database');
          setIsAddOpen(false);
          resetForm();
        } else {
          throw new Error(response.error || 'Gagal menyimpan produk');
        }
      } else {
        // Fallback: Add to store only (offline mode)
        addProduct(newProduct);
        toast.success('Produk berhasil ditambahkan (mode offline)');
        setIsAddOpen(false);
        resetForm();
      }
    } catch (error: any) {
      console.error('Error adding product:', error);
      toast.error(error.message || 'Terjadi kesalahan saat menambahkan produk');
    }
  };

  const handleEdit = async () => {
    if (!selectedProduct) return;

    try {
      // Create updated product object
      const updatedProduct = {
        ...selectedProduct,
        ...formData,
        updatedAt: new Date().toISOString(),
      };

      // Update backend first
      if (accessToken) {
        console.info('📤 Updating product in backend:', selectedProduct.id);
        
        const response = await api.put(`/products/${selectedProduct.id}`, updatedProduct, accessToken);
        
        if (response.success) {
          console.info('✅ Product updated in backend successfully');
          
          // Update local store
          updateProduct(selectedProduct.id, formData);
          
          // Reload products from backend to sync all users
          await reloadProducts();
          
          toast.success('Produk berhasil diperbarui di database');
          setIsEditOpen(false);
          resetForm();
        } else {
          throw new Error(response.error || 'Gagal memperbarui produk');
        }
      } else {
        // Fallback: Update store only
        updateProduct(selectedProduct.id, formData);
        toast.success('Produk berhasil diperbarui');
        setIsEditOpen(false);
        resetForm();
      }
    } catch (error: any) {
      console.error('Error updating product:', error);
      toast.error(error.message || 'Terjadi kesalahan saat memperbarui produk');
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    try {
      // Delete from backend first (hard delete from database)
      if (accessToken) {
        const response = await api.delete(`/products/${productId}`, accessToken);
        
        if (response.success) {
          console.info('✅ Product deleted from backend successfully');
          
          // Delete from local store
          deleteProduct(productId);
          
          // Reload products from backend to sync all users
          await reloadProducts();
          
          toast.success('Produk berhasil dihapus dari database dan tampilan');
        } else {
          throw new Error(response.error || 'Gagal menghapus produk');
        }
      } else {
        // Fallback: Delete from store only
        deleteProduct(productId);
        toast.success('Produk berhasil dihapus');
      }
    } catch (error: any) {
      console.error('Error deleting product:', error);
      toast.error(error.message || 'Terjadi kesalahan saat menghapus produk');
    }
  };

  const openEditDialog = (product: Product) => {
    setSelectedProduct(product);
    setFormData({
      name: product.name,
      description: product.description,
      price: product.price,
      originalPrice: product.originalPrice || 0,
      discount: product.discount || 0,
      category: product.category,
      stock: product.stock,
      images: product.images,
    });
    setIsEditOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: 0,
      originalPrice: 0,
      discount: 0,
      category: '',
      stock: 0,
      images: [],
    });
    setSelectedProduct(null);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const categories = ['Elektronik', 'Fashion', 'Makanan & Minuman', 'Kecantikan', 'Olahraga', 'Buku', 'Mainan', 'Lainnya'];

  return (
    <AdminLayout>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        {/* Fixed Header */}
        <div style={{ flexShrink: 0 }}>
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Kelola Produk</h1>
            <Button
              onClick={() => {
                resetForm();
                setIsAddOpen(true);
              }}
              className="bg-green-600 hover:bg-green-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Tambah Produk
            </Button>
          </div>

          {/* ✅ INFO: Flash Sale Notice */}
          <div className="mb-4 p-4 bg-gradient-to-r from-orange-50 to-red-50 border-2 border-orange-200 rounded-xl">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-gray-900 mb-1 flex items-center gap-2">
                  <Info className="w-4 h-4 text-orange-600" />
                  Informasi Flash Sale
                </h3>
                <p className="text-sm text-gray-700">
                  Produk yang ditambahkan di halaman ini <strong>TIDAK akan otomatis masuk ke Flash Sale</strong>. 
                  Untuk menambahkan produk ke Flash Sale, silakan gunakan menu <strong>"Flash Sale"</strong> di sidebar.
                </p>
              </div>
            </div>
          </div>

          {/* Filters */}
          <Card className="p-4 mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Cari produk..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder="Filter Kategori" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Kategori</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </Card>
        </div>

        {/* Scrollable Content */}
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
          <Card>
            {isLoading ? (
              <div className="p-8 text-center text-gray-500">
                <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p>Memuat data produk...</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                {searchQuery || categoryFilter !== 'all' ? (
                  <>
                    <Package className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <p className="text-lg font-medium mb-2">Tidak ada produk ditemukan</p>
                    <p className="text-sm">Coba ubah filter atau kata kunci pencarian</p>
                  </>
                ) : (
                  <>
                    <Package className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <p className="text-lg font-medium mb-2">Belum ada produk</p>
                    <p className="text-sm mb-4">Mulai tambahkan produk pertama Anda</p>
                    <Button
                      onClick={() => {
                        setSelectedProduct(null);
                        setIsAddOpen(true);
                      }}
                      className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Tambah Produk
                    </Button>
                  </>
                )}
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4">Produk</th>
                        <th className="text-left py-3 px-4">Kategori</th>
                        <th className="text-right py-3 px-4">Harga</th>
                        <th className="text-center py-3 px-4">Stok</th>
                        <th className="text-center py-3 px-4">Terjual</th>
                        <th className="text-center py-3 px-4">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProducts.map((product) => (
                        <tr key={product.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <div className="flex items-center space-x-3">
                              <ImageWithFallback
                                src={product.images?.[0] || product.image || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=100&h=100&fit=crop'}
                                alt={product.name}
                                className="w-12 h-12 rounded object-cover"
                              />
                              <div>
                                <p className="font-medium text-gray-900">{product.name}</p>
                                <div className="flex items-center space-x-2 mt-1">
                                  <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                  <span className="text-xs text-gray-500">{product.rating.toFixed(1)}</span>
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-gray-600">{product.category}</td>
                          <td className="py-3 px-4 text-right">
                            <div>
                              <p className="font-semibold text-green-600">
                                {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(product.price)}
                              </p>
                              {product.originalPrice && (
                                <p className="text-xs text-gray-400 line-through">
                                  {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(product.originalPrice)}
                                </p>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <Badge className={product.stock === 0 ? 'bg-red-500' : product.stock <= 10 ? 'bg-orange-500' : 'bg-green-500'}>
                              {product.stock}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-center text-gray-600">{product.sold || 0}</td>
                          <td className="py-3 px-4">
                            <div className="flex justify-center space-x-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openEditDialog(product)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600 hover:bg-red-50"
                                onClick={() => {
                                  setProductToDelete(product.id);
                                  setDeleteDialogOpen(true);
                                }}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden divide-y divide-gray-200">
                  {filteredProducts.map((product) => (
                    <div key={product.id} className="p-4 hover:bg-gray-50">
                      <div className="flex gap-3 mb-3">
                        <ImageWithFallback
                          src={product.images?.[0] || product.image || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=100&h=100&fit=crop'}
                          alt={product.name}
                          className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-gray-900 mb-1 line-clamp-2">{product.name}</h3>
                          <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                            <span>{product.rating.toFixed(1)}</span>
                            <span>•</span>
                            <span>{product.category}</span>
                          </div>
                          <div className="flex items-baseline gap-2">
                            <p className="text-lg font-bold text-green-600">
                              {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(product.price)}
                            </p>
                            {product.originalPrice && (
                              <p className="text-xs text-gray-400 line-through">
                                {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(product.originalPrice)}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-3 border-t">
                        <div className="flex gap-3 text-sm">
                          <div>
                            <span className="text-gray-500">Stok:</span>
                            <Badge className={`ml-1 ${product.stock === 0 ? 'bg-red-500' : product.stock <= 10 ? 'bg-orange-500' : 'bg-green-500'}`}>
                              {product.stock}
                            </Badge>
                          </div>
                          <div>
                            <span className="text-gray-500">Terjual:</span>
                            <span className="ml-1 font-medium">{product.sold || 0}</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEditDialog(product)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:bg-red-50"
                            onClick={() => {
                              setProductToDelete(product.id);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </Card>
        </div>
      </div>

      {/* Add Product Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b pb-4">
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-orange-500 to-pink-500 bg-clip-text text-transparent">
              Tambah Produk Baru
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-500">
              Lengkapi informasi produk yang akan ditambahkan ke katalog
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Informasi Dasar Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <div className="w-1 h-4 bg-gradient-to-b from-orange-500 to-pink-500 rounded-full"></div>
                Informasi Dasar
              </h3>
              
              <div>
                <Label htmlFor="name" className="text-sm font-medium text-gray-700">
                  Nama Produk <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Contoh: iPhone 15 Pro Max 256GB"
                  className="mt-1.5 h-11"
                />
              </div>

              <div>
                <Label htmlFor="description" className="text-sm font-medium text-gray-700">
                  Deskripsi <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Jelaskan detail produk, spesifikasi, dan keunggulannya..."
                  rows={4}
                  className="mt-1.5 resize-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="category" className="text-sm font-medium text-gray-700">
                    Kategori <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger className="mt-1.5 h-11">
                      <SelectValue placeholder="Pilih kategori" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="stock" className="text-sm font-medium text-gray-700">
                    Stok <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="stock"
                    type="number"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })}
                    placeholder="0"
                    className="mt-1.5 h-11"
                    min="0"
                  />
                </div>
              </div>
            </div>

            {/* Harga Section */}
            <div className="space-y-4 pt-2">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <div className="w-1 h-4 bg-gradient-to-b from-orange-500 to-pink-500 rounded-full"></div>
                Informasi Harga
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="price" className="text-sm font-medium text-gray-700">
                    Harga Jual <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative mt-1.5">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                      Rp
                    </span>
                    <Input
                      id="price"
                      type="number"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: parseInt(e.target.value) || 0 })}
                      placeholder="0"
                      className="pl-10 h-11"
                      min="0"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="originalPrice" className="text-sm font-medium text-gray-700">
                    Harga Asli
                  </Label>
                  <div className="relative mt-1.5">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                      Rp
                    </span>
                    <Input
                      id="originalPrice"
                      type="number"
                      value={formData.originalPrice}
                      onChange={(e) => setFormData({ ...formData, originalPrice: parseInt(e.target.value) || 0 })}
                      placeholder="0"
                      className="pl-10 h-11"
                      min="0"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Opsional, untuk diskon</p>
                </div>

                <div>
                  <Label htmlFor="discount" className="text-sm font-medium text-gray-700">
                    Diskon
                  </Label>
                  <div className="relative mt-1.5">
                    <Input
                      id="discount"
                      type="number"
                      value={formData.discount}
                      onChange={(e) => setFormData({ ...formData, discount: parseInt(e.target.value) || 0 })}
                      placeholder="0"
                      className="pr-8 h-11"
                      min="0"
                      max="100"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                      %
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">0-100%</p>
                </div>
              </div>
            </div>

            {/* Gambar Section */}
            <div className="space-y-4 pt-2">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <div className="w-1 h-4 bg-gradient-to-b from-orange-500 to-pink-500 rounded-full"></div>
                Gambar Produk
              </h3>
              <ProductImageUpload
                currentImageUrl={formData.images[0]}
                onImageUploaded={(url) => setFormData({ ...formData, images: [url] })}
                onImageRemoved={() => setFormData({ ...formData, images: [] })}
              />
            </div>
          </div>

          <DialogFooter className="border-t pt-4 gap-2">
            <Button 
              variant="outline" 
              onClick={() => setIsAddOpen(false)}
              className="h-11 px-6"
            >
              Batal
            </Button>
            <Button 
              onClick={handleAdd} 
              className="bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white h-11 px-6"
              disabled={!formData.name || !formData.category || formData.price === 0}
            >
              Tambah Produk
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Product Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b pb-4">
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-orange-500 to-pink-500 bg-clip-text text-transparent">
              Edit Produk
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-500">
              Perbarui informasi produk yang sudah ada
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Informasi Dasar Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <div className="w-1 h-4 bg-gradient-to-b from-orange-500 to-pink-500 rounded-full"></div>
                Informasi Dasar
              </h3>
              
              <div>
                <Label htmlFor="edit-name" className="text-sm font-medium text-gray-700">
                  Nama Produk <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Contoh: iPhone 15 Pro Max 256GB"
                  className="mt-1.5 h-11"
                />
              </div>

              <div>
                <Label htmlFor="edit-description" className="text-sm font-medium text-gray-700">
                  Deskripsi <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Jelaskan detail produk, spesifikasi, dan keunggulannya..."
                  rows={4}
                  className="mt-1.5 resize-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-category" className="text-sm font-medium text-gray-700">
                    Kategori <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger className="mt-1.5 h-11">
                      <SelectValue placeholder="Pilih kategori" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="edit-stock" className="text-sm font-medium text-gray-700">
                    Stok <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="edit-stock"
                    type="number"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })}
                    placeholder="0"
                    className="mt-1.5 h-11"
                    min="0"
                  />
                </div>
              </div>
            </div>

            {/* Harga Section */}
            <div className="space-y-4 pt-2">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <div className="w-1 h-4 bg-gradient-to-b from-orange-500 to-pink-500 rounded-full"></div>
                Informasi Harga
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="edit-price" className="text-sm font-medium text-gray-700">
                    Harga Jual <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative mt-1.5">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                      Rp
                    </span>
                    <Input
                      id="edit-price"
                      type="number"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: parseInt(e.target.value) || 0 })}
                      placeholder="0"
                      className="pl-10 h-11"
                      min="0"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="edit-originalPrice" className="text-sm font-medium text-gray-700">
                    Harga Asli
                  </Label>
                  <div className="relative mt-1.5">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                      Rp
                    </span>
                    <Input
                      id="edit-originalPrice"
                      type="number"
                      value={formData.originalPrice}
                      onChange={(e) => setFormData({ ...formData, originalPrice: parseInt(e.target.value) || 0 })}
                      placeholder="0"
                      className="pl-10 h-11"
                      min="0"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Opsional, untuk diskon</p>
                </div>

                <div>
                  <Label htmlFor="edit-discount" className="text-sm font-medium text-gray-700">
                    Diskon
                  </Label>
                  <div className="relative mt-1.5">
                    <Input
                      id="edit-discount"
                      type="number"
                      value={formData.discount}
                      onChange={(e) => setFormData({ ...formData, discount: parseInt(e.target.value) || 0 })}
                      placeholder="0"
                      className="pr-8 h-11"
                      min="0"
                      max="100"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                      %
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">0-100%</p>
                </div>
              </div>
            </div>

            {/* Gambar Section */}
            <div className="space-y-4 pt-2">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <div className="w-1 h-4 bg-gradient-to-b from-orange-500 to-pink-500 rounded-full"></div>
                Gambar Produk
              </h3>
              <ProductImageUpload
                currentImageUrl={formData.images[0]}
                onImageUploaded={(url) => setFormData({ ...formData, images: [url] })}
                onImageRemoved={() => setFormData({ ...formData, images: [] })}
              />
            </div>
          </div>

          <DialogFooter className="border-t pt-4 gap-2">
            <Button 
              variant="outline" 
              onClick={() => setIsEditOpen(false)}
              className="h-11 px-6"
            >
              Batal
            </Button>
            <Button 
              onClick={handleEdit} 
              className="bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white h-11 px-6"
              disabled={!formData.name || !formData.category || formData.price === 0}
            >
              Simpan Perubahan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Product Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Yakin ingin menghapus produk?</AlertDialogTitle>
            <AlertDialogDescription>
              Produk yang dihapus tidak dapat dikembalikan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteDialogOpen(false)}>
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (productToDelete) handleDeleteProduct(productToDelete);
                setDeleteDialogOpen(false);
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}