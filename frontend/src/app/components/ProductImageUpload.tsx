import { useState, useRef } from 'react';
import { Upload, X, Loader2, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { useAuthStore } from '@/lib/store';
import { toast } from 'sonner';
import { api } from '@/lib/supabase';

interface ProductImageUploadProps {
  currentImageUrl?: string;
  onImageUploaded: (imageUrl: string) => void;
  onImageRemoved?: () => void;
}

export default function ProductImageUpload({ 
  currentImageUrl, 
  onImageUploaded,
  onImageRemoved 
}: ProductImageUploadProps) {
  const { accessToken } = useAuthStore();
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('File harus berupa gambar');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Ukuran file maksimal 10MB');
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload immediately
    await uploadImage(file);
  };

  const uploadImage = async (file: File) => {
    setIsUploading(true);
    try {
      // Create form data
      const formData = new FormData();
      formData.append('image', file);

      // Upload to server
      const response = await api.upload('/admin/products/upload-image', formData, accessToken!);

      if (response.success && response.data?.imageUrl) {
        setPreviewUrl(response.data.imageUrl);
        onImageUploaded(response.data.imageUrl);
        toast.success('Gambar berhasil diunggah');
      } else {
        // ✅ Better error messages
        let errorMessage = response.error || 'Gagal mengunggah gambar';
        
        // Handle specific error cases
        if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
          errorMessage = 'Sesi Anda telah berakhir. Silakan login kembali.';
        } else if (errorMessage.includes('403') || errorMessage.includes('Forbidden')) {
          errorMessage = 'Anda tidak memiliki akses untuk mengunggah gambar.';
        }
        
        toast.error(errorMessage);
        setPreviewUrl(currentImageUrl || null);
      }
    } catch (error: any) {
      // Error uploading image
      
      // ✅ Better error messages for catch block
      let errorMessage = 'Terjadi kesalahan saat mengunggah gambar';
      if (error.message) {
        if (error.message.includes('401') || error.message.includes('Unauthorized')) {
          errorMessage = 'Sesi Anda telah berakhir. Silakan login kembali.';
        } else if (error.message.includes('403')) {
          errorMessage = 'Anda tidak memiliki akses admin.';
        }
      }
      
      toast.error(errorMessage);
      setPreviewUrl(currentImageUrl || null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveImage = () => {
    setPreviewUrl(null);
    if (onImageRemoved) {
      onImageRemoved();
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-3">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Preview or Upload Button */}
      {previewUrl ? (
        <div className="relative w-full h-48 bg-gray-100 rounded-lg overflow-hidden border-2 border-gray-200">
          <img
            src={previewUrl}
            alt="Preview"
            className="w-full h-full object-cover"
          />
          {isUploading && (
            <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex items-center justify-center"> {/* Changed from bg-black bg-opacity-50 */}
              <Loader2 className="w-8 h-8 text-orange-500 animate-spin" /> {/* Changed from text-white */}
            </div>
          )}
          <button
            onClick={handleRemoveImage}
            className="absolute top-2 right-2 w-8 h-8 bg-red-600 hover:bg-red-700 rounded-full flex items-center justify-center shadow-lg transition-colors"
            disabled={isUploading}
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full h-48 border-2 border-dashed border-gray-300 hover:border-green-500 rounded-lg flex flex-col items-center justify-center gap-3 transition-colors bg-gray-50 hover:bg-gray-100"
          disabled={isUploading}
        >
          {isUploading ? (
            <>
              <Loader2 className="w-12 h-12 text-green-600 animate-spin" />
              <span className="text-sm text-gray-600">Mengunggah...</span>
            </>
          ) : (
            <>
              <ImageIcon className="w-12 h-12 text-gray-400" />
              <div className="text-center">
                <p className="text-sm font-medium text-gray-700">
                  Klik untuk upload gambar
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  PNG, JPG, GIF (Max 10MB)
                </p>
              </div>
            </>
          )}
        </button>
      )}

      {/* Upload Button (alternative) */}
      <Button
        type="button"
        variant="outline"
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        className="w-full"
      >
        <Upload className="w-4 h-4 mr-2" />
        {previewUrl ? 'Ganti Gambar' : 'Pilih Gambar'}
      </Button>
    </div>
  );
}