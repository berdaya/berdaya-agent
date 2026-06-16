import type { ModelOptionsResponse } from '@/types/hermes'

/** Only these inference providers are shown in the Berdaya desktop app. */
export const ALLOWED_DESKTOP_PROVIDER_IDS = new Set(['berdaya-cloud', 'berdaya-local'])

export function filterDesktopOAuthProviders<T extends { id: string }>(providers: readonly T[]): T[] {
  return providers.filter(provider => ALLOWED_DESKTOP_PROVIDER_IDS.has(provider.id))
}

export function filterDesktopModelProviders<T extends { slug: string }>(providers: readonly T[]): T[] {
  return providers.filter(provider => ALLOWED_DESKTOP_PROVIDER_IDS.has(provider.slug))
}

export function filterDesktopModelOptions(options: ModelOptionsResponse): ModelOptionsResponse {
  if (!options.providers?.length) {
    return options
  }

  return {
    ...options,
    providers: filterDesktopModelProviders(options.providers)
  }
}
