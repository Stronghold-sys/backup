import { useState, useEffect } from 'react';
import { X, MapPin, Check, Plus } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/app/components/ui/dialog';
import { Address, User } from '@/lib/store';
import AddAddressForm from './AddAddressForm';

interface AddressModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  selectedAddress: Address | null;
  onSelectAddress: (address: Address) => void;
  onAddAddress: (address: Address) => void;
}

// Component declaration
function AddressModal({
  isOpen,
  onClose,
  user,
  selectedAddress,
  onSelectAddress,
  onAddAddress,
}: AddressModalProps) {
  const [selected, setSelected] = useState<string | null>(selectedAddress?.id || null);
  const [showAddForm, setShowAddForm] = useState(false);
  const addresses = user?.addresses || [];

  useEffect(() => {
    setSelected(selectedAddress?.id || null);
  }, [selectedAddress]);

  useEffect(() => {
    // Show add form automatically if no addresses
    if (addresses.length === 0 && isOpen) {
      setShowAddForm(true);
    } else {
      setShowAddForm(false);
    }
  }, [addresses.length, isOpen]);

  const handleSelect = (address: Address) => {
    setSelected(address.id);
    onSelectAddress(address);
    onClose();
  };

  const handleSaveAddress = (address: Address) => {
    console.info('📍 [AddressModal] Saving address:', address);
    onAddAddress(address);
    setShowAddForm(false);
    // ✅ FIX: Don't call handleSelect immediately - let parent component handle selection
    // The address needs to be saved to backend and user.addresses first
    // handleSelect(address); // ❌ REMOVED - causes race condition
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-gray-900">
            {showAddForm ? 'Tambah Alamat Baru' : 'Pilih Alamat Pengiriman'}
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-500">
            {showAddForm 
              ? 'Lengkapi informasi alamat pengiriman Anda.' 
              : 'Pilih alamat pengiriman yang tepat untuk pesanan Anda.'}
          </DialogDescription>
        </DialogHeader>

        {showAddForm ? (
          <AddAddressForm
            onSave={handleSaveAddress}
            onCancel={() => {
              if (addresses.length === 0) {
                onClose();
              } else {
                setShowAddForm(false);
              }
            }}
          />
        ) : (
          <>
            <div className="space-y-3 mt-4">
              {addresses.length === 0 ? (
                <div className="text-center py-8">
                  <MapPin className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">Belum ada alamat tersimpan</p>
                  <Button
                    onClick={() => setShowAddForm(true)}
                    className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Tambah Alamat Baru
                  </Button>
                </div>
              ) : (
                addresses.map((address) => (
                  <div
                    key={address.id}
                    onClick={() => handleSelect(address)}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all hover:border-green-300 ${
                      selected === address.id
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <p className="font-semibold text-gray-900">{address.name}</p>
                          {address.isDefault && (
                            <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full font-medium">
                              Utama
                            </span>
                          )}
                          {address.label && (
                            <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded-full font-medium capitalize">
                              {address.label === 'home' ? 'Rumah' : 'Kantor'}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-1">{address.phone}</p>
                        <p className="text-sm text-gray-600">{address.address}</p>
                        <p className="text-sm text-gray-600">
                          {address.city}, {address.province} {address.postalCode}
                        </p>
                      </div>
                      {selected === address.id && (
                        <div className="ml-4">
                          <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                            <Check className="w-4 h-4 text-white" />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {addresses.length > 0 && (
              <div className="flex gap-3 mt-6 pt-4 border-t">
                <Button
                  onClick={onClose}
                  variant="outline"
                  className="flex-1"
                >
                  Batal
                </Button>
                <Button
                  onClick={() => setShowAddForm(true)}
                  className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Tambah Alamat
                </Button>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ✅ Dual export pattern - supports both import styles
export default AddressModal;
export { AddressModal };