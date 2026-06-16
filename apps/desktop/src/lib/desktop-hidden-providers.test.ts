import { describe, expect, it } from 'vitest'

import {
  filterDesktopModelOptions,
  filterDesktopModelProviders,
  filterDesktopOAuthProviders
} from './desktop-hidden-providers'

describe('desktop-hidden-providers', () => {
  it('only allows Berdaya Cloud and Berdaya Local in OAuth provider lists', () => {
    const providers = [
      { id: 'nous', name: 'Nous Portal' },
      { id: 'berdaya-cloud', name: 'Berdaya Cloud' },
      { id: 'openrouter', name: 'OpenRouter' },
      { id: 'berdaya-local', name: 'Berdaya Local' }
    ]

    expect(filterDesktopOAuthProviders(providers)).toEqual([
      { id: 'berdaya-cloud', name: 'Berdaya Cloud' },
      { id: 'berdaya-local', name: 'Berdaya Local' }
    ])
  })

  it('only allows Berdaya providers in model provider lists', () => {
    const providers = [
      { slug: 'nous', name: 'Nous Portal', models: ['hermes-4'] },
      { slug: 'berdaya-cloud', name: 'Berdaya Cloud', models: ['berdaya/1.0'] },
      { slug: 'openrouter', name: 'OpenRouter', models: ['anthropic/claude-sonnet-4'] }
    ]

    expect(filterDesktopModelProviders(providers)).toEqual([
      { slug: 'berdaya-cloud', name: 'Berdaya Cloud', models: ['berdaya/1.0'] }
    ])
  })

  it('filters model.options payloads to Berdaya providers only', () => {
    expect(
      filterDesktopModelOptions({
        provider: 'berdaya-local',
        model: 'berdaya/1.0',
        providers: [
          { slug: 'nous', name: 'Nous Portal', models: ['hermes-4'] },
          { slug: 'berdaya-local', name: 'Berdaya Local', models: ['berdaya/1.0'] },
          { slug: 'deepseek', name: 'DeepSeek', models: ['deepseek-chat'] }
        ]
      })
    ).toEqual({
      provider: 'berdaya-local',
      model: 'berdaya/1.0',
      providers: [{ slug: 'berdaya-local', name: 'Berdaya Local', models: ['berdaya/1.0'] }]
    })
  })
})
