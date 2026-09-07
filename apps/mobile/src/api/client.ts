import { File } from 'expo-file-system';
import {
  getAccessToken,
  setAccessToken,
  getRefreshToken,
  setRefreshToken,
  clearTokens,
} from './tokenStorage';

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000';

/**
 * Wraps a device photo URI (from ImagePicker etc.) for `FormData.append`. Expo SDK 57 / RN's
 * New Architecture FormData bridge rejects the old `{uri, name, type}` object-literal trick
 * with "Unsupported FormDataPart implementation" on Android — it now requires a real Blob-like
 * part. `expo-file-system`'s `File` genuinely implements Blob, so it round-trips correctly.
 * Pass the returned value as `form.append(fieldName, toFormFile(uri), filename)`.
 */
export function toFormFile(uri: string): File {
  return new File(uri);
}

/**
 * Resolves a stored media path to an absolute URL the app can actually render.
 *
 * The API returns host-relative paths (`/uploads/drives/abc.jpg` — see the API's
 * `upload.service.ts`), and React Native's `<Image>` cannot resolve those: it renders nothing at
 * all, with no error, which is exactly how NGO drive thumbnails went missing. Every `<Image>`
 * whose URI came from the server must go through this.
 */
export function resolveMediaUrl(path: string | null | undefined): string | undefined {
  if (!path) return undefined;
  // Already-absolute URIs pass through untouched — including the `file://`/`content://` ones a
  // freshly picked local photo carries, which prefixing would silently corrupt.
  if (/^[a-z][a-z0-9+.-]*:/i.test(path)) return path;
  return `${API_URL}${path}`;
}

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

type UnauthorizedHandler = () => void;
let onUnauthorized: UnauthorizedHandler | null = null;

export function setUnauthorizedHandler(handler: UnauthorizedHandler | null) {
  onUnauthorized = handler;
}

let refreshPromise: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const refreshToken = await getRefreshToken();
    if (!refreshToken) return false;

    try {
      const res = await fetch(`${API_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) return false;

      const data = await res.json();
      await setAccessToken(data.accessToken);
      await setRefreshToken(data.refreshToken);
      return true;
    } catch {
      return false;
    }
  })();

  const result = await refreshPromise;
  refreshPromise = null;
  return result;
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  auth?: boolean;
  isForm?: boolean;
}

export async function apiFetch<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
  const { auth = true, isForm = false, body, headers, ...rest } = options;

  const doFetch = async (): Promise<Response> => {
    const finalHeaders: Record<string, string> = { Accept: 'application/json', ...(headers as Record<string, string>) };

    if (!isForm && body !== undefined) {
      finalHeaders['Content-Type'] = 'application/json';
    }

    if (auth) {
      const token = await getAccessToken();
      if (token) finalHeaders.Authorization = `Bearer ${token}`;
    }

    return fetch(`${API_URL}${path}`, {
      ...rest,
      headers: finalHeaders,
      body: isForm ? (body as FormData) : body !== undefined ? JSON.stringify(body) : undefined,
    });
  };

  let response = await doFetch();

  if (response.status === 401 && auth && !path.startsWith('/api/auth/')) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      response = await doFetch();
    } else {
      await clearTokens();
      onUnauthorized?.();
      throw new ApiError(401, 'Session expired');
    }
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get('content-type') ?? '';
  const data = contentType.includes('application/json') ? await response.json() : await response.text();

  if (!response.ok) {
    const message = typeof data === 'object' && data && 'message' in data ? String((data as any).message) : 'Request failed';
    const code = typeof data === 'object' && data && 'error' in data ? String((data as any).error) : undefined;
    throw new ApiError(response.status, message, code);
  }

  return data as T;
}
