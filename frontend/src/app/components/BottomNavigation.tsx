import { useLocation, useNavigate } from 'react-router';
import { Home, ShoppingCart, Package, User, MessageCircle } from 'lucide-react';
import { useAuthStore, useCartStore } from '@/lib/store';
import { useChatStore } from '@/lib/chatStore';
import { Badge } from '@/app/components/ui/badge';
import { cn } from '@/lib/utils';

/**
 * ================================================================
 * BOTTOM NAVIGATION COMPONENT
 * ================================================================
 * 
 * Mobile bottom navigation bar.
 * Hanya muncul di mobile (< md breakpoint).
 */

interface NavItem {
  label: string;
  icon: any;
  path: string;
  authRequired?: boolean;
  showBadge?: () => number;
  roles?: string[];
}

export default function BottomNavigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuthStore();
  const { getTotalItems } = useCartStore();
  const { getUnreadCount } = useChatStore();

  const navItems: NavItem[] = [
    {
      label: 'Home',
      icon: Home,
      path: '/',
    },
    {
      label: 'Produk',
      icon: ShoppingCart,
      path: '/products',
    },
    {
      label: 'Cart',
      icon: ShoppingCart,
      path: '/cart',
      showBadge: getTotalItems,
    },
    {
      label: 'Chat',
      icon: MessageCircle,
      path: '/chat',
      authRequired: true,
      showBadge: () => (user ? getUnreadCount(user.id) : 0),
    },
    {
      label: 'Pesanan',
      icon: Package,
      path: '/orders',
      authRequired: true,
    },
    {
      label: 'Profil',
      icon: User,
      path: isAuthenticated ? '/profile' : '/login',
    },
  ];

  const handleNavClick = (item: NavItem) => {
    // If auth required and not authenticated, go to login
    if (item.authRequired && !isAuthenticated) {
      navigate('/login', { state: { from: item.path } });
      return;
    }

    navigate(item.path);
  };

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 md:hidden">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          const badgeCount = item.showBadge ? item.showBadge() : 0;

          return (
            <button
              key={item.path}
              onClick={() => handleNavClick(item)}
              className={cn(
                'flex flex-col items-center justify-center flex-1 h-full relative transition-colors',
                active
                  ? 'text-orange-600'
                  : 'text-gray-600 hover:text-gray-900'
              )}
              aria-label={item.label}
            >
              <div className="relative">
                <Icon className="w-6 h-6" strokeWidth={active ? 2.5 : 2} />
                
                {badgeCount > 0 && (
                  <Badge
                    className="absolute -top-2 -right-2 px-1.5 py-0.5 text-xs bg-red-500 min-w-[1.25rem] h-5 flex items-center justify-center"
                  >
                    {badgeCount > 99 ? '99+' : badgeCount}
                  </Badge>
                )}
              </div>
              
              <span
                className={cn(
                  'text-xs mt-1 font-medium',
                  active ? 'text-orange-600' : 'text-gray-600'
                )}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
