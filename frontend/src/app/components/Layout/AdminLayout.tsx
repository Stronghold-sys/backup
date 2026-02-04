import { Link, useNavigate, useLocation } from 'react-router';
import { useState } from 'react';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Users, 
  LogOut, 
  RefreshCw,
  FolderTree,
  MessageSquare,
  Ticket,
  FileText,
  Settings,
  UserCircle,
  Trash2,
  Zap,
  Menu,
  X
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { useAuthStore } from '@/lib/store';
import { useChatStore } from '@/lib/chatStore';
import { useNotificationStore } from '@/lib/notificationStore';
import { useEffect, useMemo } from 'react';
import { Badge } from '@/app/components/ui/badge';
import SyncIndicator from '@/app/components/SyncIndicator';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/app/components/ui/sheet';
import { toast } from 'sonner';
import logger from '@/lib/logger';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { conversations } = useChatStore();
  const { notifications } = useNotificationStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Calculate total unread chat count with memoization
  const totalChatUnread = useMemo(() => 
    (conversations || []).reduce((total, conv) => total + conv.unreadCount, 0),
    [conversations]
  );

  // Calculate total unread notifications with memoization
  const totalNotificationsUnread = useMemo(() => 
    (notifications || []).reduce((total, notif) => total + (notif.read ? 0 : 1), 0),
    [notifications]
  );

  // Memoize menu items to prevent re-creation on every render
  const menuItems = useMemo(() => [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/admin', badge: null },
    { icon: ShoppingCart, label: 'Pesanan', path: '/admin/orders', badge: null },
    { icon: Package, label: 'Produk', path: '/admin/products', badge: null },
    { icon: Zap, label: 'Flash Sale', path: '/admin/flash-sale', badge: null },
    { icon: FolderTree, label: 'Kategori', path: '/admin/categories', badge: null },
    { icon: Users, label: 'Pengguna', path: '/admin/users', badge: null },
    { icon: RefreshCw, label: 'Refund & Pengembalian', path: '/admin/refunds', badge: null },
    { icon: MessageSquare, label: 'Chat Support', path: '/admin/chat', badge: totalChatUnread },
    { icon: Ticket, label: 'Voucher & Promo', path: '/admin/vouchers', badge: null },
    { icon: FileText, label: 'Laporan', path: '/admin/reports', badge: null },
    { icon: Settings, label: 'Pengaturan', path: '/admin/settings', badge: null },
    { icon: UserCircle, label: 'Profil Admin', path: '/admin/profile', badge: null },
    { icon: Trash2, label: 'Reset Data', path: '/admin/reset-data', badge: null },
  ], [totalChatUnread]);

  // Force body to be locked
  useEffect(() => {
    // Lock body completely
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    document.body.style.height = '100vh';
    
    // Create a MutationObserver to prevent Radix from changing body styles
    const observer = new MutationObserver(() => {
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.height = '100vh';
      document.body.style.paddingRight = '0';
    });
    
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['style'],
    });
    
    return () => {
      observer.disconnect();
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.height = '';
    };
  }, []);

  const handleLogout = () => {
    logout();
    toast.success('Berhasil keluar!');
    setMobileMenuOpen(false);
    // ✅ FIX: Use React Router navigate instead of window.location.href
    navigate('/login', { replace: true });
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    setMobileMenuOpen(false);
  };

  // Don't render until auth check is complete
  if (!user) {
    logger.debug('[AdminLayout] Waiting for auth check to complete...');
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Memverifikasi akses...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-[#1a2332] border-b border-gray-700 h-14 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-pink-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">T</span>
          </div>
          <div>
            <h2 className="text-white font-bold text-sm">TokoKita</h2>
            <p className="text-[10px] text-gray-400">Admin Panel</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileMenuOpen(true)}
          className="text-white"
        >
          <Menu className="w-5 h-5" />
        </Button>
      </div>

      {/* Mobile Menu Drawer */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="w-[280px] bg-[#1a2332] border-gray-700 p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Menu Admin</SheetTitle>
            <SheetDescription>Navigasi admin panel</SheetDescription>
          </SheetHeader>
          
          {/* User Info Header */}
          <div style={{ padding: '1.5rem', borderBottom: '1px solid #374151' }}>
            <div className="flex items-center gap-3 mb-3">
              {user?.avatar ? (
                <img 
                  src={user.avatar} 
                  alt={user.name || 'Admin'} 
                  className="w-12 h-12 rounded-lg object-cover border-2 border-orange-500"
                />
              ) : (
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-pink-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-xl">T</span>
                </div>
              )}
              <div>
                <p className="text-white font-semibold text-sm">{user?.name || 'SuperAdmin'}</p>
                <p className="text-gray-400 text-xs">{user?.email}</p>
              </div>
            </div>
            <span className="text-xs px-2 py-1 bg-orange-500/20 text-orange-400 rounded-full">
              {user?.role === 'admin' ? 'Super Admin' : 'Admin'}
            </span>
          </div>

          {/* Menu Items */}
          <div className="overflow-y-auto h-[calc(100vh-220px)] p-4">
            <nav className="flex flex-col gap-1">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                
                return (
                  <button
                    key={item.path}
                    onClick={() => handleNavigate(item.path)}
                    className={`flex items-center justify-between px-4 py-3 rounded-lg transition-all text-left w-full ${
                      isActive
                        ? 'bg-gradient-to-r from-orange-500 to-pink-600 text-white shadow-md'
                        : 'text-gray-300 hover:bg-[#253142]'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <Icon className="w-5 h-5" />
                      <span className="font-medium text-sm">{item.label}</span>
                    </div>
                    {item.badge && item.badge > 0 && (
                      <Badge className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                        {typeof item.badge === 'number' ? item.badge : String(item.badge)}
                      </Badge>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Logout Button */}
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-700 bg-[#1a2332]">
            <Button
              variant="outline"
              size="sm"
              className="w-full bg-transparent text-red-400 border-red-400/30 hover:bg-red-500/10 hover:text-red-300 hover:border-red-400"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Keluar
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Desktop Fixed Sidebar - Hidden on mobile */}
      <aside className="hidden lg:flex admin-sidebar-fixed bg-[#1a2332] text-white flex-col">
        {/* Header */}
        <div style={{ padding: '1.5rem', flexShrink: 0, borderBottom: '1px solid #374151' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {user?.avatar ? (
              <img 
                src={user.avatar} 
                alt={user.name || 'Admin'} 
                className="w-10 h-10 rounded-lg object-cover border-2 border-green-500 shadow-lg"
              />
            ) : (
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-xl">M</span>
              </div>
            )}
            <div>
              <h2 style={{ fontWeight: 'bold', fontSize: '1.125rem', margin: 0, color: 'white' }}>MarketHub</h2>
              <p style={{ fontSize: '0.75rem', color: '#9ca3af', margin: 0 }}>Admin Panel</p>
            </div>
          </div>
        </div>

        {/* Navigation Menu - Scrollable */}
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '1rem' }}>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center justify-between px-4 py-3 rounded-lg transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-md'
                      : 'text-gray-300 hover:bg-[#253142]'
                  }`}
                  style={{ textDecoration: 'none' }}
                >
                  <div className="flex items-center space-x-3">
                    <Icon className="w-5 h-5" />
                    <span className="font-medium text-sm">{item.label}</span>
                  </div>
                  {item.badge && item.badge > 0 && (
                    <Badge className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                      {typeof item.badge === 'number' ? item.badge : String(item.badge)}
                    </Badge>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer - User Info */}
        <div style={{ padding: '1.5rem', borderTop: '1px solid #374151', flexShrink: 0 }}>
          <div className="mb-3">
            <p className="text-xs text-gray-400 mb-1">Login sebagai</p>
            <p className="font-semibold text-white">{user?.name || 'SuperAdmin'}</p>
            <p className="text-xs text-gray-400 break-all">{user?.email || 'utskelompok03@gmail.com'}</p>
            <div className="mt-2">
              <span className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded-full">
                {user?.role === 'admin' ? 'Super Admin' : 'Admin'}
              </span>
            </div>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            className="w-full bg-transparent text-red-400 border-red-400/30 hover:bg-red-500/10 hover:text-red-300 hover:border-red-400"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Keluar
          </Button>
        </div>
      </aside>

      {/* Main Content - Only this scrolls */}
      <main className="admin-main-scrollable bg-gray-50">
        <div style={{ 
          padding: 'clamp(1rem, 5vw, 2rem)', /* Responsive padding */
          minHeight: '100%',
          display: 'flex',
          flexDirection: 'column',
        }}>
          <div style={{ flex: 1 }}>
            {children}
          </div>
        </div>
      </main>
      
      {/* Sync Indicator */}
      <SyncIndicator />
    </>
  );
}