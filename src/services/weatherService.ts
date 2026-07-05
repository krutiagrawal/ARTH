import * as Location from 'expo-location';
import { fetchWeather } from '../api/weather';

export type WeatherScene = 'sunny' | 'rainy';

export async function getWeatherScene(): Promise<WeatherScene> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return 'sunny';

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Low,
    });

    const weather = await fetchWeather(location.coords.latitude, location.coords.longitude);
    return weather.scene;
  } catch {
    return 'sunny';
  }
}
