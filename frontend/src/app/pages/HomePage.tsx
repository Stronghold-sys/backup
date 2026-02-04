import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router';
import { ChevronRight, Star, Truck, Shield, HeadphonesIcon, Clock, ChevronLeft, Laptop, ShoppingBag, UtensilsCrossed, Heart, Home, Dumbbell, Book, Package } from 'lucide-react';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import Layout from '@/app/components/Layout/Layout';
import ProductCard from '@/app/components/ProductCard';
import { Button } from '@/app/components/ui/button';
import { Card } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Skeleton } from '@/app/components/ui/skeleton';
import { useProducts } from '@/lib/useProducts';
import { Product } from '@/lib/store';
import Footer from '@/app/components/Footer';

export default function HomePage() {
  // Use the shared product store for real-time sync
  const { products, isLoading } = useProducts();
  
  const [flashSaleProducts, setFlashSaleProducts] = useState<Product[]>([]);
  const [popularProducts, setPopularProducts] = useState<Product[]>([]);
  const [timeLeft, setTimeLeft] = useState({ hours: 2, minutes: 30, seconds: 45 });

  // Embla Carousel for hero slider
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true }, [
    Autoplay({ delay: 4000, stopOnInteraction: false })
  ]);

  const [selectedIndex, setSelectedIndex] = useState(0);

  const scrollPrev = useCallback(() => emblaApi && emblaApi.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi && emblaApi.scrollNext(), [emblaApi]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on('select', onSelect);
    return () => { emblaApi.off('select', onSelect); };
  }, [emblaApi, onSelect]);

  // Update flash sale and popular products when products change
  useEffect(() => {
    if (products.length > 0) {
      // Flash Sale: products with discount
      const flashSale = products
        .filter((p: Product) => p.discount && p.discount > 0)
        .slice(0, 6);
      setFlashSaleProducts(flashSale);

      // Popular: products with high sold count
      const popular = [...products]
        .sort((a: Product, b: Product) => (b.sold || 0) - (a.sold || 0))
        .slice(0, 8);
      setPopularProducts(popular);
    }
  }, [products]);

  // Flash sale countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        let { hours, minutes, seconds } = prev;
        
        if (seconds > 0) {
          seconds--;
        } else if (minutes > 0) {
          minutes--;
          seconds = 59;
        } else if (hours > 0) {
          hours--;
          minutes = 59;
          seconds = 59;
        } else {
          hours = 2;
          minutes = 30;
          seconds = 45;
        }
        
        return { hours, minutes, seconds };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const heroSlides = [
    {
      title: 'Flash Sale Hari Ini!',
      subtitle: 'Diskon hingga 50% untuk produk pilihan',
      image: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800&h=600&fit=crop',
      cta: 'Belanja Sekarang',
      link: '/products?sort=popular',
      bgColor: 'from-green-600 to-emerald-600'
    },
    {
      title: 'Produk Unggulan',
      subtitle: 'Pilihan terbaik dengan kualitas premium',
      image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&h=600&fit=crop',
      cta: 'Lihat Produk',
      link: '/products',
      bgColor: 'from-blue-600 to-indigo-600'
    },
    {
      title: 'Gratis Ongkir!',
      subtitle: 'Untuk pembelian minimal Rp 50.000',
      image: 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?w=800&h=600&fit=crop',
      cta: 'Belanja Yuk',
      link: '/products',
      bgColor: 'from-purple-600 to-pink-600'
    },
    {
      title: 'Promo Spesial',
      subtitle: 'Dapatkan voucher untuk pembeli baru',
      image: 'https://images.unsplash.com/photo-1607083206869-4c7672e72a8a?w=800&h=600&fit=crop',
      cta: 'Ambil Voucher',
      link: '/products',
      bgColor: 'from-orange-600 to-red-600'
    }
  ];

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  return (
    <Layout>
      {/* Hero Banner with Autoplay Slider */}
      <section className="relative overflow-hidden">
        <div className="embla" ref={emblaRef}>
          <div className="embla__container flex">
            {heroSlides.map((slide, index) => (
              <div key={index} className="embla__slide flex-[0_0_100%] min-w-0">
                <div className={`bg-gradient-to-r ${slide.bgColor} text-white`}>
                  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
                    <div className="grid md:grid-cols-2 gap-8 items-center">
                      <div>
                        <Badge className="bg-white/20 text-white mb-4 backdrop-blur-sm">
                          {slide.title}
                        </Badge>
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">
                          {slide.subtitle}
                        </h1>
                        <p className="text-lg mb-6 text-white/90">
                          Ribuan produk berkualitas dengan harga terbaik. Belanja sekarang juga!
                        </p>
                        <div className="flex flex-wrap gap-3">
                          <Link to={slide.link}>
                            <Button size="lg" className="bg-white text-gray-900 hover:bg-gray-100">
                              {slide.cta}
                              <ChevronRight className="w-5 h-5 ml-2" />
                            </Button>
                          </Link>
                        </div>
                      </div>
                      <div className="hidden md:block">
                        <img
                          src={slide.image}
                          alt={slide.title}
                          className="rounded-xl shadow-2xl w-full h-[400px] object-cover"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Carousel Controls */}
        <button
          onClick={scrollPrev}
          className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 shadow-lg z-10 transition"
          aria-label="Previous slide"
        >
          <ChevronLeft className="w-6 h-6 text-gray-900" />
        </button>
        <button
          onClick={scrollNext}
          className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 shadow-lg z-10 transition"
          aria-label="Next slide"
        >
          <ChevronRight className="w-6 h-6 text-gray-900" />
        </button>

        {/* Carousel Dots */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
          {heroSlides.map((_, index) => (
            <button
              key={index}
              className={`w-2 h-2 rounded-full transition ${
                index === selectedIndex ? 'bg-white w-8' : 'bg-white/50'
              }`}
              onClick={() => emblaApi && emblaApi.scrollTo(index)}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="py-8 bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Truck className="w-7 h-7 text-green-600" />
              </div>
              <div>
                <p className="font-semibold text-base text-gray-900">Gratis Ongkir</p>
                <p className="text-sm text-gray-600">Min. belanja Rp 50.000</p>
              </div>
            </div>
            <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Shield className="w-7 h-7 text-green-600" />
              </div>
              <div>
                <p className="font-semibold text-base text-gray-900">100% Aman</p>
                <p className="text-sm text-gray-600">Perlindungan pembeli</p>
              </div>
            </div>
            <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <HeadphonesIcon className="w-7 h-7 text-green-600" />
              </div>
              <div>
                <p className="font-semibold text-base text-gray-900">CS 24/7</p>
                <p className="text-sm text-gray-600">Siap membantu Anda</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Flash Sale Section */}
      {flashSaleProducts.length > 0 && (
        <section className="py-12 bg-gradient-to-br from-red-50 to-orange-50 overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <h2 className="text-3xl font-bold text-gray-900">⚡ Flash Sale</h2>
                <div className="flex items-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-lg">
                  <Clock className="w-5 h-5" />
                  <span className="font-mono font-semibold">
                    {String(timeLeft.hours).padStart(2, '0')}:
                    {String(timeLeft.minutes).padStart(2, '0')}:
                    {String(timeLeft.seconds).padStart(2, '0')}
                  </span>
                </div>
              </div>
              <Link to="/products?sort=price-asc">
                <Button variant="outline">
                  Lihat Semua
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="p-4">
                    <Skeleton className="w-full h-40 mb-3" />
                    <Skeleton className="w-full h-4 mb-2" />
                    <Skeleton className="w-2/3 h-4" />
                  </Card>
                ))}
              </div>
            ) : (
              <div className="relative">
                {/* ✨ Infinite Scroll Container with CSS Mask Fade */}
                <div className="flash-sale-scroll-container overflow-hidden py-2">
                  <div className="flash-sale-scroll-track flex gap-4 animate-infinite-scroll hover:pause-animation">
                    {/* Render products 3 times for seamless infinite loop */}
                    {[...Array(3)].map((_, setIndex) => (
                      flashSaleProducts.map((product) => (
                        <div 
                          key={`flash-${setIndex}-${product.id}`} 
                          className="flex-shrink-0 w-[160px] sm:w-[180px] md:w-[200px] lg:w-[220px]"
                        >
                          <ProductCard product={product} />
                        </div>
                      ))
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Categories Section */}
      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold mb-8 text-gray-900">Kategori Pilihan</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            {[
              { name: 'Elektronik', icon: Laptop },
              { name: 'Fashion', icon: ShoppingBag },
              { name: 'Makanan', icon: UtensilsCrossed },
              { name: 'Kesehatan', icon: Heart },
              { name: 'Rumah Tangga', icon: Home },
              { name: 'Olahraga', icon: Dumbbell },
              { name: 'Buku', icon: Book }
            ].map((category) => {
              const IconComponent = category.icon;
              return (
                <Link key={category.name} to={`/products?category=${category.name}`}>
                  <Card className="p-6 text-center hover:shadow-lg transition cursor-pointer group">
                    <div className="w-16 h-16 mx-auto mb-3 bg-green-100 rounded-full flex items-center justify-center group-hover:bg-green-200 transition">
                      <IconComponent className="w-8 h-8 text-green-600" />
                    </div>
                    <h3 className="font-semibold text-sm">{category.name}</h3>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Popular Products */}
      {popularProducts.length > 0 && (
        <section className="py-12 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-bold text-gray-900">🔥 Produk Terlaris</h2>
              <Link to="/products?sort=popular">
                <Button variant="outline">
                  Lihat Semua
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {[...Array(8)].map((_, i) => (
                  <Card key={i} className="p-4">
                    <Skeleton className="w-full h-48 mb-4" />
                    <Skeleton className="w-full h-4 mb-2" />
                    <Skeleton className="w-2/3 h-4 mb-2" />
                    <Skeleton className="w-1/2 h-6" />
                  </Card>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {popularProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Recommended Products */}
      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold text-gray-900">Rekomendasi Untuk Anda</h2>
            <Link to="/products">
              <Button variant="outline">
                Lihat Semua
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
              {[...Array(12)].map((_, i) => (
                <Card key={i} className="p-4">
                  <Skeleton className="w-full h-48 mb-4" />
                  <Skeleton className="w-full h-4 mb-2" />
                  <Skeleton className="w-2/3 h-4 mb-2" />
                  <Skeleton className="w-1/2 h-6" />
                </Card>
              ))}
            </div>
          ) : products.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Package className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500 text-lg">Produk sedang disiapkan...</p>
              <p className="text-gray-400 text-sm mt-2">Silakan cek kembali nanti</p>
            </div>
          )}
        </div>
      </section>
      <Footer />
    </Layout>
  );
}