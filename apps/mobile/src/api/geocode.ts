import { apiFetch } from './client';

export interface ApiAddressSuggestion {
  label: string;
  lat: number;
  lng: number;
  city: string | null;
}

export async function searchAddress(
  query: string,
  near?: { lat: number; lng: number },
): Promise<ApiAddressSuggestion[]> {
  const bias = near ? `&lat=${near.lat}&lng=${near.lng}` : '';
  return apiFetch<ApiAddressSuggestion[]>(`/api/geocode/search?q=${encodeURIComponent(query)}${bias}`);
}

export interface ApiPincodeCheck {
  status: 'match' | 'mismatch' | 'unverified';
  actual?: string;
}

/** Does this pincode actually belong to the place at lat/lng? */
export async function verifyPincode(lat: number, lng: number, pincode: string): Promise<ApiPincodeCheck> {
  return apiFetch<ApiPincodeCheck>(`/api/geocode/verify-pincode?lat=${lat}&lng=${lng}&pincode=${encodeURIComponent(pincode)}`);
}

export async function reverseGeocode(lat: number, lng: number): Promise<ApiAddressSuggestion | null> {
  return apiFetch<ApiAddressSuggestion | null>(`/api/geocode/reverse?lat=${lat}&lng=${lng}`);
}
