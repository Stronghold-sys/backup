import { Link, useNavigate } from 'react-router';
import { useAuthStore, useCartStore } from '@/lib/store';
import { useChatStore } from '@/lib/chatStore';
import { useNotificationStore } from '@/lib/notificationStore';
import { Button } from '@/app/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import { Input } from '@/app/components/ui/input';
import { Badge } from '@/app/components/ui/badge';
import { Search, ShoppingCart, User, Package, LogOut, Settings, Menu, MessageCircle, Bell, Store } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from '@/app/components/ui/sheet';
import NotificationBell from '@/app/components/NotificationBell';
import MaintenanceBanner from '@/app/components/MaintenanceBanner';
import { toast } from 'sonner';
import logger from '@/lib/logger';

export default function Navbar() {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuthStore();
  const { getTotalItems } = useCartStore();
  const { getUnreadCount } = useChatStore();
  const { getUnreadNotifications } = useNotificationStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // ✅ DEBUG: Log every render to see if Navbar re-renders with new data
  useEffect(() => {
    logger.debug('[Navbar] RENDER:', {
      isAuthenticated,
      hasUser: !!user,
      userEmail: user?.email,
      userRole: user?.role,
      timestamp: new Date().toISOString()
    });
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery)}`);
      setMobileMenuOpen(false);
    }
  };

  const handleLogout = async () => {
    logger.debug('[Navbar] Logout clicked');
    // ✅ FIX v16.0: Await logout to ensure session is cleared
    await logout();
    toast.success('Berhasil keluar!');
    setMobileMenuOpen(false);
    
    logger.debug('[Navbar] Navigating to /login');
    // ✅ FIX v16.0: Use React Router navigate (no reload)
    navigate('/login', { replace: true });
  };

  const cartItemCount = getTotalItems();
  const unreadChatCount = user ? getUnreadCount(user.id) : 0;
  const unreadNotificationCount = user ? getUnreadNotifications(user.id) : 0;

  logger.debug('[Navbar] State check:', {
    isAuthenticated,
    hasUser: !!user,
    userEmail: user?.email || 'NONE',
    cartItems: cartItemCount
  });

  return (
    <>
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-2 flex-shrink-0">
              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-orange-500 to-pink-500 rounded-lg flex items-center justify-center shadow-md">
                <Store className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <span className="text-base sm:text-xl font-bold bg-gradient-to-r from-orange-600 to-pink-600 bg-clip-text text-transparent hidden xs:block">
                TokoKita
              </span>
            </Link>

            {/* Desktop Search Bar */}
            <form onSubmit={handleSearch} className="hidden lg:flex flex-1 max-w-2xl mx-4 xl:mx-8">
              <div className="relative w-full">
                <Input
                  type="text"
                  placeholder="Cari produk, merek, atau kategori..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border-2 border-gray-300 rounded-lg focus:border-orange-500 focus:ring-0"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              </div>
              <Button type="submit" className="ml-2 bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white">
                Cari
              </Button>
            </form>

            {/* Right Side Icons */}
            <div className="flex items-center space-x-2 sm:space-x-3">
              {/* Chat Icon - Only for authenticated users */}
              {isAuthenticated && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative hidden sm:flex"
                  onClick={() => navigate('/chat')}
                >
                  <MessageCircle className="w-5 h-5" />
                  {unreadChatCount > 0 && (
                    <Badge className="absolute -top-1 -right-1 px-1.5 py-0.5 text-xs bg-red-500 min-w-[1.25rem] h-5 flex items-center justify-center">
                      {unreadChatCount > 99 ? '99+' : unreadChatCount}
                    </Badge>
                  )}
                </Button>
              )}

              {/* Notifications - Only for authenticated users */}
              {isAuthenticated && <NotificationBell />}

              {/* Cart */}
              <Link to="/cart">
                <Button variant="ghost" size="icon" className="relative">
                  <ShoppingCart className="w-5 h-5" />
                  {cartItemCount > 0 && (
                    <Badge className="absolute -top-1 -right-1 px-1.5 py-0.5 text-xs bg-gradient-to-r from-orange-500 to-pink-500 min-w-[1.25rem] h-5 flex items-center justify-center">
                      {cartItemCount > 99 ? '99+' : cartItemCount}
                    </Badge>
                  )}
                </Button>
              </Link>

              {/* User Menu - Desktop */}
              {isAuthenticated ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="hidden sm:flex">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-pink-400 flex items-center justify-center shadow-md">
                        <span className="text-white text-sm font-semibold">
                          {user?.name?.charAt(0).toUpperCase() || 'U'}
                        </span>
                      </div>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <div className="px-2 py-1.5">
                      <p className="text-sm font-medium truncate">{user?.name}</p>
                      <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate('/profile')}>
                      <User className="w-4 h-4 mr-2" />
                      Profil Saya
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/orders')}>
                      <Package className="w-4 h-4 mr-2" />
                      Pesanan Saya
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/chat')}>
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Pesan
                      {unreadChatCount > 0 && (
                        <Badge className="ml-auto bg-red-500 text-white px-1.5 py-0.5 text-xs">
                          {unreadChatCount}
                        </Badge>
                      )}
                    </DropdownMenuItem>
                    {user?.role === 'admin' && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => navigate('/admin')}>
                          <Settings className="w-4 h-4 mr-2" />
                          Admin Panel
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                      <LogOut className="w-4 h-4 mr-2" />
                      Keluar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <div className="hidden sm:flex items-center space-x-2">
                  <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>
                    Masuk
                  </Button>
                  <Button size="sm" onClick={() => navigate('/register')} className="bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white">
                    Daftar
                  </Button>
                </div>
              )}

              {/* Mobile Menu */}
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="sm:hidden">
                    <Menu className="w-5 h-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[300px] sm:hidden">
                  <SheetHeader>
                    <SheetTitle>Menu</SheetTitle>
                    <SheetDescription>
                      {isAuthenticated ? `Selamat datang, ${user?.name}!` : 'Akses cepat ke menu'}
                    </SheetDescription>
                  </SheetHeader>
                  <div className="mt-6 space-y-4">
                    {/* Mobile Search */}
                    <form onSubmit={handleSearch}>
                      <div className="relative">
                        <Input
                          type="text"
                          placeholder="Cari produk..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pl-10 pr-4 py-2"
                        />
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      </div>
                    </form>

                    {isAuthenticated ? (
                      <>
                        <Button
                          variant="ghost"
                          className="w-full justify-start"
                          onClick={() => {
                            navigate('/profile');
                            setMobileMenuOpen(false);
                          }}
                        >
                          <User className="w-5 h-5 mr-2" />
                          Profil Saya
                        </Button>
                        <Button
                          variant="ghost"
                          className="w-full justify-start"
                          onClick={() => {
                            navigate('/orders');
                            setMobileMenuOpen(false);
                          }}
                        >
                          <Package className="w-5 h-5 mr-2" />
                          Pesanan Saya
                        </Button>
                        <Button
                          variant="ghost"
                          className="w-full justify-start relative"
                          onClick={() => {
                            navigate('/chat');
                            setMobileMenuOpen(false);
                          }}
                        >
                          <MessageCircle className="w-5 h-5 mr-2" />
                          Pesan
                          {unreadChatCount > 0 && (
                            <Badge className="ml-auto bg-red-500 text-white">
                              {unreadChatCount}
                            </Badge>
                          )}
                        </Button>
                        {user?.role === 'admin' && (
                          <>
                            <div className="border-t my-2" />
                            <Button
                              variant="ghost"
                              className="w-full justify-start"
                              onClick={() => {
                                navigate('/admin');
                                setMobileMenuOpen(false);
                              }}
                            >
                              <Settings className="w-5 h-5 mr-2" />
                              Admin Panel
                            </Button>
                          </>
                        )}
                        <div className="border-t my-2" />
                        <Button
                          variant="ghost"
                          className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={handleLogout}
                        >
                          <LogOut className="w-5 h-5 mr-2" />
                          Keluar
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          className="w-full"
                          variant="outline"
                          onClick={() => {
                            navigate('/login');
                            setMobileMenuOpen(false);
                          }}
                        >
                          Masuk
                        </Button>
                        <Button
                          className="w-full bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white"
                          onClick={() => {
                            navigate('/register');
                            setMobileMenuOpen(false);
                          }}
                        >
                          Daftar
                        </Button>
                      </>
                    )}
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>

          {/* Mobile Search Bar - Below main header on mobile */}
          <form onSubmit={handleSearch} className="lg:hidden pb-3 pt-2">
            <div className="relative">
              <Input
                type="text"
                placeholder="Cari produk, merek, atau kategori..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border-2 border-gray-300 rounded-lg"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            </div>
          </form>
        </div>
      </nav>
      
      {/* ✅ Maintenance Banner - Shows above all content when maintenance is active */}
      <MaintenanceBanner />
    </>
  );
}