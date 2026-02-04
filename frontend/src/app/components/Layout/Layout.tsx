import Navbar from './Navbar';
import SyncIndicator from '@/app/components/SyncIndicator';
import MaintenanceBanner from '@/app/components/MaintenanceBanner';
import BottomNavigation from '@/app/components/BottomNavigation';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <MaintenanceBanner />
      <main className="flex-1 pb-16 md:pb-0">{children}</main>
      <BottomNavigation />
      <SyncIndicator />
    </div>
  );
}