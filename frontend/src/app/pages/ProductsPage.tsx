import { useEffect, useState, useMemo, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Filter, Grid, List, Search, SlidersHorizontal, Zap } from 'lucide-react';
import Layout from '@/app/components/Layout/Layout';
import ProductCard from '@/app/components/ProductCard';
import { Button } from '@/app/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/app/components/ui/sheet';
import { Checkbox } from '@/app/components/ui/checkbox';
import { Slider } from '@/app/components/ui/slider';
import { Label } from '@/app/components/ui/label';
import { useProducts, filterProductsWithValidImages } from '@/lib/useProducts';
import { Product } from '@/lib/store';
import { useBanCheck } from '@/lib/useBanCheck';
import { useRealTimeSync } from '@/lib/useRealTimeSync';
import { ProductGridSkeleton } from '@/app/components/skeleton/SkeletonLoader';
import { ErrorState, EmptyState, SyncIndicator } from '@/app/components/loading/LoadingStates';
import { useNetworkStatus, useSlowLoadingDetector } from '@/lib/useNetworkStatus';
import { Package } from 'lucide-react';

export default function ProductsPage() {
  // Ban check - auto logout if banned
  useBanCheck();
  
  // ✅ FIX: Real-time sync untuk products - pass number, not object
  useRealTimeSync(30000); // 30 seconds
  
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Use shared product store for real-time sync
  const { products: allProducts, isLoading: storeLoading } = useProducts();
  
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [priceRange, setPriceRange] = useState([0, 10000000]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const categories = ['Elektronik', 'Fashion', 'Makanan', 'Kesehatan', 'Rumah Tangga', 'Olahraga', 'Buku'];

  const filterProducts = useCallback(() => {
    const search = searchParams.get('search');
    const category = searchParams.get('category');
    const sort = searchParams.get('sort');
    const flashsale = searchParams.get('flashsale');

    let filtered = [...allProducts];

    // Filter flash sale products if flashsale parameter is present
    if (flashsale === 'true') {
      filtered = filtered.filter(product => product.isFlashSale === true);
    }

    if (search) {
      filtered = filtered.filter(product => product.name.toLowerCase().includes(search.toLowerCase()));
    }

    if (category) {
      filtered = filtered.filter(product => product.category === category);
    }

    if (sort) {
      switch (sort) {
        case 'relevance':
          break;
        case 'popular':
          filtered = [...filtered].sort((a, b) => (b.sold || 0) - (a.sold || 0));
          break;
        case 'newest':
          filtered = [...filtered].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          break;
        case 'price-asc':
          filtered = [...filtered].sort((a, b) => a.price - b.price);
          break;
        case 'price-desc':
          filtered = [...filtered].sort((a, b) => b.price - a.price);
          break;
        default:
          break;
      }
    }

    filtered = filtered.filter(product => product.price >= priceRange[0] && product.price <= priceRange[1]);

    if (selectedCategories.length > 0) {
      filtered = filtered.filter(product => selectedCategories.includes(product.category));
    }

    setFilteredProducts(filtered);
  }, [searchParams, allProducts, priceRange, selectedCategories]);

  // ✅ FIXED: Run filter directly when dependencies change
  useEffect(() => {
    filterProducts();
  }, [searchParams, allProducts, priceRange, selectedCategories]); // ✅ Depend on actual values, not the function

  const handleSortChange = (value: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('sort', value);
    setSearchParams(params);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const networkStatus = useNetworkStatus();
  const isSlowLoading = useSlowLoadingDetector(storeLoading);

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Flash Sale Banner (if flashsale filter is active) */}
        {searchParams.get('flashsale') === 'true' && (
          <div className="mb-6 bg-gradient-to-r from-red-50 via-orange-50 to-pink-50 rounded-xl p-6 border-2 border-red-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center shadow-lg">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                  ⚡ Flash Sale Aktif
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Dapatkan diskon hingga 50% untuk produk pilihan. Buruan, stok terbatas!
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {searchParams.get('flashsale') === 'true' ? '⚡ Produk Flash Sale' : 'Semua Produk'}
            </h1>
            {!storeLoading && (
              <p className="text-sm text-gray-500 mt-1">
                Menampilkan {filteredProducts.length} produk
              </p>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {/* View Mode */}
            <div className="hidden md:flex bg-white border rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded ${viewMode === 'grid' ? 'bg-green-100 text-green-600' : 'text-gray-600'}`}
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded ${viewMode === 'list' ? 'bg-green-100 text-green-600' : 'text-gray-600'}`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            {/* Sort */}
            <Select onValueChange={handleSortChange}>
              <SelectTrigger className="w-[180px] bg-white">
                <SelectValue placeholder="Urutkan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="relevance">Relevansi</SelectItem>
                <SelectItem value="popular">Terlaris</SelectItem>
                <SelectItem value="newest">Terbaru</SelectItem>
                <SelectItem value="price-asc">Termurah</SelectItem>
                <SelectItem value="price-desc">Termahal</SelectItem>
              </SelectContent>
            </Select>

            {/* Mobile Filter */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="md:hidden">
                  <SlidersHorizontal className="w-4 h-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left">
                <SheetHeader>
                  <SheetTitle>Filter</SheetTitle>
                </SheetHeader>
                <div className="py-4">
                  {/* Filter content */}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        <div className="flex gap-6">
          {/* Sidebar Filter - Desktop */}
          <aside className="hidden md:block w-64 space-y-6">
            <div className="bg-white rounded-lg p-4 sticky top-20">
              <h3 className="font-semibold mb-4 flex items-center">
                <Filter className="w-4 h-4 mr-2" />
                Filter
              </h3>

              {/* Category Filter */}
              <div className="mb-6">
                <Label className="font-medium mb-3 block">Kategori</Label>
                <div className="space-y-2">
                  {categories.map((category) => (
                    <label key={category} className="flex items-center space-x-2 cursor-pointer">
                      <Checkbox
                        checked={selectedCategories.includes(category)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedCategories([...selectedCategories, category]);
                          } else {
                            setSelectedCategories(selectedCategories.filter((c) => c !== category));
                          }
                        }}
                      />
                      <span className="text-sm">{category}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Price Range */}
              <div className="mb-6">
                <Label className="font-medium mb-3 block">Rentang Harga</Label>
                <Slider
                  min={0}
                  max={10000000}
                  step={100000}
                  value={priceRange}
                  onValueChange={setPriceRange}
                  className="mb-3"
                />
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>{formatPrice(priceRange[0])}</span>
                  <span>{formatPrice(priceRange[1])}</span>
                </div>
              </div>

              {/* Rating Filter */}
              <div className="mb-6">
                <Label className="font-medium mb-3 block">Rating</Label>
                <div className="space-y-2">
                  {[5, 4, 3].map((rating) => (
                    <label key={rating} className="flex items-center space-x-2 cursor-pointer">
                      <Checkbox />
                      <span className="text-sm">{rating} ⭐ ke atas</span>
                    </label>
                  ))}
                </div>
              </div>

              <Button className="w-full bg-green-600 hover:bg-green-700">
                Terapkan Filter
              </Button>
            </div>
          </aside>

          {/* Products Grid */}
          <div className="flex-1">
            {storeLoading ? (
              <div className={`grid ${viewMode === 'grid' ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4' : 'grid-cols-1'} gap-4`}>
                {Array.from({ length: 12 }).map((_, i) => (
                  <ProductGridSkeleton key={i} />
                ))}
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="bg-white rounded-lg p-12 text-center">
                <p className="text-gray-500 mb-2">Produk tidak ditemukan</p>
                <p className="text-sm text-gray-400">Coba ubah filter atau kata kunci pencarian</p>
              </div>
            ) : (
              <div className={`grid ${viewMode === 'grid' ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4' : 'grid-cols-1'} gap-4`}>
                {filteredProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}

            {/* Load More */}
            {!storeLoading && filteredProducts.length > 0 && (
              <div className="mt-8 text-center">
                <Button variant="outline" size="lg">
                  Muat Lebih Banyak
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Network Status Indicator */}
        {networkStatus === 'offline' && (
          <div className="mt-4 text-center text-red-500">
            <Package className="w-5 h-5 inline-block mr-2" />
            Anda sedang offline. Produk mungkin tidak diperbarui.
          </div>
        )}
        {isSlowLoading && (
          <div className="mt-4 text-center text-orange-500">
            <Package className="w-5 h-5 inline-block mr-2" />
            Memuat produk... (mungkin lambat karena koneksi internet)
          </div>
        )}
      </div>
    </Layout>
  );
}