import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { $desktopOnboarding, type DesktopOnboardingState, type OnboardingContext } from '@/store/onboarding'

import { Picker } from './desktop-onboarding-overlay'

function setOnboarding(state: Partial<DesktopOnboardingState>) {
  $desktopOnboarding.set({
    configured: false,
    flow: { status: 'idle' },
    mode: 'apikey',
    providers: null,
    reason: null,
    requested: false,
    firstRunSkipped: false,
    manual: false,
    ...state
  } satisfies DesktopOnboardingState)
}

const ctx: OnboardingContext = { requestGateway: async () => undefined as never }

afterEach(() => {
  cleanup()

  try {
    window.localStorage.clear()
  } catch {
    // jsdom localStorage should always be present; ignore if not.
  }

  $desktopOnboarding.set({
    configured: null,
    flow: { status: 'idle' },
    mode: 'apikey',
    providers: null,
    reason: null,
    requested: false,
    firstRunSkipped: false,
    manual: false
  })
})

describe('onboarding Picker', () => {
  it('shows only Berdaya Cloud and Berdaya Local with an API key field', () => {
    setOnboarding({})
    render(<Picker ctx={ctx} />)

    expect(screen.getByText('Berdaya Cloud')).toBeTruthy()
    expect(screen.getByText('Berdaya Local')).toBeTruthy()
    expect(screen.queryByText('OpenRouter')).toBeNull()
    expect(screen.queryByText('OpenAI')).toBeNull()
    expect(screen.getByPlaceholderText('Paste API key')).toBeTruthy()
  })

  it('offers "choose later" on first run and persists the skip', () => {
    setOnboarding({})
    render(<Picker ctx={ctx} />)

    const skip = screen.getByRole('button', { name: "I'll choose a provider later" })
    fireEvent.click(skip)

    expect($desktopOnboarding.get().firstRunSkipped).toBe(true)
  })

  it('hides "choose later" in manual provider setup mode', () => {
    setOnboarding({ manual: true })
    render(<Picker ctx={ctx} />)

    expect(screen.queryByRole('button', { name: "I'll choose a provider later" })).toBeNull()
  })
})
