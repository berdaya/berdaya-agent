import { useEffect, useState } from 'react'

import { isValidProfileName } from '@/app/profiles/create-profile-dialog'
import { WorkspaceDirField } from '@/app/profiles/workspace-dir-field'
import { ActionStatus } from '@/components/ui/action-status'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { createProfile } from '@/hermes'
import { useI18n } from '@/i18n'
import { AlertTriangle } from '@/lib/icons'
import { cn } from '@/lib/utils'
import { applyProfileWorkspace, refreshActiveProfile, selectProfile } from '@/store/profile'

interface FirstProjectOverlayProps {
  enabled: boolean
}

export function FirstProjectOverlay({ enabled }: FirstProjectOverlayProps) {
  const { t } = useI18n()
  const p = t.profiles
  const [name, setName] = useState('my-project')
  const [description, setDescription] = useState('')
  const [workspaceDir, setWorkspaceDir] = useState('')
  const [status, setStatus] = useState<'done' | 'idle' | 'saving'>('idle')
  const [error, setError] = useState<null | string>(null)

  const trimmed = name.trim()
  const invalidName = trimmed !== '' && !isValidProfileName(trimmed)
  const missingWorkspace = !workspaceDir.trim()
  const busy = status === 'saving' || status === 'done'

  useEffect(() => {
    if (!enabled) {
      return
    }

    setName('my-project')
    setDescription('')
    setWorkspaceDir('')
    setError(null)
    setStatus('idle')
  }, [enabled])

  if (!enabled) {
    return null
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()

    if (!trimmed || invalidName) {
      setError(invalidName ? p.invalidName(p.nameHint) : p.nameRequired)

      return
    }

    if (missingWorkspace) {
      setError(p.workspaceRequired)

      return
    }

    setStatus('saving')
    setError(null)

    try {
      const trimmedDescription = description.trim()
      await createProfile({
        name: trimmed,
        no_skills: false,
        clone_from_default: false,
        workspace_dir: workspaceDir.trim(),
        ...(trimmedDescription ? { description: trimmedDescription } : {})
      })

      await refreshActiveProfile()
      selectProfile(trimmed)
      await applyProfileWorkspace(trimmed)
      setStatus('done')
    } catch (err) {
      setStatus('idle')
      setError(err instanceof Error ? err.message : p.failedCreate)
    }
  }

  return (
    <div className="fixed inset-0 z-[1400] flex items-center justify-center bg-background/95 p-6 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-xl border bg-card p-6 shadow-2xl">
        <h2 className="text-lg font-semibold tracking-tight">{p.firstProjectTitle}</h2>
        <p className="mt-1 text-sm leading-5 text-muted-foreground">{p.firstProjectDesc}</p>

        <form className="mt-5 grid gap-4" onSubmit={handleSubmit}>
          <div className="grid gap-1.5">
            <label className="text-xs font-medium" htmlFor="first-project-name">
              {p.nameLabel}
            </label>
            <Input
              aria-invalid={invalidName}
              autoFocus
              id="first-project-name"
              onChange={event => setName(event.target.value)}
              placeholder="my-project"
              value={name}
            />
            <p className={cn('text-[0.66rem] leading-4', invalidName ? 'text-destructive' : 'text-muted-foreground')}>
              {p.nameHint}
            </p>
          </div>

          <div className="grid gap-1.5">
            <label className="text-xs font-medium" htmlFor="first-project-description">
              {p.descriptionLabel}{' '}
              <span className="font-normal text-muted-foreground">- {p.descriptionOptional}</span>
            </label>
            <Textarea
              className="min-h-20 text-sm leading-5"
              id="first-project-description"
              onChange={event => setDescription(event.target.value)}
              placeholder={p.descriptionPlaceholder}
              value={description}
            />
          </div>

          <WorkspaceDirField
            invalid={missingWorkspace && Boolean(error)}
            nameHint={trimmed || 'my-project'}
            onChange={setWorkspaceDir}
            value={workspaceDir}
          />

          {error && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Button className="w-full" disabled={busy || !trimmed || invalidName || missingWorkspace} type="submit">
            <ActionStatus busy={p.creating} done={p.created} idle={p.createAction} state={status} />
          </Button>
        </form>
      </div>
    </div>
  )
}
