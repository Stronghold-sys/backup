import { Link, useNavigate } from 'react-router';
import { Star, ShoppingCart } from 'lucide-react';
import { Card } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Product, useCartStore, useAuthStore } from '@/lib/store';
import { toast } from 'sonner';
import { ImageWithFallback } from '@/app/components/figma/ImageWithFallback';

interface ProductCardProps {
  product: Product;
  compact?: boolean;
}

export default function ProductCard({ product, compact = false }: ProductCardProps) {
  const { addItem } = useCartStore();
  const { isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

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
      product,
      quantity: 1,
    });

    toast.success('Ditambahkan ke keranjang');
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  // Use product.discount if available, otherwise calculate from originalPrice
  const discountPercentage = product.discount 
    ? product.discount 
    : (product.originalPrice 
        ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
        : 0);

  // Ensure all product properties are safe for rendering
  const safeDiscount = typeof discountPercentage === 'number' ? discountPercentage : 0;
  const safeBadge = typeof product.badge === 'string' ? product.badge : '';
  const safeCompact = Boolean(compact);

  return (
    <Link to={`/products/${product.id}`}>
      <Card className={safeCompact ? 'overflow-hidden hover:shadow-lg transition group cursor-pointer h-auto' : 'overflow-hidden hover:shadow-lg transition group cursor-pointer h-full'}>
        {/* Image */}
        <div className={safeCompact ? 'relative h-32 overflow-hidden bg-gray-100' : 'relative h-48 overflow-hidden bg-gray-100'}>
          <ImageWithFallback
            src={product.images?.[0] || product.image || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=300&fit=crop'}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-110 transition duration-300"
          />
          {safeBadge && (
            <Badge className="absolute top-2 left-2 bg-red-600 text-white">
              {safeBadge}
            </Badge>
          )}
          {safeDiscount > 0 && (
            <Badge className="absolute top-2 right-2 bg-orange-600 text-white">
              -{safeDiscount}%
            </Badge>
          )}
          {product.stock === 0 && (
            <div className="absolute inset-0 bg-gray-900/70 backdrop-blur-sm flex items-center justify-center"> {/* Changed from bg-black/50 */}
              <span className="text-white font-semibold">Stok Habis</span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className={compact ? 'p-2 space-y-1' : 'p-4 space-y-2'}>
          <h3 className={compact ? 'font-medium text-xs line-clamp-2 text-gray-900 group-hover:text-green-600 transition' : 'font-medium text-sm line-clamp-2 text-gray-900 group-hover:text-green-600 transition'}>
            {product.name}
          </h3>

          {/* Rating */}
          {!compact && (
            <div className="flex items-center space-x-1">
              <div className="flex items-center">
                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                <span className="text-xs ml-1">{product.rating.toFixed(1)}</span>
              </div>
              <span className="text-xs text-gray-400">|</span>
              <span className="text-xs text-gray-500">Terjual {product.sold}</span>
            </div>
          )}

          {/* Price */}
          <div className="flex items-end justify-between gap-2 min-h-[48px]">
            <div className="flex flex-col justify-end">
              {product.originalPrice && (
                <p className={`${compact ? 'text-xs' : 'text-sm'} text-gray-400 line-through mb-0.5`}>
                  {formatPrice(product.originalPrice)}
                </p>
              )}
              <p className={`${compact ? 'text-sm' : 'text-lg'} font-bold text-green-600`}>
                {formatPrice(product.price)}
              </p>
            </div>
            {!compact && (
              <Button
                size="sm"
                variant="outline"
                className="h-8 w-8 p-0 flex-shrink-0"
                onClick={handleAddToCart}
                disabled={product.stock === 0}
              >
                <ShoppingCart className="w-4 h-4" />
              </Button>
            )}
          </div>

          {/* Stock Info */}
          {!compact && product.stock > 0 && product.stock <= 10 && (
            <p className="text-xs text-orange-600">Tersisa {product.stock} pcs</p>
          )}
        </div>
      </Card>
    </Link>
  );
}