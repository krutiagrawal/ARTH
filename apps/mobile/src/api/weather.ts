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

export interface ApiDriveForecast {
  available: boolean;
  temperatureCelsius?: number;
  condition?: string;
  description?: string;
  icon?: string;
  rainChance?: number;
}

/** Forecast for a drive's start time; `available: false` when it is past the ~5-day forecast window. */
export async function fetchDriveForecast(lat: number, lng: number, atIso: string): Promise<ApiDriveForecast> {
  return apiFetch<ApiDriveForecast>(`/api/weather/forecast?lat=${lat}&lng=${lng}&at=${encodeURIComponent(atIso)}`, { auth: false });
}
