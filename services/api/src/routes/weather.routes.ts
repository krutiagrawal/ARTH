import { FastifyInstance } from 'fastify';
import { env } from '../config/env';
import { BadRequestError } from '../utils/errors';

interface OwmResponse {
  name: string;
  main: { temp: number };
  weather: { id: number; main: string; description: string; icon: string }[];
  rain?: { '1h'?: number };
  snow?: { '1h'?: number };
}

interface OwmForecastResponse {
  list: {
    dt: number;
    main: { temp: number };
    weather: { id: number; main: string; description: string; icon: string }[];
    pop?: number;
  }[];
}

const FORECAST_STEP_MS = 3 * 60 * 60 * 1000;

export default async function weatherRoutes(fastify: FastifyInstance) {
  // Forecast for a specific moment (a drive's start). OpenWeather's free forecast covers ~5 days in
  // 3-hour steps, so anything further out - or already past - simply reports { available: false }.
  fastify.get<{ Querystring: { lat?: string; lng?: string; at?: string } }>('/forecast', async (request, reply) => {
    const lat = Number(request.query.lat);
    const lng = Number(request.query.lng);
    const at = new Date(request.query.at ?? '').getTime();
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || !Number.isFinite(at)) {
      throw new BadRequestError('lat, lng and at query params are required');
    }
    if (at < Date.now() || at > Date.now() + 5 * 24 * 60 * 60 * 1000) return { available: false };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lng}&units=metric&appid=${env.OWM_API_KEY}`,
        { signal: controller.signal },
      );
      if (!response.ok) return { available: false };

      const data = (await response.json()) as OwmForecastResponse;
      const slot = (data.list ?? []).reduce<OwmForecastResponse['list'][number] | null>(
        (best, s) => (!best || Math.abs(s.dt * 1000 - at) < Math.abs(best.dt * 1000 - at) ? s : best),
        null,
      );
      if (!slot || Math.abs(slot.dt * 1000 - at) > FORECAST_STEP_MS) return { available: false };

      return {
        available: true,
        temperatureCelsius: Math.round(slot.main.temp),
        condition: slot.weather?.[0]?.main ?? 'Clear',
        description: slot.weather?.[0]?.description ?? 'clear sky',
        icon: slot.weather?.[0]?.icon ?? '01d',
        rainChance: Math.round((slot.pop ?? 0) * 100),
      };
    } catch {
      return { available: false };
    } finally {
      clearTimeout(timeout);
    }
  });

  fastify.get<{ Querystring: { lat?: string; lng?: string } }>('/', async (request, reply) => {
    const lat = Number(request.query.lat);
    const lng = Number(request.query.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      throw new BadRequestError('lat and lng query params are required');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&units=metric&appid=${env.OWM_API_KEY}`,
        { signal: controller.signal }
      );

      if (!response.ok) {
        reply.status(502);
        return { error: 'WEATHER_UNAVAILABLE', message: 'Could not fetch weather right now' };
      }

      const data = (await response.json()) as OwmResponse;
      const weatherId = data.weather?.[0]?.id ?? 800;
      // OWM's `id` categorizes the *dominant* condition, which can miss brief/localized rain
      // (especially monsoon-type convective showers) that its own measured-precipitation fields
      // still pick up — treat either signal as rainy.
      const hasMeasuredPrecip = (data.rain?.['1h'] ?? 0) > 0 || (data.snow?.['1h'] ?? 0) > 0;

      reply.send({
        city: data.name || 'Unknown',
        temperatureCelsius: Math.round(data.main.temp),
        condition: data.weather?.[0]?.main ?? 'Clear',
        description: data.weather?.[0]?.description ?? 'clear sky',
        icon: data.weather?.[0]?.icon ?? '01d',
        scene: weatherId < 600 || hasMeasuredPrecip ? 'rainy' : 'sunny',
      });
    } catch {
      reply.status(502);
      return { error: 'WEATHER_UNAVAILABLE', message: 'Could not fetch weather right now' };
    } finally {
      clearTimeout(timeout);
    }
  });
}
