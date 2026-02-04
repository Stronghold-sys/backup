/**
 * Indonesia Regions API Service
 * Complete data for all provinces, regencies, districts, and villages
 * Data source: https://www.emsifa.com/api-wilayah-indonesia
 */

const API_BASE = 'https://www.emsifa.com/api-wilayah-indonesia/api';

export interface Province {
  id: string;
  name: string;
}

export interface Regency {
  id: string;
  province_id: string;
  name: string;
}

export interface District {
  id: string;
  regency_id: string;
  name: string;
}

export interface Village {
  id: string;
  district_id: string;
  name: string;
}

export interface CompleteAddress {
  province: Province | null;
  regency: Regency | null;
  district: District | null;
  village: Village | null;
}

/**
 * Indonesia Regions API
 */
export const indonesiaRegionsAPI = {
  /**
   * Get all provinces (34 provinces)
   */
  async getProvinces(): Promise<Province[]> {
    try {
      const response = await fetch(`${API_BASE}/provinces.json`, {
        cache: 'force-cache' // Cache for performance
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch provinces');
      }
      
      const data = await response.json();
      console.info('✅ Loaded provinces:', data.length);
      return data;
    } catch (error) {
      console.error('❌ Error fetching provinces:', error);
      throw error;
    }
  },

  /**
   * Get regencies/cities by province (514 total)
   */
  async getRegencies(provinceId: string): Promise<Regency[]> {
    try {
      const response = await fetch(`${API_BASE}/regencies/${provinceId}.json`, {
        cache: 'force-cache'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch regencies');
      }
      
      const data = await response.json();
      console.info(`✅ Loaded regencies for province ${provinceId}:`, data.length);
      return data;
    } catch (error) {
      console.error('❌ Error fetching regencies:', error);
      throw error;
    }
  },

  /**
   * Get districts by regency (7000+ total)
   */
  async getDistricts(regencyId: string): Promise<District[]> {
    try {
      const response = await fetch(`${API_BASE}/districts/${regencyId}.json`, {
        cache: 'force-cache'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch districts');
      }
      
      const data = await response.json();
      console.info(`✅ Loaded districts for regency ${regencyId}:`, data.length);
      return data;
    } catch (error) {
      console.error('❌ Error fetching districts:', error);
      throw error;
    }
  },

  /**
   * Get villages by district (83000+ total)
   */
  async getVillages(districtId: string): Promise<Village[]> {
    try {
      const response = await fetch(`${API_BASE}/villages/${districtId}.json`, {
        cache: 'force-cache'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch villages');
      }
      
      const data = await response.json();
      console.info(`✅ Loaded villages for district ${districtId}:`, data.length);
      return data;
    } catch (error) {
      console.error('❌ Error fetching villages:', error);
      throw error;
    }
  }
};

/**
 * Helper: Format full address string
 */
export function formatFullAddress(address: CompleteAddress, streetAddress?: string, postalCode?: string): string {
  const parts: string[] = [];
  
  if (streetAddress) parts.push(streetAddress);
  if (address.village) parts.push(address.village.name);
  if (address.district) parts.push(address.district.name);
  if (address.regency) parts.push(address.regency.name);
  if (address.province) parts.push(address.province.name);
  if (postalCode) parts.push(postalCode);
  
  return parts.join(', ');
}

/**
 * Helper: Validate address completeness
 */
export function isAddressComplete(address: CompleteAddress): boolean {
  return !!(
    address.province &&
    address.regency &&
    address.district
    // Village is optional
  );
}
