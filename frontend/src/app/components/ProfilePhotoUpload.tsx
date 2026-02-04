import { useState, useRef } from 'react';
import { Camera, Upload, X, Loader2 } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/app/components/ui/dialog';
import { Progress } from '@/app/components/ui/progress';
import { useAuthStore } from '@/lib/store';
import { toast } from 'sonner';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import imageCompression from 'browser-image-compression';

const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-adb995ba`;

interface ProfilePhotoUploadProps {
  onPhotoUpdated?: (photoUrl: string) => void;
}

export default function ProfilePhotoUpload({ onPhotoUpdated }: ProfilePhotoUploadProps) {
  const { user, setUser, accessToken } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [estimatedSize, setEstimatedSize] = useState<number | null>(null);
  const [isEstimating, setIsEstimating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('File harus berupa gambar');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Ukuran file maksimal 5MB');
      return;
    }

    setSelectedFile(file);
    setEstimatedSize(null);
    setIsEstimating(true);
    
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);

    try {
      const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1024,
        useWebWorker: true,
        fileType: file.type,
        initialQuality: 0.8,
      };
      const compressedFile = await imageCompression(file, options);
      setEstimatedSize(compressedFile.size);
    } catch (error) {
      // Failed to estimate
    } finally {
      setIsEstimating(false);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !user) return;

    if (!accessToken) {
      toast.error('Sesi Anda telah berakhir. Silakan login kembali.');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setUploadStatus('Memulai upload...');
    
    abortControllerRef.current = new AbortController();
    
    try {
      setUploadStatus('Menguji koneksi server...');
      setUploadProgress(5);
      
      const healthCheck = await fetch(`${API_URL}/health`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        signal: abortControllerRef.current.signal,
      });
      
      if (!healthCheck.ok) {
        toast.error('Server tidak dapat dijangkau. Coba lagi nanti.');
        setIsUploading(false);
        setUploadProgress(0);
        setUploadStatus('');
        return;
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        toast.info('Upload dibatalkan');
        setIsUploading(false);
        setUploadProgress(0);
        setUploadStatus('');
        return;
      }
      toast.error('Tidak dapat terhubung ke server. Periksa koneksi internet Anda.');
      setIsUploading(false);
      setUploadProgress(0);
      setUploadStatus('');
      return;
    }
    
    try {
      setUploadStatus('Memverifikasi sesi...');
      setUploadProgress(8);
      
      const verifyResponse = await fetch(`${API_URL}/debug/verify-token`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'X-User-Token': accessToken,
        },
        signal: abortControllerRef.current.signal,
      });
      
      const verifyData = await verifyResponse.json();
      
      if (!verifyResponse.ok || !verifyData.success) {
        toast.error('Sesi Anda tidak valid. Silakan login kembali.');
        setIsUploading(false);
        setUploadProgress(0);
        setUploadStatus('');
        return;
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        toast.info('Upload dibatalkan');
        setIsUploading(false);
        setUploadProgress(0);
        setUploadStatus('');
        return;
      }
      toast.error('Tidak dapat memverifikasi sesi. Silakan login kembali.');
      setIsUploading(false);
      setUploadProgress(0);
      setUploadStatus('');
      return;
    }
    
    try {
      setUploadStatus('Mengompresi gambar...');
      setUploadProgress(10);
      
      const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1024,
        useWebWorker: true,
        fileType: selectedFile.type,
        initialQuality: 0.8,
      };
      
      const compressedFile = await imageCompression(selectedFile, options);
      
      setUploadProgress(30);
      setUploadStatus('Mengonversi gambar...');
      
      const base64Promise = new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === 'string') {
            resolve(reader.result);
          } else {
            reject(new Error('Failed to read file'));
          }
        };
        reader.onerror = reject;
        reader.readAsDataURL(compressedFile);
      });
      
      const base64Data = await base64Promise;
      
      setUploadProgress(50);
      setUploadStatus('Mengunggah ke server...');
      
      const response = await fetch(`${API_URL}/profile/upload-photo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
          'X-User-Token': accessToken,
        },
        body: JSON.stringify({
          photoBase64: base64Data,
          fileName: selectedFile.name,
          fileType: compressedFile.type,
          fileSize: compressedFile.size,
        }),
        signal: abortControllerRef.current.signal,
      });

      setUploadProgress(80);
      setUploadStatus('Memproses response...');

      if (!response.ok) {
        const errorText = await response.text();
        
        let errorMessage = `Gagal mengunggah foto: ${response.status}`;
        try {
          const errorData = JSON.parse(errorText);
          if (errorData.error) {
            errorMessage = errorData.error;
          }
        } catch {
          // Use default message
        }
        
        if (response.status === 401) {
          errorMessage = 'Sesi Anda telah berakhir. Silakan login kembali.';
        } else if (response.status === 403) {
          errorMessage = 'Anda tidak memiliki akses untuk mengunggah foto.';
        }
        
        toast.error(errorMessage);
        setIsUploading(false);
        setUploadProgress(0);
        setUploadStatus('');
        return;
      }

      const data = await response.json();

      setUploadProgress(100);
      setUploadStatus('Selesai!');

      if (data.success && data.photoUrl) {
        const updatedUser = { ...user, avatar: data.photoUrl };
        setUser(updatedUser, accessToken);
        
        toast.success('Foto profil berhasil diperbarui');
        
        setTimeout(() => {
          setIsOpen(false);
          setPreviewUrl(null);
          setSelectedFile(null);
          setUploadProgress(0);
          setUploadStatus('');
          
          window.location.reload();
        }, 1000);
        
        if (onPhotoUpdated) {
          onPhotoUpdated(data.photoUrl);
        }
        
        setIsUploading(false);
        return;
      } else {
        toast.error(data.error || 'Gagal mengunggah foto');
        setIsUploading(false);
        setUploadProgress(0);
        setUploadStatus('');
        return;
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        toast.info('Upload dibatalkan');
        setIsUploading(false);
        setUploadProgress(0);
        setUploadStatus('');
        return;
      }
      
      toast.error('Terjadi kesalahan saat mengunggah foto. Silakan coba lagi.');
      setIsUploading(false);
      setUploadProgress(0);
      setUploadStatus('');
    }
  };

  const handleCancelUpload = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const handleRemovePhoto = async () => {
    if (!user) return;

    if (!accessToken) {
      toast.error('Sesi Anda telah berakhir. Silakan login kembali.');
      return;
    }

    setIsUploading(true);
    try {
      const response = await fetch(`${API_URL}/profile/delete-photo`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        toast.error('Gagal menghapus foto');
        return;
      }

      const data = await response.json();

      if (data.success) {
        const updatedUser = { ...user, avatar: undefined };
        setUser(updatedUser, accessToken);
        toast.success('Foto profil berhasil dihapus');
        setIsOpen(false);
      } else {
        toast.error(data.error || 'Gagal menghapus foto');
      }
    } catch (error) {
      toast.error('Terjadi kesalahan');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="absolute bottom-0 right-0 w-10 h-10 bg-green-600 hover:bg-green-700 rounded-full flex items-center justify-center shadow-lg transition-colors border-4 border-white"
        title="Ubah foto profil"
      >
        <Camera className="w-5 h-5 text-white" />
      </button>

      <Dialog open={isOpen} onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) {
          setPreviewUrl(null);
          setSelectedFile(null);
          setEstimatedSize(null);
          setUploadProgress(0);
          setUploadStatus('');
          if (abortControllerRef.current) {
            abortControllerRef.current.abort();
          }
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ubah Foto Profil</DialogTitle>
            <DialogDescription>
              Unggah foto profil baru Anda. Format yang didukung: JPG, PNG, GIF (Max 5MB)
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex justify-center">
              <div className="relative">
                <div className="w-40 h-40 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center">
                  {previewUrl ? (
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  ) : user?.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-6xl font-bold text-gray-400">
                      {user?.name[0].toUpperCase()}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />

            <div className="flex flex-col gap-2">
              <Button
                onClick={() => fileInputRef.current?.click()}
                className="w-full bg-green-600 hover:bg-green-700"
                disabled={isUploading}
              >
                <Upload className="w-4 h-4 mr-2" />
                Pilih Foto Baru
              </Button>

              {user?.avatar && (
                <Button
                  onClick={handleRemovePhoto}
                  variant="outline"
                  className="w-full text-red-600 border-red-600 hover:bg-red-50"
                  disabled={isUploading}
                >
                  <X className="w-4 h-4 mr-2" />
                  Hapus Foto
                </Button>
              )}
            </div>

            {selectedFile && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-900">
                  <strong>File terpilih:</strong> {selectedFile.name}
                </p>
                <p className="text-xs text-blue-700 mt-1">
                  Ukuran: {(selectedFile.size / 1024).toFixed(2)} KB
                </p>
                {isEstimating ? (
                  <p className="text-xs text-blue-700 mt-1 flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Menghitung ukuran setelah kompresi...
                  </p>
                ) : estimatedSize !== null && (
                  <p className="text-xs text-green-700 mt-1 font-semibold">
                    Ukuran setelah kompresi: {(estimatedSize / 1024).toFixed(2)} KB 
                    ({((1 - estimatedSize / selectedFile.size) * 100).toFixed(0)}% lebih kecil)
                  </p>
                )}
              </div>
            )}

            {isUploading && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">{uploadStatus}</span>
                  <span className="font-semibold text-green-600">{uploadProgress}%</span>
                </div>
                <Progress 
                  value={uploadProgress} 
                  className="h-2 bg-green-100" 
                  indicatorClassName="bg-green-600"
                />
                {uploadProgress > 0 && uploadProgress < 100 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancelUpload}
                    className="w-full text-red-600 border-red-300 hover:bg-red-50"
                  >
                    <X className="w-3 h-3 mr-1" />
                    Batalkan Upload
                  </Button>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsOpen(false);
                setPreviewUrl(null);
                setSelectedFile(null);
              }}
              disabled={isUploading}
            >
              Batal
            </Button>
            {selectedFile && (
              <Button
                onClick={handleUpload}
                className="bg-green-600 hover:bg-green-700"
                disabled={isUploading}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Mengunggah...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Unggah Foto
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
