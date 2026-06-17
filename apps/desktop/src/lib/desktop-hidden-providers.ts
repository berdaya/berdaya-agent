import type { ModelOptionsResponse } from '@/types/hermes'

/** Only these inference providers are shown in the Berdaya desktop app. */
export const ALLOWED_DESKTOP_PROVIDER_IDS = new Set(['berdaya-cloud', 'berdaya-local'])

/** Curated first-run / onboarding choices — always shown even if the backend
 *  catalog is still warming up after install. */
export const BERDAYA_ONBOARDING_API_KEY_OPTIONS = [
  {
    id: 'berdaya-cloud',
    name: 'Berdaya Cloud',
    envKey: 'BERDAYA_API_KEY',
    docsUrl: 'https://berdaya.ai/keys',
    short: 'Managed cloud inference',
    description: 'Production models via api.berdaya.ai — paste your Berdaya API key.'
  },
  {
    id: 'berdaya-local',
    name: 'Berdaya Local',
    envKey: 'BERDAYA_API_KEY',
    docsUrl: 'https://berdaya.ai/keys',
    short: 'Local dev server',
    description: 'Connect to a Berdaya API server on this machine (127.0.0.1:8000).'
  }
] as const

export type BerdayaOnboardingApiKeyOption = (typeof BERDAYA_ONBOARDING_API_KEY_OPTIONS)[number]

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
