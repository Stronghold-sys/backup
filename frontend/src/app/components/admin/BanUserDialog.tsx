import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/app/components/ui/dialog';
import { Button } from '@/app/components/ui/button';
import { Label } from '@/app/components/ui/label';
import { Input } from '@/app/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Textarea } from '@/app/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/app/components/ui/radio-group';
import { User } from '@/lib/store';
import { AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface BanUserDialogProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onBan: (type: 'suspend' | 'ban', reason: string, duration: number, unit: string) => void;
}

export default function BanUserDialog({ isOpen, onClose, user, onBan }: BanUserDialogProps) {
  const [banType, setBanType] = useState<'suspend' | 'ban'>('suspend');
  const [reason, setReason] = useState('');
  const [duration, setDuration] = useState(1);
  const [unit, setUnit] = useState('days');
  const [isPermanent, setIsPermanent] = useState(false);

  const handleSubmit = () => {
    if (!reason.trim()) {
      toast.error('Alasan wajib diisi', {
        description: 'Mohon masukkan alasan suspend/ban terlebih dahulu',
      });
      return;
    }

    const finalUnit = isPermanent ? 'permanent' : unit;
    const finalDuration = isPermanent ? 0 : duration;

    onBan(banType, reason, finalDuration, finalUnit);
    
    // Reset form
    setBanType('suspend');
    setReason('');
    setDuration(1);
    setUnit('days');
    setIsPermanent(false);
  };

  if (!user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            Suspend / Ban Pengguna
          </DialogTitle>
          <DialogDescription>
            Anda akan melarang akses untuk: <strong>{user.name}</strong> ({user.email})
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Ban Type */}
          <div className="space-y-2">
            <Label>Jenis Hukuman</Label>
            <RadioGroup value={banType} onValueChange={(value) => setBanType(value as 'suspend' | 'ban')}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="suspend" id="suspend" />
                <Label htmlFor="suspend" className="font-normal cursor-pointer">
                  <span className="font-semibold text-orange-600">Suspend</span> - Sementara waktu
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="ban" id="ban" />
                <Label htmlFor="ban" className="font-normal cursor-pointer">
                  <span className="font-semibold text-red-600">Ban</span> - Lebih serius / permanen
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">Alasan *</Label>
            <Textarea
              id="reason"
              placeholder="Tuliskan alasan suspend/ban..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-[80px]"
            />
          </div>

          {/* Duration */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Durasi</Label>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="permanent"
                  checked={isPermanent}
                  onChange={(e) => setIsPermanent(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300"
                />
                <Label htmlFor="permanent" className="font-normal cursor-pointer">
                  Permanen
                </Label>
              </div>
            </div>

            {!isPermanent && (
              <div className="flex gap-2">
                <Input
                  type="number"
                  min="1"
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value) || 1)}
                  className="w-24"
                />
                <Select value={unit} onValueChange={setUnit}>
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="seconds">Detik</SelectItem>
                    <SelectItem value="minutes">Menit</SelectItem>
                    <SelectItem value="hours">Jam</SelectItem>
                    <SelectItem value="days">Hari</SelectItem>
                    <SelectItem value="weeks">Minggu</SelectItem>
                    <SelectItem value="months">Bulan</SelectItem>
                    <SelectItem value="years">Tahun</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {isPermanent && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-800">
                  ⚠️ User akan di-{banType} <strong>PERMANEN</strong> dan tidak akan bisa login lagi kecuali admin membatalkan.
                </p>
              </div>
            )}
          </div>

          {/* Preview */}
          {!isPermanent && (
            <div className="p-3 bg-gray-50 border rounded-md">
              <p className="text-sm text-gray-700">
                User akan di-<strong className={banType === 'ban' ? 'text-red-600' : 'text-orange-600'}>{banType}</strong> selama{' '}
                <strong>{duration} {unit === 'seconds' ? 'detik' : unit === 'minutes' ? 'menit' : unit === 'hours' ? 'jam' : unit === 'days' ? 'hari' : unit === 'weeks' ? 'minggu' : unit === 'months' ? 'bulan' : 'tahun'}</strong>
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button 
            onClick={handleSubmit}
            className={banType === 'ban' ? 'bg-red-600 hover:bg-red-700' : 'bg-orange-600 hover:bg-orange-700'}
          >
            {banType === 'ban' ? '🚫 Ban' : '⏸️ Suspend'} Pengguna
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}