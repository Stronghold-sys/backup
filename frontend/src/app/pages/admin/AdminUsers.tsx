import { useEffect, useState, useCallback } from 'react';
import { Search, Eye, Shield, Ban, CheckCircle, XCircle, Trash2, AlertCircle } from 'lucide-react';
import AdminLayout from '@/app/components/Layout/AdminLayout';
import { Card } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Input } from '@/app/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/app/components/ui/dialog';
import { Label } from '@/app/components/ui/label';
import { api } from '@/lib/supabase';
import { User, useAuthStore } from '@/lib/store';
import { toast } from 'sonner';
import BanUserDialog from '@/app/components/admin/BanUserDialog';
import { useNavigate } from 'react-router';

export default function AdminUsers() {
  const navigate = useNavigate();
  const { accessToken, user: currentUser, setUser, isAuthenticated } = useAuthStore();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isUpdateRoleOpen, setIsUpdateRoleOpen] = useState(false);
  const [isUpdateStatusOpen, setIsUpdateStatusOpen] = useState(false);
  const [isBanDialogOpen, setIsBanDialogOpen] = useState(false);
  const [newRole, setNewRole] = useState<'user' | 'admin'>('user');
  const [newStatus, setNewStatus] = useState<'active' | 'suspended' | 'banned'>('active');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [hasAuthError, setHasAuthError] = useState(false); // ✅ NEW: Track auth errors
  const [isWaitingForAuth, setIsWaitingForAuth] = useState(true); // ✅ NEW: Track waiting state

  // ✅ NEW: Wait for auth state with timeout
  useEffect(() => {
    const timer = setTimeout(() => {
      // After 5 seconds, if still no auth, stop waiting
      if (!accessToken || !currentUser) {
        console.error('[AdminUsers] No auth state after 5s timeout');
        setIsWaitingForAuth(false);
        
        // Redirect to login
        toast.error('Sesi Anda telah berakhir. Silakan login kembali.');
        setTimeout(() => {
          navigate('/login');
        }, 1500);
      }
    }, 5000);

    // If we get auth state, clear timer and proceed
    if (accessToken && currentUser) {
      console.info('[AdminUsers] Auth state ready!');
      setIsWaitingForAuth(false);
      clearTimeout(timer);
    }

    return () => clearTimeout(timer);
  }, [accessToken, currentUser, navigate]);

  // ✅ FIXED: Wrap loadUsers with useCallback to prevent infinite loops
  const loadUsers = useCallback(async () => {
    // Fetch users dari Supabase Auth melalui backend API
    console.info('[AdminUsers] Loading users from Supabase Auth...');
    console.info('[AdminUsers] Current user:', currentUser?.email, currentUser?.role);
    console.info('[AdminUsers] Access token:', accessToken ? `${accessToken.substring(0, 20)}...` : 'NO TOKEN');
    setIsLoading(true);
    
    try {
      const response = await api.get('/admin/users', accessToken!);
      if (response.success) {
        console.info(`✅ Loaded ${response.count} users from ${response.source}`);
        setUsers(response.users);
      } else {
        console.error('❌ Failed to load users:', response.error);
        
        // ✅ FIXED: JANGAN redirect otomatis ke debug page - hanya log error saja
        // Biarkan user tetap di halaman admin dan coba reload manual jika perlu
        if (response.error?.includes('Unauthorized') || response.error?.includes('Admin only')) {
          console.error('⚠️ Authentication error - User might not have admin access');
          toast.error('Gagal memuat data: ' + response.error);
          setHasAuthError(true); // Track error for UI display
        } else {
          toast.error('Gagal memuat data pengguna: ' + (response.error || 'Unknown error'));
        }
      }
    } catch (error: any) {
      console.error('💥 Error loading users:', error);
      
      // ✅ FIXED: JANGAN redirect otomatis - hanya log dan show error
      if (error.message?.includes('403') || error.toString().includes('403')) {
        console.error('⚠️ 403 Unauthorized error');
        toast.error('Gagal memuat data: Anda tidak memiliki akses admin');
        setHasAuthError(true);
      } else {
        toast.error('Terjadi kesalahan saat memuat pengguna');
      }
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, currentUser]); // ✅ Add dependencies

  // ✅ FIXED: Only load users when accessToken is available
  useEffect(() => {
    if (accessToken && currentUser) {
      console.info('[AdminUsers] accessToken available, loading users...');
      loadUsers();
    } else {
      console.warn('[AdminUsers] Waiting for accessToken...', {
        hasToken: !!accessToken,
        hasUser: !!currentUser,
      });
    }
  }, [accessToken, currentUser, loadUsers]); // ✅ Add loadUsers to dependencies

  useEffect(() => {
    filterUsers();
  }, [users, searchQuery, roleFilter, statusFilter]);

  const filterUsers = () => {
    let filtered = users;

    // Filter by role
    if (roleFilter !== 'all') {
      filtered = filtered.filter((user) => user.role === roleFilter);
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter((user) => user.status === statusFilter);
    }

    // Filter by search
    if (searchQuery) {
      filtered = filtered.filter(
        (user) =>
          user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.email.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredUsers(filtered);
  };

  const handleUpdateRole = async () => {
    if (!selectedUser) return;

    console.info(`[AdminUsers] Updating role for user ${selectedUser.email} from ${selectedUser.role} to ${newRole}`);
    setIsLoading(true);

    try {
      // Call backend API to update role
      const response = await api.put(
        `/admin/users/${selectedUser.id}/role`,
        { role: newRole },
        accessToken!
      );

      if (response.success) {
        console.info('✅ Role updated successfully in backend');
        toast.success('Role pengguna berhasil diperbarui');
        setIsUpdateRoleOpen(false);
        
        // Reload users from backend
        await loadUsers();
        
        // If editing current user, reload their session
        if (currentUser && currentUser.email === selectedUser.email) {
          console.info('[AdminUsers] Current user role updated, reloading session...');
          toast.info('Role Anda telah diubah. Silakan login ulang untuk melihat perubahan.');
        }
      } else {
        toast.error(response.error || 'Gagal memperbarui role');
      }
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error('Terjadi kesalahan saat memperbarui role');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!selectedUser) return;

    console.info(`[AdminUsers] Updating status for user ${selectedUser.email} from ${selectedUser.status} to ${newStatus}`);
    setIsLoading(true);

    try {
      // Call backend API to update status
      const response = await api.put(
        `/admin/users/${selectedUser.id}/status`,
        { status: newStatus },
        accessToken!
      );

      if (response.success) {
        console.info('✅ Status updated successfully in backend');
        toast.success('Status pengguna berhasil diperbarui');
        setIsUpdateStatusOpen(false);
        
        // Reload users from backend
        await loadUsers();
      } else {
        toast.error(response.error || 'Gagal memperbarui status');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Terjadi kesalahan saat memperbarui status');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBanUser = async (type: 'suspend' | 'ban', reason: string, duration: number, unit: string) => {
    if (!selectedUser) return;

    console.info(`[AdminUsers] ${type}ing user:`, selectedUser);
    console.info(`[AdminUsers] User ID:`, selectedUser.id);
    console.info(`[AdminUsers] User email:`, selectedUser.email);
    console.info(`[AdminUsers] Duration: ${duration} ${unit}`);
    console.info(`[AdminUsers] Reason:`, reason);

    try {
      // Call backend API to ban user
      const response = await api.post(
        `/users/${selectedUser.id}/ban`,
        { type, reason, duration, unit },
        accessToken!
      );

      console.info('[AdminUsers] Ban response:', response);

      if (response.success) {
        console.info('✅ User banned in backend successfully');
        toast.success(`User berhasil di-${type} dan tersimpan di database`);
        setIsBanDialogOpen(false);
        
        // Reload users from backend
        await loadUsers();
      } else {
        console.error('❌ Ban failed:', response.error);
        toast.error(response.error || `Gagal mem-${type} user`);
      }
    } catch (error: any) {
      console.error(`❌ Error ${type}ing user:`, error);
      toast.error(error.message || 'Terjadi kesalahan saat mem-ban user');
    }
  };

  const handleUnbanUser = async () => {
    if (!selectedUser) return;

    console.info(`[AdminUsers] Unbanning user ${selectedUser.email}`);

    try {
      // Call backend API to unban user
      const response = await api.post(
        `/users/${selectedUser.id}/unban`,
        {},
        accessToken!
      );

      if (response.success) {
        console.info('✅ User unbanned in backend successfully');
        toast.success('User berhasil di-unban dan bisa login kembali');
        
        // Reload users from backend
        await loadUsers();
      } else {
        toast.error(response.error || 'Gagal meng-unban user');
      }
    } catch (error: any) {
      console.error('Error unbanning user:', error);
      toast.error(error.message || 'Terjadi kesalahan saat meng-unban user');
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    console.info(`[AdminUsers] Deleting user ${selectedUser.email}`);
    setIsDeleting(true);

    try {
      // Call backend API to delete user
      const response = await api.delete(
        `/admin/users/${selectedUser.id}`,
        accessToken!
      );

      if (response.success) {
        console.info('✅ User deleted in backend successfully');
        toast.success('User berhasil dihapus dari database');
        setIsDeleteDialogOpen(false);
        
        // Reload users from backend
        await loadUsers();
      } else {
        toast.error(response.error || 'Gagal menghapus user');
      }
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast.error(error.message || 'Terjadi kesalahan saat menghapus user');
    } finally {
      setIsDeleting(false);
    }
  };

  const calculateEndDate = (duration: number, unit: string): string => {
    const now = new Date();
    
    switch (unit) {
      case 'seconds':
        now.setSeconds(now.getSeconds() + duration);
        break;
      case 'minutes':
        now.setMinutes(now.getMinutes() + duration);
        break;
      case 'hours':
        now.setHours(now.getHours() + duration);
        break;
      case 'days':
        now.setDate(now.getDate() + duration);
        break;
      case 'weeks':
        now.setDate(now.getDate() + (duration * 7));
        break;
      case 'months':
        now.setMonth(now.getMonth() + duration);
        break;
      case 'years':
        now.setFullYear(now.getFullYear() + duration);
        break;
    }
    
    return now.toISOString();
  };

  const getRoleBadge = (role: string) => {
    return role === 'admin'
      ? 'bg-purple-100 text-purple-800'
      : 'bg-blue-100 text-blue-800';
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      suspended: 'bg-yellow-100 text-yellow-800',
      banned: 'bg-red-100 text-red-800',
    };

    return variants[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusText = (status: string) => {
    const text: Record<string, string> = {
      active: 'Aktif',
      suspended: 'Disuspend',
      banned: 'Dibanned',
    };

    return text[status] || status;
  };

  return (
    <AdminLayout>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* ✅ NEW: Show waiting state when auth is not ready */}
        {isWaitingForAuth ? (
          <Card className="p-6">
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mb-4"></div>
              <p className="text-gray-600 mb-2">Memuat status autentikasi...</p>
              <p className="text-sm text-gray-500">Mohon tunggu sebentar</p>
            </div>
          </Card>
        ) : (
          <>
            {/* Header and Filters - Fixed at top */}
            <div>
              <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Kelola Pengguna</h1>
              </div>

              {/* Filters */}
              <Card className="p-4 mb-6">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Cari berdasarkan nama atau email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger className="w-full md:w-[150px]">
                      <SelectValue placeholder="Filter Role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Role</SelectItem>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full md:w-[150px]">
                      <SelectValue placeholder="Filter Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Status</SelectItem>
                      <SelectItem value="active">Aktif</SelectItem>
                      <SelectItem value="suspended">Disuspend</SelectItem>
                      <SelectItem value="banned">Dibanned</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </Card>
            </div>

            {/* Scrollable Content */}
            <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
              <Card className="p-6">
                {isLoading ? (
                  <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mb-4"></div>
                    <p>Memuat pengguna...</p>
                  </div>
                ) : hasAuthError ? (
                  <div className="text-center py-12">
                    <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Akses Ditolak</h3>
                    <p className="text-gray-600 mb-4">
                      Anda tidak memiliki akses admin atau sesi Anda telah berakhir.
                    </p>
                    
                    {/* ✅ NEW: Show current user info for debugging */}
                    {currentUser && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4 max-w-md mx-auto">
                        <p className="text-sm text-gray-700 mb-2">
                          <strong>Email:</strong> {currentUser.email}
                        </p>
                        <p className="text-sm text-gray-700 mb-2">
                          <strong>Current Role:</strong> <span className="font-mono text-red-600">{currentUser.role}</span>
                        </p>
                        <p className="text-sm text-gray-700">
                          <strong>Required Role:</strong> <span className="font-mono text-green-600">admin</span>
                        </p>
                        
                        {currentUser.email === 'utskelompok03@gmail.com' && currentUser.role !== 'admin' && (
                          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
                            <p className="text-xs text-blue-800 mb-2">
                              ⚠️ Anda adalah admin account tapi role belum di-set ke 'admin'.
                            </p>
                            <Button
                              onClick={async () => {
                                try {
                                  // Fix admin access by calling backend
                                  const { supabase } = await import('@/lib/supabase');
                                  
                                  // Update user metadata directly
                                  const { error } = await supabase.auth.updateUser({
                                    data: {
                                      role: 'admin',
                                      status: 'active',
                                    }
                                  });
                                  
                                  if (error) {
                                    toast.error('Gagal memperbaiki akses: ' + error.message);
                                  } else {
                                    toast.success('Akses admin berhasil diperbaiki! Silakan refresh halaman.');
                                    
                                    // Refresh session
                                    const { data: { session } } = await supabase.auth.getSession();
                                    if (session) {
                                      const updatedUser = {
                                        ...currentUser,
                                        role: 'admin',
                                      };
                                      setUser(updatedUser, session.access_token);
                                      
                                      // Reload page after 1 second
                                      setTimeout(() => {
                                        window.location.reload();
                                      }, 1000);
                                    }
                                  }
                                } catch (error: any) {
                                  toast.error('Terjadi kesalahan: ' + error.message);
                                }
                              }}
                              className="bg-blue-600 hover:bg-blue-700 text-white text-xs"
                              size="sm"
                            >
                              Fix Admin Access
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                    
                    <Button
                      onClick={() => {
                        navigate('/login');
                      }}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Kembali ke Login
                    </Button>
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-500">Tidak ada pengguna ditemukan</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-4">Pengguna</th>
                          <th className="text-left py-3 px-4">Email</th>
                          <th className="text-center py-3 px-4">Role</th>
                          <th className="text-center py-3 px-4">Status</th>
                          <th className="text-center py-3 px-4">Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredUsers.map((user) => (
                          <tr key={user.id} className="border-b hover:bg-gray-50">
                            <td className="py-3 px-4">
                              <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                                  {user.avatar ? (
                                    <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full" />
                                  ) : (
                                    <span className="text-lg font-bold text-gray-400">{user.name[0]}</span>
                                  )}
                                </div>
                                <span className="font-medium">{user.name}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4">{user.email}</td>
                            <td className="py-3 px-4 text-center">
                              <Badge className={getRoleBadge(user.role)}>
                                {user.role === 'admin' ? 'Admin' : 'User'}
                              </Badge>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <Badge className={getStatusBadge(user.status)}>
                                {getStatusText(user.status)}
                              </Badge>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedUser(user);
                                    setIsDetailOpen(true);
                                  }}
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedUser(user);
                                    setNewRole(user.role);
                                    setIsUpdateRoleOpen(true);
                                  }}
                                >
                                  <Shield className="w-4 h-4" />
                                </Button>
                                {user.status === 'active' ? (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedUser(user);
                                      setIsBanDialogOpen(true);
                                    }}
                                    title="Suspend/Ban User"
                                  >
                                    <Ban className="w-4 h-4 text-red-600" />
                                  </Button>
                                ) : (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedUser(user);
                                      handleUnbanUser();
                                    }}
                                    title="Unban User"
                                  >
                                    <XCircle className="w-4 h-4 text-green-600" />
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedUser(user);
                                    setIsDeleteDialogOpen(true);
                                  }}
                                  title="Delete User"
                                >
                                  <Trash2 className="w-4 h-4 text-red-600" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </div>
          </>
        )}
      </div>

      {/* User Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detail Pengguna</DialogTitle>
            <DialogDescription>
              Informasi lengkap pengguna yang dipilih
            </DialogDescription>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
                  {selectedUser.avatar ? (
                    <img src={selectedUser.avatar} alt={selectedUser.name} className="w-16 h-16 rounded-full" />
                  ) : (
                    <span className="text-2xl font-bold text-gray-400">{selectedUser.name[0]}</span>
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-lg">{selectedUser.name}</h3>
                  <p className="text-sm text-gray-600">{selectedUser.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <Label className="text-sm text-gray-600">ID</Label>
                  <p className="font-medium text-sm">{selectedUser.id}</p>
                </div>
                <div>
                  <Label className="text-sm text-gray-600">Role</Label>
                  <Badge className={getRoleBadge(selectedUser.role)}>
                    {selectedUser.role === 'admin' ? 'Admin' : 'User'}
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm text-gray-600">Status</Label>
                  <Badge className={getStatusBadge(selectedUser.status)}>
                    {getStatusText(selectedUser.status)}
                  </Badge>
                </div>
                {selectedUser.phone && (
                  <div>
                    <Label className="text-sm text-gray-600">Telepon</Label>
                    <p className="font-medium text-sm">{selectedUser.phone}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailOpen(false)}>
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update Role Dialog */}
      <Dialog open={isUpdateRoleOpen} onOpenChange={setIsUpdateRoleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Role Pengguna</DialogTitle>
            <DialogDescription>{selectedUser?.name}</DialogDescription>
          </DialogHeader>

          <div>
            <Label htmlFor="role">Role Baru</Label>
            <Select value={newRole} onValueChange={(value: 'user' | 'admin') => setNewRole(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUpdateRoleOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleUpdateRole} className="bg-green-600 hover:bg-green-700">
              Update Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update Status Dialog */}
      <Dialog open={isUpdateStatusOpen} onOpenChange={setIsUpdateStatusOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Status Pengguna</DialogTitle>
            <DialogDescription>{selectedUser?.name}</DialogDescription>
          </DialogHeader>

          <div>
            <Label htmlFor="status">Status Baru</Label>
            <Select value={newStatus} onValueChange={(value: 'active' | 'suspended' | 'banned') => setNewStatus(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Aktif</SelectItem>
                <SelectItem value="suspended">Suspend</SelectItem>
                <SelectItem value="banned">Ban</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUpdateStatusOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleUpdateStatus} className="bg-green-600 hover:bg-green-700">
              Update Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ban User Dialog */}
      <BanUserDialog
        isOpen={isBanDialogOpen}
        onClose={() => setIsBanDialogOpen(false)}
        user={selectedUser}
        onBan={handleBanUser}
      />

      {/* Delete User Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus Pengguna</DialogTitle>
            <DialogDescription>
              Anda yakin ingin menghapus pengguna ini? Tindakan ini tidak dapat diurungkan.
            </DialogDescription>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
                  {selectedUser.avatar ? (
                    <img src={selectedUser.avatar} alt={selectedUser.name} className="w-16 h-16 rounded-full" />
                  ) : (
                    <span className="text-2xl font-bold text-gray-400">{selectedUser.name[0]}</span>
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-lg">{selectedUser.name}</h3>
                  <p className="text-sm text-gray-600">{selectedUser.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <Label className="text-sm text-gray-600">ID</Label>
                  <p className="font-medium text-sm">{selectedUser.id}</p>
                </div>
                <div>
                  <Label className="text-sm text-gray-600">Role</Label>
                  <Badge className={getRoleBadge(selectedUser.role)}>
                    {selectedUser.role === 'admin' ? 'Admin' : 'User'}
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm text-gray-600">Status</Label>
                  <Badge className={getStatusBadge(selectedUser.status)}>
                    {getStatusText(selectedUser.status)}
                  </Badge>
                </div>
                {selectedUser.phone && (
                  <div>
                    <Label className="text-sm text-gray-600">Telepon</Label>
                    <p className="font-medium text-sm">{selectedUser.phone}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleDeleteUser} className="bg-red-600 hover:bg-red-700" disabled={isDeleting}>
              {isDeleting ? 'Menghapus...' : 'Hapus'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}