import { useState, useEffect } from 'react';
import { MapPin, User, Phone, Home, Building, Tag } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Checkbox } from '@/app/components/ui/checkbox';
import { Address } from '@/lib/store';
import { toast } from 'sonner';
import { indonesiaRegionsAPI, Province, Regency, District, Village } from '@/lib/indonesiaRegions';

interface AddAddressFormProps {
  onSave: (address: Address) => void;
  onCancel: () => void;
}

const labelOptions = [
  { value: 'home', label: 'Rumah', icon: Home },
  { value: 'office', label: 'Kantor', icon: Building },
];

export default function AddAddressForm({ onSave, onCancel }: AddAddressFormProps) {
  // ✅ Indonesia regions state
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [regencies, setRegencies] = useState<Regency[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [villages, setVillages] = useState<Village[]>([]);
  
  // ✅ Loading states
  const [loadingProvinces, setLoadingProvinces] = useState(true);
  const [loadingRegencies, setLoadingRegencies] = useState(false);
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [loadingVillages, setLoadingVillages] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    addressLabel: 'home',
    address: '',
    provinceId: '',
    provinceName: '',
    regencyId: '',
    regencyName: '',
    districtId: '',
    districtName: '',
    villageId: '',
    villageName: '',
    postalCode: '',
    isDefault: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // ✅ Load provinces on mount
  useEffect(() => {
    loadProvinces();
  }, []);

  const loadProvinces = async () => {
    try {
      setLoadingProvinces(true);
      const data = await indonesiaRegionsAPI.getProvinces();
      setProvinces(data);
      console.info('✅ Loaded provinces:', data.length);
    } catch (error) {
      console.error('❌ Error loading provinces:', error);
      toast.error('Gagal memuat data provinsi');
    } finally {
      setLoadingProvinces(false);
    }
  };

  // ✅ Handle province change
  const handleProvinceChange = async (provinceId: string) => {
    const selectedProvince = provinces.find(p => p.id === provinceId);
    
    setFormData({ 
      ...formData, 
      provinceId,
      provinceName: selectedProvince?.name || '',
      regencyId: '',
      regencyName: '',
      districtId: '',
      districtName: '',
      villageId: '',
      villageName: ''
    });
    
    setRegencies([]);
    setDistricts([]);
    setVillages([]);
    
    if (provinceId) {
      try {
        setLoadingRegencies(true);
        const data = await indonesiaRegionsAPI.getRegencies(provinceId);
        setRegencies(data);
        console.info('✅ Loaded regencies:', data.length);
      } catch (error) {
        console.error('❌ Error loading regencies:', error);
        toast.error('Gagal memuat data kabupaten/kota');
      } finally {
        setLoadingRegencies(false);
      }
    }
  };

  // ✅ Handle regency change
  const handleRegencyChange = async (regencyId: string) => {
    const selectedRegency = regencies.find(r => r.id === regencyId);
    
    setFormData({ 
      ...formData, 
      regencyId,
      regencyName: selectedRegency?.name || '',
      districtId: '',
      districtName: '',
      villageId: '',
      villageName: ''
    });
    
    setDistricts([]);
    setVillages([]);
    
    if (regencyId) {
      try {
        setLoadingDistricts(true);
        const data = await indonesiaRegionsAPI.getDistricts(regencyId);
        setDistricts(data);
        console.info('✅ Loaded districts:', data.length);
      } catch (error) {
        console.error('❌ Error loading districts:', error);
        toast.error('Gagal memuat data kecamatan');
      } finally {
        setLoadingDistricts(false);
      }
    }
  };

  // ✅ Handle district change
  const handleDistrictChange = async (districtId: string) => {
    const selectedDistrict = districts.find(d => d.id === districtId);
    
    setFormData({ 
      ...formData, 
      districtId,
      districtName: selectedDistrict?.name || '',
      villageId: '',
      villageName: ''
    });
    
    setVillages([]);
    
    if (districtId) {
      try {
        setLoadingVillages(true);
        const data = await indonesiaRegionsAPI.getVillages(districtId);
        setVillages(data);
        console.info('✅ Loaded villages:', data.length);
      } catch (error) {
        console.error('❌ Error loading villages:', error);
        toast.error('Gagal memuat data kelurahan/desa');
      } finally {
        setLoadingVillages(false);
      }
    }
  };

  // ✅ Handle village change
  const handleVillageChange = (villageId: string) => {
    const selectedVillage = villages.find(v => v.id === villageId);
    
    setFormData({ 
      ...formData, 
      villageId,
      villageName: selectedVillage?.name || ''
    });
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Nama penerima wajib diisi';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Nomor telepon wajib diisi';
    } else if (!/^(\+62|62|0)[0-9]{9,12}$/.test(formData.phone.replace(/\s/g, ''))) {
      newErrors.phone = 'Format nomor telepon tidak valid';
    }

    if (!formData.address.trim()) {
      newErrors.address = 'Alamat lengkap wajib diisi';
    } else if (formData.address.trim().length < 10) {
      newErrors.address = 'Alamat terlalu pendek (minimal 10 karakter)';
    }

    if (!formData.provinceId) {
      newErrors.provinceId = 'Provinsi wajib dipilih';
    }

    if (!formData.regencyId) {
      newErrors.regencyId = 'Kota wajib dipilih';
    }

    if (!formData.districtName.trim()) {
      newErrors.districtName = 'Kecamatan wajib diisi';
    }

    if (!formData.postalCode.trim()) {
      newErrors.postalCode = 'Kode pos wajib diisi';
    } else if (!/^[0-9]{5}$/.test(formData.postalCode)) {
      newErrors.postalCode = 'Kode pos harus 5 digit angka';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Mohon lengkapi semua field yang wajib diisi');
      return;
    }

    const newAddress: Address = {
      id: `addr-${Date.now()}`,
      name: formData.name.trim(),
      phone: formData.phone.trim(),
      address: `${formData.address.trim()}${formData.villageName ? ', ' + formData.villageName : ''}, ${formData.districtName}`,
      city: formData.regencyName,
      province: formData.provinceName,
      postalCode: formData.postalCode.trim(),
      isDefault: formData.isDefault,
      label: formData.addressLabel,
    };

    onSave(newAddress);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Contact Information */}
      <div className="space-y-4">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <User className="w-5 h-5 text-green-600" />
          Kontak
        </h3>

        <div className="space-y-2">
          <Label htmlFor="name" className="text-sm font-medium">
            Nama Penerima <span className="text-red-500">*</span>
          </Label>
          <Input
            id="name"
            placeholder="Masukkan nama lengkap penerima"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className={errors.name ? 'border-red-500' : ''}
          />
          {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone" className="text-sm font-medium">
            Nomor Telepon <span className="text-red-500">*</span>
          </Label>
          <Input
            id="phone"
            type="tel"
            placeholder="contoh: 081234567890"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className={errors.phone ? 'border-red-500' : ''}
          />
          {errors.phone && <p className="text-xs text-red-500">{errors.phone}</p>}
        </div>
      </div>

      {/* Address Label */}
      <div className="space-y-2">
        <Label className="text-sm font-medium flex items-center gap-2">
          <Tag className="w-4 h-4 text-green-600" />
          Label Alamat
        </Label>
        <div className="flex gap-3">
          {labelOptions.map((option) => {
            const Icon = option.icon;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setFormData({ ...formData, addressLabel: option.value })}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 rounded-lg transition-all ${
                  formData.addressLabel === option.value
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-200 hover:border-green-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="font-medium">{option.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Address Details */}
      <div className="space-y-4">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <MapPin className="w-5 h-5 text-green-600" />
          Detail Alamat
        </h3>

        <div className="space-y-2">
          <Label htmlFor="address" className="text-sm font-medium">
            Alamat Lengkap <span className="text-red-500">*</span>
          </Label>
          <Textarea
            id="address"
            placeholder="Nama jalan, gedung, no. rumah"
            rows={3}
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            className={errors.address ? 'border-red-500' : ''}
          />
          {errors.address && <p className="text-xs text-red-500">{errors.address}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="provinceId" className="text-sm font-medium">
              Provinsi <span className="text-red-500">*</span>
            </Label>
            <select
              id="provinceId"
              value={formData.provinceId}
              onChange={(e) => handleProvinceChange(e.target.value)}
              className={`w-full px-3 py-2 border rounded-md bg-white ${
                errors.provinceId ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="">Pilih Provinsi</option>
              {provinces.map((prov) => (
                <option key={prov.id} value={prov.id}>
                  {prov.name}
                </option>
              ))}
            </select>
            {errors.provinceId && <p className="text-xs text-red-500">{errors.provinceId}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="regencyId" className="text-sm font-medium">
              Kota/Kabupaten <span className="text-red-500">*</span>
            </Label>
            <select
              id="regencyId"
              value={formData.regencyId}
              onChange={(e) => handleRegencyChange(e.target.value)}
              disabled={!formData.provinceId}
              className={`w-full px-3 py-2 border rounded-md bg-white disabled:bg-gray-100 ${
                errors.regencyId ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="">Pilih Kota</option>
              {regencies.map((regency) => (
                <option key={regency.id} value={regency.id}>
                  {regency.name}
                </option>
              ))}
            </select>
            {errors.regencyId && <p className="text-xs text-red-500">{errors.regencyId}</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="districtId" className="text-sm font-medium">
              Kecamatan <span className="text-red-500">*</span>
            </Label>
            <select
              id="districtId"
              value={formData.districtId}
              onChange={(e) => handleDistrictChange(e.target.value)}
              disabled={!formData.regencyId || loadingDistricts}
              className={`w-full px-3 py-2 border rounded-md bg-white disabled:bg-gray-100 ${
                errors.districtName ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="">
                {loadingDistricts ? 'Memuat kecamatan...' : 'Pilih Kecamatan'}
              </option>
              {districts.map((district) => (
                <option key={district.id} value={district.id}>
                  {district.name}
                </option>
              ))}
            </select>
            {errors.districtName && <p className="text-xs text-red-500">{errors.districtName}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="villageId" className="text-sm font-medium">
              Kelurahan/Desa (Opsional)
            </Label>
            <select
              id="villageId"
              value={formData.villageId}
              onChange={(e) => handleVillageChange(e.target.value)}
              disabled={!formData.districtId || loadingVillages}
              className={`w-full px-3 py-2 border rounded-md bg-white disabled:bg-gray-100 ${
                errors.villageId ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="">
                {loadingVillages ? 'Memuat kelurahan...' : 'Pilih Kelurahan/Desa'}
              </option>
              {villages.map((village) => (
                <option key={village.id} value={village.id}>
                  {village.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="postalCode" className="text-sm font-medium">
            Kode Pos <span className="text-red-500">*</span>
          </Label>
          <Input
            id="postalCode"
            type="text"
            maxLength={5}
            placeholder="contoh: 12345"
            value={formData.postalCode}
            onChange={(e) => setFormData({ ...formData, postalCode: e.target.value.replace(/\D/g, '') })}
            className={errors.postalCode ? 'border-red-500' : ''}
          />
          {errors.postalCode && <p className="text-xs text-red-500">{errors.postalCode}</p>}
        </div>
      </div>

      {/* Default Address Checkbox */}
      <div className="flex items-center space-x-2 p-4 bg-gray-50 rounded-lg">
        <Checkbox
          id="isDefault"
          checked={formData.isDefault}
          onCheckedChange={(checked) => setFormData({ ...formData, isDefault: checked as boolean })}
        />
        <Label
          htmlFor="isDefault"
          className="text-sm font-medium cursor-pointer flex-1"
        >
          Jadikan sebagai alamat utama
        </Label>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="flex-1"
        >
          Batal
        </Button>
        <Button
          type="submit"
          className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
        >
          Simpan Alamat
        </Button>
      </div>
    </form>
  );
}