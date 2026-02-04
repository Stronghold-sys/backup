import { useNavigate } from 'react-router';
import { useState, useEffect } from 'react';
import { useAuthStore } from '@/lib/store';
import { toast } from 'sonner';
import AdminLayout from '@/app/components/Layout/AdminLayout';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Card } from '@/app/components/ui/card';
import { UserCircle, Lock, Save, Camera, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { projectId, publicAnonKey } from '/utils/supabase'; // ✅ FIXED: Use correct path

export default function AdminProfile() {
  const navigate = useNavigate();
  const { user, accessToken, setUser, logout } = useAuthStore();
  const [profileData, setProfileData] = useState({
    name: 'Admin', // Changed from 'SuperAdmin' to 'Admin'
    email: 'utskelompok03@gmail.com',
    phone: '+62 812-3456-7890',
    avatar: ''
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [uploading, setUploading] = useState(false);
  const [showAuthWarning, setShowAuthWarning] = useState(false);

  // Debug: Log authentication state on component mount
  useEffect(() => {
    const authState = {
      hasUser: !!user,
      hasAccessToken: !!accessToken,
      userId: user?.id,
      userEmail: user?.email,
      userRole: user?.role,
      tokenPrefix: accessToken?.substring(0, 20) + '...'
    };
    
    console.info('🔍 Admin Profile - Auth State:', authState);
    
    // ❌ REMOVED: Debug localStorage access - no longer needed in production mode
    // Auth data is now in Zustand store (in-memory)
    console.info('📦 Auth user from store:', user);
    
    // Parse and log the actual data
    if (user) {
      try {
        console.info('📦 User data:', {
          id: user.id,
          email: user.email,
          role: user.role,
        });
      } catch (e) {
        console.error('Failed to parse auth storage:', e);
      }
    }
    
    // Show warning if no access token
    if (!accessToken || !user) {
      setShowAuthWarning(true);
    }
  }, [accessToken, user]);

  const handleReLogin = () => {
    logout();
    navigate('/login');
    toast.info('Silakan login kembali untuk melanjutkan');
  };

  const handleSaveProfile = () => {
    toast.success('Profil berhasil diperbarui');
  };

  const handleChangePassword = () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Password baru tidak cocok');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('Password minimal 6 karakter');
      return;
    }

    toast.success('Password berhasil diubah');
    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
  };

  const handlePhotoClick = () => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/jpeg,image/jpg,image/png,image/webp';
    fileInput.onchange = (e: any) => handlePhotoUpload(e);
    fileInput.click();
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check if user is logged in
    if (!accessToken || !user) {
      toast.error('Sesi Anda telah berakhir. Silakan login kembali.');
      console.error('❌ No access token or user found');
      return;
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Format file tidak didukung. Gunakan JPEG, PNG, atau WebP');
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('Ukuran file melebihi 5MB');
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('photo', file);

      console.info('📤 Uploading photo to backend...', {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        accessToken: accessToken?.substring(0, 20) + '...',
        accessTokenFull: accessToken,  // Log full token untuk debug
        userId: user?.id,
        userEmail: user?.email,
        userRole: user?.role,
      });

      // Validate accessToken exists
      if (!accessToken) {
        console.error('❌ No accessToken found in store!');
        toast.error('Sesi Anda telah berakhir. Silakan login kembali.');
        return;
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-adb995ba/profile/upload-photo`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
          body: formData,
        }
      );

      console.info('📥 Response status:', response.status, response.statusText);

      let data;
      try {
        const responseText = await response.text();
        console.info('📥 Response text:', responseText);
        data = JSON.parse(responseText);
        console.info('📥 Parsed response:', data);
      } catch (parseError) {
        console.error('❌ JSON parse error:', parseError);
        throw new Error('Invalid response from server');
      }

      if (!response.ok || !data.success) {
        console.error('❌ Upload failed:', {
          status: response.status,
          success: data.success,
          error: data.error,
        });
        throw new Error(data.error || 'Failed to upload photo');
      }

      console.info('✅ Upload successful:', data.photoUrl);

      // Update local state
      setProfileData(prev => ({ ...prev, avatar: data.photoUrl }));
      
      // Update user in store
      if (user) {
        setUser({ ...user, avatar: data.photoUrl }, accessToken!); // ✅ FIXED: Include accessToken
      }

      toast.success('Foto profil berhasil diupload');
    } catch (error: any) {
      console.error('❌ Upload error:', error);
      toast.error(error.message || 'Gagal upload foto profil');
    } finally {
      setUploading(false);
    }
  };

  return (
    <AdminLayout>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ flexShrink: 0, marginBottom: '1.5rem' }}>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <UserCircle className="w-7 h-7 text-green-600" />
              Profil Admin
            </h1>
            <p className="text-sm text-gray-600 mt-1">Kelola informasi akun admin Anda</p>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <div className="space-y-6 pb-6">
            {/* Auth Warning Banner */}
            {showAuthWarning && (
              <Card className="p-4 bg-yellow-50 border-yellow-200">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-yellow-900 mb-1">
                      Sesi Authentication Tidak Valid
                    </h4>
                    <p className="text-sm text-yellow-800 mb-3">
                      Anda perlu login ulang untuk dapat mengupload foto profil dan menggunakan fitur yang memerlukan authentication.
                    </p>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        onClick={handleReLogin}
                        className="bg-yellow-600 hover:bg-yellow-700"
                      >
                        <RefreshCw className="w-3 h-3 mr-2" />
                        Login Ulang Sekarang
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => setShowAuthWarning(false)}
                        className="border-yellow-300 text-yellow-700 hover:bg-yellow-100"
                      >
                        Tutup
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Profile Info */}
              <Card className="p-6">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                  <UserCircle className="w-5 h-5" />
                  Informasi Profil
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-center mb-6">
                    <div className="relative">
                      {profileData.avatar ? (
                        <img 
                          src={profileData.avatar} 
                          alt={profileData.name}
                          className="w-24 h-24 rounded-full object-cover border-4 border-green-500"
                        />
                      ) : (
                        <div className="w-24 h-24 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center text-white text-3xl font-bold">
                          {profileData.name.charAt(0)}
                        </div>
                      )}
                      <Button 
                        size="sm" 
                        className="absolute bottom-0 right-0 rounded-full w-8 h-8 p-0 bg-green-600 hover:bg-green-700"
                        onClick={handlePhotoClick}
                        disabled={uploading}
                      >
                        {uploading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Camera className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="name">Nama Lengkap</Label>
                    <Input
                      id="name"
                      value={profileData.name}
                      onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={profileData.email}
                      onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="phone">Nomor Telepon</Label>
                    <Input
                      id="phone"
                      value={profileData.phone}
                      onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label>Role</Label>
                    <div className="mt-2">
                      <span className="inline-block px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-semibold">
                        Super Admin
                      </span>
                    </div>
                  </div>

                  <Button onClick={handleSaveProfile} className="w-full bg-green-600 hover:bg-green-700">
                    <Save className="w-4 h-4 mr-2" />
                    Simpan Perubahan
                  </Button>
                </div>
              </Card>

              {/* Change Password */}
              <Card className="p-6">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                  <Lock className="w-5 h-5" />
                  Ubah Password
                </h3>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="currentPassword">Password Saat Ini</Label>
                    <Input
                      id="currentPassword"
                      type="password"
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                      placeholder="••••••••"
                    />
                  </div>

                  <div>
                    <Label htmlFor="newPassword">Password Baru</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                      placeholder="••••••••"
                    />
                  </div>

                  <div>
                    <Label htmlFor="confirmPassword">Konfirmasi Password Baru</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                      placeholder="••••••••"
                    />
                  </div>

                  <Button onClick={handleChangePassword} className="w-full bg-blue-600 hover:bg-blue-700">
                    <Lock className="w-4 h-4 mr-2" />
                    Ubah Password
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}