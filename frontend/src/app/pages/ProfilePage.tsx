import { useState } from 'react';
import { Edit2, Save, X, Trash2 } from 'lucide-react';
import Layout from '@/app/components/Layout/Layout';
import { Card } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/app/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { useAuthStore } from '@/lib/store';
import { api } from '@/lib/supabase';
import { toast } from 'sonner';
import ProfilePhotoUpload from '@/app/components/ProfilePhotoUpload';
import { DeleteAccountDialog } from '@/app/components/DeleteAccountDialog';
import { AvatarImage } from '@/app/components/AvatarImage';
import { useNavigate } from 'react-router';

export default function ProfilePage() {
  const { user, setUser, accessToken, logout } = useAuthStore();
  const navigate = useNavigate();
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const handleUpdateProfile = async () => {
    try {
      const response = await api.put('/profile', profileForm, accessToken!);
      if (response.success) {
        setUser({ ...user!, ...profileForm }, accessToken!); // ✅ FIXED: Include accessToken
        toast.success('Profil berhasil diperbarui');
        setIsEditingProfile(false);
      } else {
        toast.error(response.error || 'Gagal memperbarui profil');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Terjadi kesalahan');
    }
  };

  const handleChangePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('Password baru tidak cocok');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      toast.error('Password minimal 6 karakter');
      return;
    }

    try {
      const response = await api.post('/profile/change-password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      }, accessToken!);
      
      if (response.success) {
        toast.success('Password berhasil diubah');
        setIsChangingPassword(false);
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        toast.error(response.error || 'Gagal mengubah password');
      }
    } catch (error) {
      console.error('Error changing password:', error);
      toast.error('Terjadi kesalahan');
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      const response = await api.delete('/profile', accessToken!);
      if (response.success) {
        toast.success('Akun berhasil dihapus');
        logout();
        navigate('/login');
      } else {
        toast.error(response.error || 'Gagal menghapus akun');
      }
    } catch (error) {
      console.error('Error deleting account:', error);
      toast.error('Terjadi kesalahan');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Layout>
      <div className="flex-1 bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold mb-6">Profil Saya</h1>

          <Tabs defaultValue="profile" className="space-y-6">
            <TabsList>
              <TabsTrigger value="profile">Informasi Profil</TabsTrigger>
              <TabsTrigger value="security">Keamanan</TabsTrigger>
            </TabsList>

            <TabsContent value="profile">
              <Card className="p-8">
                <div className="space-y-6">
                  {/* Profile Header */}
                  <div className="flex items-center justify-between pb-6 border-b">
                    <div className="flex items-center space-x-6">
                      <div className="relative">
                        <div className="w-24 h-24 bg-gradient-to-br from-orange-400 to-pink-600 rounded-full flex items-center justify-center overflow-hidden">
                          {user?.avatar ? (
                            <img 
                              src={user.avatar} 
                              alt={user.name} 
                              className="w-24 h-24 rounded-full object-cover"
                              key={user.avatar} 
                              onError={(e) => {
                                console.error('❌ Failed to load avatar image:', user.avatar?.substring(0, 50));
                                e.currentTarget.style.display = 'none';
                              }}
                              onLoad={() => {
                                console.info('✅ Avatar loaded successfully');
                              }}
                            />
                          ) : (
                            <span className="text-4xl font-bold text-white">{user?.name[0]}</span>
                          )}
                        </div>
                        <ProfilePhotoUpload />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold">{user?.name}</h2>
                        <p className="text-gray-600">{user?.email}</p>
                      </div>
                    </div>
                    {!isEditingProfile && (
                      <Button
                        variant="outline"
                        onClick={() => setIsEditingProfile(true)}
                      >
                        <Edit2 className="w-4 h-4 mr-2" />
                        Edit Profil
                      </Button>
                    )}
                  </div>

                  {/* Profile Details */}
                  {isEditingProfile ? (
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="name">Nama Lengkap</Label>
                        <Input
                          id="name"
                          value={profileForm.name}
                          onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                          placeholder="Masukkan nama lengkap"
                        />
                      </div>

                      <div>
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={profileForm.email}
                          onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                          placeholder="Masukkan email"
                        />
                      </div>

                      <div>
                        <Label htmlFor="phone">No. Telepon</Label>
                        <Input
                          id="phone"
                          value={profileForm.phone}
                          onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                          placeholder="Masukkan nomor telepon"
                        />
                      </div>

                      <div className="flex gap-3 pt-4">
                        <Button
                          onClick={handleUpdateProfile}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Save className="w-4 h-4 mr-2" />
                          Simpan Perubahan
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setIsEditingProfile(false);
                            setProfileForm({
                              name: user?.name || '',
                              email: user?.email || '',
                              phone: user?.phone || '',
                            });
                          }}
                        >
                          <X className="w-4 h-4 mr-2" />
                          Batal
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <label className="text-sm text-gray-600">Nama Lengkap</label>
                        <p className="font-medium mt-1 text-lg">{user?.name}</p>
                      </div>
                      <div>
                        <label className="text-sm text-gray-600">Email</label>
                        <p className="font-medium mt-1 text-lg">{user?.email}</p>
                      </div>
                      <div>
                        <label className="text-sm text-gray-600">No. Telepon</label>
                        <p className="font-medium mt-1 text-lg">{user?.phone || '-'}</p>
                      </div>
                      <div>
                        <label className="text-sm text-gray-600">Role</label>
                        <p className="font-medium mt-1 text-lg capitalize">{user?.role}</p>
                      </div>
                      <div>
                        <label className="text-sm text-gray-600">Status Akun</label>
                        <p className="font-medium mt-1 text-lg capitalize">{user?.status}</p>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="security">
              <Card className="p-8">
                <div className="space-y-6">
                  <div className="pb-6 border-b">
                    <h3 className="text-xl font-bold mb-2">Keamanan Akun</h3>
                    <p className="text-gray-600">Kelola password dan keamanan akun Anda</p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <h4 className="font-semibold">Password</h4>
                        <p className="text-sm text-gray-600">Terakhir diubah 30 hari yang lalu</p>
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => setIsChangingPassword(true)}
                      >
                        Ubah Password
                      </Button>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <h4 className="font-semibold">Autentikasi Dua Faktor</h4>
                        <p className="text-sm text-gray-600">Tambahkan lapisan keamanan ekstra</p>
                      </div>
                      <Button variant="outline" disabled>
                        Segera Hadir
                      </Button>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <h4 className="font-semibold">Sesi Login</h4>
                        <p className="text-sm text-gray-600">Kelola perangkat yang terhubung</p>
                      </div>
                      <Button variant="outline" disabled>
                        Lihat Sesi
                      </Button>
                    </div>
                  </div>

                  {/* Danger Zone */}
                  <div className="mt-8 pt-8 border-t border-gray-200">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                      <h4 className="text-lg font-semibold text-red-800 mb-2">Zona Berbahaya</h4>
                      <p className="text-sm text-gray-700 mb-4">
                        Hapus akun secara permanen. Tindakan ini tidak dapat dibatalkan dan semua data Anda akan dihapus.
                      </p>
                      <Button
                        variant="destructive"
                        onClick={() => setIsDeleteDialogOpen(true)}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Hapus Akun Permanen
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Change Password Dialog */}
      <Dialog open={isChangingPassword} onOpenChange={setIsChangingPassword}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ubah Password</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="currentPassword">Password Saat Ini</Label>
              <Input
                id="currentPassword"
                type="password"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                placeholder="Masukkan password saat ini"
              />
            </div>

            <div>
              <Label htmlFor="newPassword">Password Baru</Label>
              <Input
                id="newPassword"
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                placeholder="Masukkan password baru (min. 6 karakter)"
              />
            </div>

            <div>
              <Label htmlFor="confirmPassword">Konfirmasi Password Baru</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                placeholder="Masukkan ulang password baru"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsChangingPassword(false);
                setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
              }}
            >
              Batal
            </Button>
            <Button
              onClick={handleChangePassword}
              className="bg-green-600 hover:bg-green-700"
            >
              Ubah Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Account Dialog */}
      <DeleteAccountDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDeleteAccount}
        isLoading={isDeleting}
      />
    </Layout>
  );
}