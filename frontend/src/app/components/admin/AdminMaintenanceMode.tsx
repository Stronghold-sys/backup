import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Label } from '@/app/components/ui/label';
import { Input } from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';
import { Switch } from '@/app/components/ui/switch';
import { AlertTriangle, CheckCircle, Clock, Calendar, Info } from 'lucide-react';
import { useMaintenanceStore } from '@/lib/maintenanceStore';
import { toast } from 'sonner';
import { Badge } from '@/app/components/ui/badge';

export default function AdminMaintenanceMode() {
  const { maintenance, isLoading, fetchMaintenanceStatus, setMaintenanceMode, isUnderMaintenance } = useMaintenanceStore();
  
  const [enabled, setEnabled] = useState(false);
  const [message, setMessage] = useState('');
  const [duration, setDuration] = useState(2);
  const [scheduled, setScheduled] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');

  // Load initial status
  useEffect(() => {
    fetchMaintenanceStatus();
  }, []);

  // Sync with store
  useEffect(() => {
    setEnabled(maintenance.enabled);
    setMessage(maintenance.message || 'Sistem sedang dalam pemeliharaan. Mohon maaf atas ketidaknyamanannya.');
    setDuration(maintenance.duration || 2);
    
    if (maintenance.startTime && maintenance.endTime) {
      const start = new Date(maintenance.startTime);
      setScheduledDate(start.toISOString().split('T')[0]);
      setScheduledTime(start.toTimeString().slice(0, 5));
      setScheduled(true);
    }
  }, [maintenance]);

  const handleToggle = async (checked: boolean) => {
    try {
      if (checked) {
        // ✅ FIX: When enabling immediate maintenance, FORCE disable scheduled mode
        if (scheduled) {
          setScheduled(false);
          setScheduledDate('');
          setScheduledTime('');
        }
        
        // Immediate maintenance and scheduled maintenance are mutually exclusive
        await setMaintenanceMode(
          true,
          message,
          duration,
          undefined, // ✅ CRITICAL: No scheduled date for immediate maintenance
          undefined  // ✅ CRITICAL: No scheduled time for immediate maintenance
        );
        toast.success('Mode Maintenance Diaktifkan', {
          description: 'Aktif SEKARANG - Semua transaksi user diblokir',
        });
      } else {
        // Disable maintenance
        await setMaintenanceMode(false);
        toast.success('Mode Maintenance Dinonaktifkan', {
          description: 'User dapat bertransaksi kembali',
        });
      }
    } catch (error: any) {
      toast.error('Gagal mengubah mode maintenance', {
        description: error.message,
      });
    }
  };

  const handleSaveSettings = async () => {
    try {
      // ✅ FIX: Validate scheduled settings before saving
      if (scheduled && (!scheduledDate || !scheduledTime)) {
        toast.error('Lengkapi tanggal dan waktu untuk maintenance terjadwal');
        return;
      }
      
      await setMaintenanceMode(
        enabled,
        message,
        duration,
        scheduled ? scheduledDate : undefined,
        scheduled ? scheduledTime : undefined
      );
      toast.success('Pengaturan Maintenance Disimpan', {
        description: scheduled 
          ? `Terjadwal pada ${scheduledDate} ${scheduledTime}` 
          : enabled ? 'Aktif sekarang' : 'Nonaktif',
      });
    } catch (error: any) {
      toast.error('Gagal menyimpan pengaturan', {
        description: error.message,
      });
    }
  };

  const handleScheduledToggle = (checked: boolean) => {
    // ✅ FIX: When enabling scheduled mode, FORCE disable immediate mode
    if (checked && enabled) {
      setEnabled(false);
      // Also disable on backend
      setMaintenanceMode(false).then(() => {
        setScheduled(true);
        toast.info('Mode Maintenance Immediate Dinonaktifkan', {
          description: 'Mode terjadwal sekarang dapat digunakan',
          duration: 3000,
        });
      }).catch((error) => {
        toast.error('Gagal menonaktifkan mode immediate', {
          description: error.message,
        });
      });
    } else {
      setScheduled(checked);
    }
  };

  const isActive = isUnderMaintenance();

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <Card className={isActive ? 'border-red-500 bg-red-50' : 'border-green-500 bg-green-50'}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isActive ? (
                <AlertTriangle className="w-8 h-8 text-red-600" />
              ) : (
                <CheckCircle className="w-8 h-8 text-green-600" />
              )}
              <div>
                <CardTitle className={isActive ? 'text-red-900' : 'text-green-900'}>
                  Status Sistem: {isActive ? 'Maintenance Mode' : 'Normal'}
                </CardTitle>
                <CardDescription className={isActive ? 'text-red-700' : 'text-green-700'}>
                  {isActive 
                    ? 'Transaksi user saat ini DIBLOKIR' 
                    : 'Sistem berjalan normal, user dapat bertransaksi'}
                </CardDescription>
              </div>
            </div>
            <Badge variant={isActive ? 'destructive' : 'default'} className="text-lg px-4 py-2">
              {isActive ? 'AKTIF' : 'NONAKTIF'}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Main Control Card */}
      <Card>
        <CardHeader>
          <CardTitle>Mode Maintenance</CardTitle>
          <CardDescription>
            Aktifkan untuk memblokir semua transaksi user (checkout, pembayaran, order)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Toggle Switch */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              <div>
                <Label className="text-base font-semibold">Aktifkan Mode Maintenance</Label>
                <p className="text-sm text-gray-600">Blokir semua aktivitas transaksi user SEKARANG</p>
              </div>
            </div>
            <Switch
              checked={enabled}
              onCheckedChange={handleToggle}
              disabled={isLoading}
            />
          </div>

          {/* ✅ Info when scheduled is active */}
          {scheduled && !enabled && (
            <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200 -mt-4">
              <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-blue-800">
                Mode terjadwal aktif. Mode immediate akan menonaktifkan mode terjadwal jika diaktifkan.
              </p>
            </div>
          )}

          {/* Message Input */}
          <div className="space-y-2">
            <Label htmlFor="message">Pesan untuk User</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Contoh: Sistem sedang dalam pemeliharaan terjadwal. Estimasi selesai: 2 jam."
              rows={3}
              disabled={isLoading}
            />
            <p className="text-xs text-gray-500">
              Pesan ini akan ditampilkan kepada user yang mencoba bertransaksi
            </p>
          </div>

          {/* Duration */}
          <div className="space-y-2">
            <Label htmlFor="duration" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Estimasi Durasi (jam)
            </Label>
            <Input
              id="duration"
              type="number"
              min="0.5"
              step="0.5"
              value={duration}
              onChange={(e) => setDuration(parseFloat(e.target.value))}
              disabled={isLoading}
            />
          </div>

          {/* Scheduled Maintenance */}
          <div className="space-y-4 p-4 border rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-blue-600" />
                <div>
                  <Label className="text-base">Jadwalkan Maintenance</Label>
                  <p className="text-sm text-gray-600">Atur waktu mulai otomatis</p>
                </div>
              </div>
              <Switch
                checked={scheduled}
                onCheckedChange={handleScheduledToggle}
                disabled={isLoading}
              />
            </div>

            {/* ✅ Info when immediate maintenance is active */}
            {enabled && !scheduled && (
              <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-blue-800">
                  Mode immediate aktif. Mode terjadwal akan menonaktifkan mode immediate jika diaktifkan.
                </p>
              </div>
            )}

            {/* ✅ Warning when both enabled and scheduled are ON */}
            {enabled && scheduled && (
              <div className="flex items-start gap-2 p-3 bg-orange-50 rounded-lg border border-orange-200">
                <AlertTriangle className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-orange-800">
                  <span className="font-semibold">Peringatan:</span> Mode Immediate dan Mode Terjadwal tidak dapat aktif bersamaan. 
                  Salah satu akan dinonaktifkan otomatis.
                </p>
              </div>
            )}

            {scheduled && (
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="date">Tanggal</Label>
                  <Input
                    id="date"
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="time">Waktu</Label>
                  <Input
                    id="time"
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Info Box */}
          <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="space-y-2 text-sm">
              <p className="font-semibold text-blue-900">Yang Akan Diblokir:</p>
              <ul className="list-disc list-inside text-blue-800 space-y-1">
                <li>Proses checkout di keranjang</li>
                <li>Pembuatan order baru</li>
                <li>Upload bukti pembayaran</li>
                <li>Pembaruan status pembayaran</li>
              </ul>
              <p className="font-semibold text-blue-900 mt-3">Yang Masih Bisa Diakses:</p>
              <ul className="list-disc list-inside text-blue-800 space-y-1">
                <li>Browse produk (tanpa add to cart)</li>
                <li>Lihat order yang sudah ada</li>
                <li>Chat dengan seller (read-only)</li>
              </ul>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleSaveSettings}
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading ? 'Menyimpan...' : 'Simpan Pengaturan'}
            </Button>
            <Button
              variant="outline"
              onClick={() => fetchMaintenanceStatus()}
              disabled={isLoading}
            >
              Refresh Status
            </Button>
          </div>

          {/* Current Status Info */}
          {maintenance.startTime && maintenance.endTime && (
            <div className="p-4 bg-gray-50 rounded-lg border space-y-2 text-sm">
              <p className="font-semibold">Jadwal Maintenance:</p>
              <p>Mulai: <span className="font-mono">{new Date(maintenance.startTime).toLocaleString('id-ID')}</span></p>
              <p>Selesai: <span className="font-mono">{new Date(maintenance.endTime).toLocaleString('id-ID')}</span></p>
              <p>Durasi: <span className="font-semibold">{maintenance.duration} jam</span></p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}