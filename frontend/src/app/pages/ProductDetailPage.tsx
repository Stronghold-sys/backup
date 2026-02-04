import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { Star, ShoppingCart, Share2, Truck, Shield, Package, ChevronLeft, ChevronRight, Minus, Plus, Store, MessageCircle } from 'lucide-react';
import Layout from '@/app/components/Layout/Layout';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Skeleton } from '@/app/components/ui/skeleton';
import { Product, useCartStore, useAuthStore } from '@/lib/store';
import { useProducts } from '@/lib/useProducts';
import { toast } from 'sonner';
import { ImageWithFallback } from '@/app/components/figma/ImageWithFallback';
import { useBanCheck } from '@/lib/useBanCheck';

export default function ProductDetailPage() {
  // Ban check - auto logout if banned
  useBanCheck();
  
  const { id } = useParams();
  const navigate = useNavigate();
  const { addItem } = useCartStore();
  const { isAuthenticated } = useAuthStore();
  const { products, isLoading } = useProducts(); // Use global store
  const [product, setProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);

  useEffect(() => {
    // Find product from global store
    if (!isLoading && products.length > 0 && id) {
      const foundProduct = products.find(p => p.id === id);
      if (foundProduct) {
        setProduct(foundProduct);
      } else {
        toast.error('Produk tidak ditemukan');
        navigate('/products');
      }
    }
  }, [id, products, isLoading, navigate]);

  const handleAddToCart = () => {
    if (!product) return;

    // Check if user is authenticated
    if (!isAuthenticated) {
      toast.error('Silakan login terlebih dahulu');
      navigate('/login', { state: { returnTo: `/products/${product.id}` } });
      return;
    }

    if (product.stock === 0) {
      toast.error('Produk habis');
      return;
    }

    addItem({
      productId: product.id,
      product, // ✅ Include full product data
      quantity,
      price: product.price, // ✅ FIXED: Explicitly save price for getTotalPrice fallback
    });

    toast.success('Produk berhasil ditambahkan ke keranjang');
  };

  const handleBuyNow = () => {
    if (!isAuthenticated) {
      toast.error('Silakan login terlebih dahulu');
      navigate('/login', { state: { returnTo: `/products/${product?.id}` } });
      return;
    }

    if (!product) return;

    if (product.stock === 0) {
      toast.error('Produk habis');
      return;
    }

    // Add item to cart
    addItem({
      productId: product.id,
      product, // ✅ Include full product data
      quantity,
      price: product.price, // ✅ FIXED: Explicitly save price
    });

    // Navigate directly to checkout
    toast.success('Menuju halaman checkout...');
    navigate('/checkout');
  };

  const handleShare = async () => {
    if (!product) return;

    const shareUrl = window.location.href;
    const shareText = `Lihat ${product.name} - ${formatPrice(product.price)}`;

    // Check if Web Share API is supported and available
    if (navigator.share && navigator.canShare && navigator.canShare({ url: shareUrl })) {
      try {
        await navigator.share({
          title: product.name,
          text: shareText,
          url: shareUrl,
        });
        toast.success('Berhasil dibagikan');
        return;
      } catch (error) {
        // If user cancels, don't show error
        if ((error as Error).name === 'AbortError') {
          return;
        }
        // For other errors, fallback to clipboard
        console.info('Share API failed, using clipboard fallback:', error);
      }
    }

    // Fallback: Copy to clipboard
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Link produk berhasil disalin ke clipboard!', {
        description: 'Anda dapat membagikan link ini ke teman-teman',
      });
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      // Last fallback: Show the URL in a prompt
      toast.info('Salin link berikut:', {
        description: shareUrl,
        duration: 10000,
      });
    }
  };

  const handleChat = () => {
    if (!isAuthenticated) {
      toast.error('Silakan login terlebih dahulu');
      navigate('/login');
      return;
    }

    // Navigate to chat page
    navigate('/chat');
    toast.success('Membuka chat dengan penjual...');
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex-1 bg-gray-50 py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-2 gap-8">
              <Skeleton className="w-full h-96" />
              <div className="space-y-4">
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-6 w-1/2" />
                <Skeleton className="h-20 w-full" />
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!product) {
    return null;
  }

  const discountPercentage = product.originalPrice
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;

  // ENHANCED TYPE SAFETY: Ensure all product properties are safe for rendering
  const safeDiscount = typeof discountPercentage === 'number' ? discountPercentage : 0;
  const safeBadge = typeof product.badge === 'string' ? product.badge : '';

  return (
    <Layout>
      <div className="flex-1 bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-8 bg-white rounded-lg p-6">
            {/* Images */}
            <div>
              <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden mb-4">
                <ImageWithFallback
                  src={product.images?.[selectedImage] || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&h=600&fit=crop'}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="grid grid-cols-5 gap-2">
                {(product.images || []).map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={`aspect-square rounded-lg overflow-hidden border-2 ${
                      selectedImage === index ? 'border-green-600' : 'border-transparent'
                    }`}
                  >
                    <ImageWithFallback src={image} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>

            {/* Product Info */}
            <div className="space-y-4">
              {safeBadge && (
                <Badge className="bg-red-600">{safeBadge}</Badge>
              )}
              
              <h1 className="text-2xl font-bold text-gray-900">{product.name}</h1>

              <div className="flex items-center space-x-4">
                <div className="flex items-center">
                  <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  <span className="ml-1 font-semibold">{product.rating.toFixed(1)}</span>
                </div>
                <span className="text-gray-400">|</span>
                <span className="text-gray-600">{product.reviewCount} Ulasan</span>
                <span className="text-gray-400">|</span>
                <span className="text-gray-600">Terjual {product.sold}</span>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="space-y-1">
                  {product.originalPrice && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-400 line-through">
                        {formatPrice(product.originalPrice)}
                      </span>
                      <Badge className="bg-orange-600">{safeDiscount}% OFF</Badge>
                    </div>
                  )}
                  <span className="text-3xl font-bold text-green-600 block">
                    {formatPrice(product.price)}
                  </span>
                </div>
              </div>

              <p className="text-gray-700 leading-relaxed">{product.description}</p>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Stok</span>
                  <span className="font-semibold">
                    {product.stock > 0 ? `${product.stock} pcs` : 'Habis'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Kategori</span>
                  <span className="font-semibold">{product.category}</span>
                </div>
              </div>

              {/* Quantity Selector */}
              <div className="flex items-center space-x-4">
                <span className="text-gray-700">Jumlah</span>
                <div className="flex items-center border rounded-lg">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="px-3 py-2 hover:bg-gray-100"
                    disabled={quantity <= 1}
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-16 text-center border-x py-2"
                  />
                  <button
                    onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                    className="px-3 py-2 hover:bg-gray-100"
                    disabled={quantity >= product.stock}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="flex space-x-3">
                <Button
                  onClick={handleAddToCart}
                  variant="outline"
                  size="lg"
                  className="flex-1 border-green-600 text-green-600 hover:bg-green-50"
                  disabled={product.stock === 0}
                >
                  <ShoppingCart className="w-5 h-5 mr-2" />
                  Keranjang
                </Button>
                <Button
                  onClick={handleBuyNow}
                  size="lg"
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  disabled={product.stock === 0}
                >
                  Beli Sekarang
                </Button>
              </div>

              <div className="flex space-x-2">
                <Button
                  onClick={handleShare}
                  variant="outline"
                  size="sm"
                  className="flex-1"
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Bagikan
                </Button>
                <Button
                  onClick={handleChat}
                  variant="outline"
                  size="sm"
                  className="flex-1"
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Chat
                </Button>
              </div>
            </div>
          </div>

          {/* Description Section */}
          <div className="mt-8 bg-white rounded-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Deskripsi Produk</h2>
            <div className="prose max-w-none">
              <div className="text-gray-700 leading-relaxed whitespace-pre-line">
                {product.fullDescription || product.description}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}