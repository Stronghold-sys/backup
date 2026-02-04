import { Link } from 'react-router';
import { Facebook, Instagram, Twitter, Youtube, Mail, Phone, MapPin } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-gradient-to-br from-orange-50 via-pink-50 to-orange-100 text-gray-700 border-t border-orange-200"> {/* Changed from bg-gray-900 text-gray-300 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Company Info */}
          <div>
            <h3 className="bg-gradient-to-r from-orange-600 to-pink-600 bg-clip-text text-transparent text-lg font-bold mb-4">TokoKita</h3> {/* Changed */}
            <p className="text-sm mb-4">
              Marketplace terpercaya untuk belanja online dengan jutaan produk pilihan dan pengiriman ke seluruh Indonesia.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-orange-600 hover:text-pink-600 transition"> {/* Changed */}
                <Facebook className="w-5 h-5" />
              </a>
              <a href="#" className="text-orange-600 hover:text-pink-600 transition"> {/* Changed */}
                <Instagram className="w-5 h-5" />
              </a>
              <a href="#" className="text-orange-600 hover:text-pink-600 transition"> {/* Changed */}
                <Twitter className="w-5 h-5" />
              </a>
              <a href="#" className="text-orange-600 hover:text-pink-600 transition"> {/* Changed */}
                <Youtube className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="bg-gradient-to-r from-orange-600 to-pink-600 bg-clip-text text-transparent text-lg font-bold mb-4">Belanja</h3> {/* Changed */}
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/products?category=elektronik" className="hover:text-orange-600 transition"> {/* Changed */}
                  Elektronik
                </Link>
              </li>
              <li>
                <Link to="/products?category=fashion" className="hover:text-orange-600 transition"> {/* Changed */}
                  Fashion
                </Link>
              </li>
              <li>
                <Link to="/products?category=rumah-tangga" className="hover:text-orange-600 transition"> {/* Changed */}
                  Rumah Tangga
                </Link>
              </li>
              <li>
                <Link to="/products?category=olahraga" className="hover:text-orange-600 transition"> {/* Changed */}
                  Olahraga
                </Link>
              </li>
            </ul>
          </div>

          {/* Customer Service */}
          <div>
            <h3 className="bg-gradient-to-r from-orange-600 to-pink-600 bg-clip-text text-transparent text-lg font-bold mb-4">Layanan</h3> {/* Changed */}
            <ul className="space-y-2 text-sm">
              <li>
                <a href="#" className="hover:text-orange-600 transition"> {/* Changed */}
                  Pusat Bantuan
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-orange-600 transition"> {/* Changed */}
                  Cara Berbelanja
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-orange-600 transition"> {/* Changed */}
                  Kebijakan Pengembalian
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-orange-600 transition"> {/* Changed */}
                  Syarat & Ketentuan
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-orange-600 transition"> {/* Changed */}
                  Kebijakan Privasi
                </a>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="bg-gradient-to-r from-orange-600 to-pink-600 bg-clip-text text-transparent text-lg font-bold mb-4">Hubungi Kami</h3> {/* Changed */}
            <ul className="space-y-3 text-sm">
              <li className="flex items-start">
                <Mail className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
                <span>support@tokokita.com</span>
              </li>
              <li className="flex items-start">
                <Phone className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
                <span>0800-1234-5678</span>
              </li>
              <li className="flex items-start">
                <MapPin className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
                <span>Jakarta, Indonesia</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-orange-300 mt-8 pt-8 text-center text-sm"> {/* Changed from border-gray-800 */}
          <p>&copy; {new Date().getFullYear()} TokoKita. Semua hak dilindungi.</p>
        </div>
      </div>
    </footer>
  );
}