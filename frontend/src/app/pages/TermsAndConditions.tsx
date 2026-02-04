import Navbar from '@/app/components/Navbar';
import Footer from '@/app/components/Footer';
import { FileText } from 'lucide-react';
import { useSettingsStore } from '@/lib/store';
import { useEffect } from 'react';
import { projectId, publicAnonKey } from '/utils/supabase'; // ✅ FIXED: Use correct path

export default function TermsAndConditions() {
  const { settings, setSettings } = useSettingsStore();

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-adb995ba/settings`,
          {
            headers: {
              Authorization: `Bearer ${publicAnonKey}`,
            },
          }
        );
        const data = await response.json();
        if (data.success && data.settings) {
          setSettings(data.settings);
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
      }
    };

    if (!settings) {
      fetchSettings();
    }
  }, [settings, setSettings]);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      
      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-pink-600 rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Syarat dan Ketentuan</h1>
              <p className="text-sm text-gray-600">Terakhir diperbarui: Januari 2025</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow-sm p-8 prose prose-sm max-w-none">
          <div className="space-y-6 text-gray-700 whitespace-pre-wrap">
            {settings?.termsAndConditions || 'Memuat syarat dan ketentuan...'}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}