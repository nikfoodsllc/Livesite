/**
 * Which NikFoods app sent a request. The iPhone and Android apps add `x-nikfoods-client: ios | android`; the website sends none.
 * Both apps count as the same order source ("App", channel 'mobile'); `appPlatform` tells them apart for the admin.
 */
export type AppPlatform = 'ios' | 'android';

export function appPlatformOf(headers: Pick<Headers, 'get'>): AppPlatform | null {
  const v = (headers.get('x-nikfoods-client') || '').trim().toLowerCase();
  return v === 'ios' || v === 'android' ? v : null;
}

export function channelOf(headers: Pick<Headers, 'get'>): 'web' | 'mobile' {
  return appPlatformOf(headers) ? 'mobile' : 'web';
}

/** A phone type sent in a body ('ios' / 'android'); anything else is treated as the iPhone app (older iPhone builds send nothing). */
export function cleanPlatform(value: unknown): AppPlatform {
  return String(value ?? '').trim().toLowerCase() === 'android' ? 'android' : 'ios';
}
