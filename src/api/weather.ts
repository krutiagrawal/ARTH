import { apiFetch } from './client';

export interface ApiWeather {
  city: string;
  temperatureCelsius: number;
  condition: string;
  description: string;
  icon: string;
  scene: 'sunny' | 'rainy';
}

export async function fetchWeather(lat: number, lng: number): Promise<ApiWeather> {
  return apiFetch<ApiWeather>(`/api/weather?lat=${lat}&lng=${lng}`, { auth: false });
}
