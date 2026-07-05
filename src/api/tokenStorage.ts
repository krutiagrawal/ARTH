import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

const ACCESS_TOKEN_KEY = 'plant_access_token';
const REFRESH_TOKEN_KEY = 'plant_refresh_token';

let accessTokenCache: string | null = null;

export async function getAccessToken(): Promise<string | null> {
  if (accessTokenCache) return accessTokenCache;
  accessTokenCache = await AsyncStorage.getItem(ACCESS_TOKEN_KEY);
  return accessTokenCache;
}

export async function setAccessToken(token: string | null): Promise<void> {
  accessTokenCache = token;
  if (token) {
    await AsyncStorage.setItem(ACCESS_TOKEN_KEY, token);
  } else {
    await AsyncStorage.removeItem(ACCESS_TOKEN_KEY);
  }
}

export async function getRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

export async function setRefreshToken(token: string | null): Promise<void> {
  if (token) {
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
  } else {
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  }
}

export async function clearTokens(): Promise<void> {
  await setAccessToken(null);
  await setRefreshToken(null);
}
