import { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, Eye, EyeOff, FolderTree } from 'lucide-react';
import AdminLayout from '@/app/components/Layout/AdminLayout';
import { Card } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/app/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/app/components/ui/alert-dialog';
import { Badge } from '@/app/components/ui/badge';
import { api } from '@/lib/supabase';
import { useAuthStore } from '@/lib/store';
import { toast } from 'sonner';

interface Category {
  id: string;
  name: string;
  description?: string;
  status: 'active' | 'inactive';
  productCount?: number;
  createdAt: string;
}

export default function AdminCategories() {
  const { accessToken } = useAuthStore();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false); // Ubah ke false untuk mencegah flicker
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'active' as 'active' | 'inactive'
  });

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      // For now, use mock data until backend is ready
      const mockCategories: Category[] = [
        { id: '1', name: 'Elektronik', description: 'Perangkat elektronik dan gadget', status: 'active', productCount: 45, createdAt: '2024-01-15' },
        { id: '2', name: 'Fashion', description: 'Pakaian dan aksesoris', status: 'active', productCount: 120, createdAt: '2024-01-10' },
        { id: '3', name: 'Makanan & Minuman', description: 'Produk makanan dan minuman', status: 'active', productCount: 78, createdAt: '2024-01-08' },
        { id: '4', name: 'Kecantikan', description: 'Produk perawatan dan kecantikan', status: 'active', productCount: 34, createdAt: '2024-01-05' },
        { id: '5', name: 'Olahraga', description: 'Peralatan dan perlengkapan olahraga', status: 'inactive', productCount: 12, createdAt: '2024-01-03' },
      ];
      setCategories(mockCategories);
    } catch (error) {
      console.error('Error loading categories:', error);
      toast.error('Gagal memuat kategori');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenDialog = (category?: Category) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        name: category.name,
        description: category.description || '',
        status: category.status
      });
    } else {
      setEditingCategory(null);
      setFormData({ name: '', description: '', status: 'active' });
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('Nama kategori harus diisi');
      return;
    }

    try {
      if (editingCategory) {
        // Update existing category
        const updatedCategories = categories.map(cat =>
          cat.id === editingCategory.id
            ? { ...cat, ...formData }
            : cat
        );
        setCategories(updatedCategories);
        toast.success('Kategori berhasil diperbarui');
      } else {
        // Add new category
        const newCategory: Category = {
          id: Date.now().toString(),
          ...formData,
          productCount: 0,
          createdAt: new Date().toISOString()
        };
        setCategories([newCategory, ...categories]);
        toast.success('Kategori berhasil ditambahkan');
      }
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error saving category:', error);
      toast.error('Gagal menyimpan kategori');
    }
  };

  const handleToggleStatus = (category: Category) => {
    const newStatus = category.status === 'active' ? 'inactive' : 'active';
    const updatedCategories = categories.map(cat =>
      cat.id === category.id
        ? { ...cat, status: newStatus }
        : cat
    );
    setCategories(updatedCategories);
    toast.success(`Kategori ${newStatus === 'active' ? 'diaktifkan' : 'dinonaktifkan'}`);
  };

  const handleDelete = (category: Category) => {
    if (category.productCount && category.productCount > 0) {
      toast.error(`Tidak dapat menghapus kategori yang memiliki ${category.productCount} produk. Pindahkan produk terlebih dahulu.`);
      return;
    }

    const updatedCategories = categories.filter(cat => cat.id !== category.id);
    setCategories(updatedCategories);
    toast.success('Kategori berhasil dihapus');
  };

  const handleOpenDeleteDialog = (category: Category) => {
    // Check if category has products before opening dialog
    if (category.productCount && category.productCount > 0) {
      toast.error(`Tidak dapat menghapus kategori yang memiliki ${category.productCount} produk. Pindahkan produk terlebih dahulu.`);
      return;
    }
    setCategoryToDelete(category);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (categoryToDelete) {
      handleDelete(categoryToDelete);
    }
    setDeleteDialogOpen(false);
  };

  return (
    <AdminLayout>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ flexShrink: 0, marginBottom: '1.5rem' }}>
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <FolderTree className="w-7 h-7 text-green-600" />
                Manajemen Kategori
              </h1>
              <p className="text-sm text-gray-600 mt-1">Kelola kategori produk marketplace Anda</p>
            </div>
            <Button 
              onClick={() => handleOpenDialog()}
              className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Tambah Kategori
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="p-4">
            <p className="text-sm text-gray-600">Total Kategori</p>
            <p className="text-2xl font-bold text-gray-900">{categories.length}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-gray-600">Kategori Aktif</p>
            <p className="text-2xl font-bold text-green-600">
              {categories.filter(c => c.status === 'active').length}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-gray-600">Kategori Nonaktif</p>
            <p className="text-2xl font-bold text-gray-500">
              {categories.filter(c => c.status === 'inactive').length}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-gray-600">Total Produk</p>
            <p className="text-2xl font-bold text-blue-600">
              {categories.reduce((sum, c) => sum + (c.productCount || 0), 0)}
            </p>
          </Card>
        </div>

        {/* Categories Grid */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <p className="text-gray-500">Memuat kategori...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-6">
              {categories.map((category) => (
                <Card key={category.id} className="p-6 hover:shadow-lg transition">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-bold text-lg">{category.name}</h3>
                      <p className="text-sm text-gray-600 mt-1">{category.description || 'Tidak ada deskripsi'}</p>
                    </div>
                    <Badge className={category.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>
                      {category.status === 'active' ? 'Aktif' : 'Nonaktif'}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-4 mb-4 text-sm text-gray-600">
                    <div>
                      <span className="font-semibold text-gray-900">{category.productCount || 0}</span> Produk
                    </div>
                    <div>
                      <span className="text-xs">{new Date(category.createdAt).toLocaleDateString('id-ID')}</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleOpenDialog(category)}
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleStatus(category)}
                      className={category.status === 'active' ? 'text-gray-600' : 'text-green-600'}
                    >
                      {category.status === 'active' ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenDeleteDialog(category)}
                      className="text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? 'Edit Kategori' : 'Tambah Kategori Baru'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label htmlFor="name">Nama Kategori *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Contoh: Elektronik"
              />
            </div>
            <div>
              <Label htmlFor="description">Deskripsi</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Deskripsi kategori (opsional)"
              />
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="active">Aktif</option>
                <option value="inactive">Nonaktif</option>
              </select>
            </div>
            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="flex-1">
                Batal
              </Button>
              <Button onClick={handleSave} className="flex-1 bg-green-600 hover:bg-green-700">
                {editingCategory ? 'Perbarui' : 'Simpan'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Kategori</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus kategori "{categoryToDelete?.name}"? Tindakan ini tidak dapat diurungkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteDialogOpen(false)}>
              Batal
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}