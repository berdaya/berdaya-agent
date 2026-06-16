import { useEffect, useState } from 'react'

import { isValidProfileName } from '@/app/profiles/create-profile-dialog'
import { WorkspaceDirField } from '@/app/profiles/workspace-dir-field'
import { ActionStatus } from '@/components/ui/action-status'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { createProfile } from '@/hermes'
import { useI18n } from '@/i18n'
import { AlertTriangle } from '@/lib/icons'
import { cn } from '@/lib/utils'

const PROFILE_NAME_RE = /^[a-z0-9][a-z0-9_-]{0,63}$/

export function isValidProfileName(name: string): boolean {
  return PROFILE_NAME_RE.test(name.trim())
}

// Self-contained create flow (project name + description + clone toggle). Owns the
// createProfile call so every caller just refreshes/selects via onCreated.
export function CreateProfileDialog({
  onClose,
  onCreated,
  open
}: {
  onClose: () => void
  onCreated?: (name: string) => Promise<void> | void
  open: boolean
}) {
  const { t } = useI18n()
  const p = t.profiles
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [workspaceDir, setWorkspaceDir] = useState('')
  const [cloneFromDefault, setCloneFromDefault] = useState(true)
  const [status, setStatus] = useState<'done' | 'idle' | 'saving'>('idle')
  const [error, setError] = useState<null | string>(null)

  useEffect(() => {
    if (!open) {
      return
    }

    setName('')
    setDescription('')
    setWorkspaceDir('')
    setCloneFromDefault(true)
    setError(null)
    setStatus('idle')
  }, [open])

  const trimmed = name.trim()
  const invalid = trimmed !== '' && !isValidProfileName(trimmed)
  const missingWorkspace = !workspaceDir.trim()
  const busy = status === 'saving' || status === 'done'

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()

    if (!trimmed || invalid) {
      setError(invalid ? p.invalidName(p.nameHint) : p.nameRequired)

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
        clone_from_default: cloneFromDefault,
        workspace_dir: workspaceDir.trim(),
        ...(trimmedDescription ? { description: trimmedDescription } : {})
      })

      await onCreated?.(trimmed)
      setStatus('done')
      window.setTimeout(onClose, 800)
    } catch (err) {
      setStatus('idle')
      setError(err instanceof Error ? err.message : p.failedCreate)
    }
  }

  return (
    <Dialog onOpenChange={value => !value && !busy && onClose()} open={open}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{p.newProfile}</DialogTitle>
          <DialogDescription>{p.createDesc}</DialogDescription>
        </DialogHeader>

        <form className="grid gap-4" onSubmit={handleSubmit}>
          <div className="grid gap-1.5">
            <label className="text-xs font-medium" htmlFor="new-project-name">
              {p.nameLabel}
            </label>
            <Input
              aria-invalid={invalid}
              autoFocus
              id="new-project-name"
              onChange={event => setName(event.target.value)}
              placeholder="my-project"
              value={name}
            />
            <p className={cn('text-[0.66rem] leading-4', invalid ? 'text-destructive' : 'text-muted-foreground')}>
              {p.nameHint}
            </p>
          </div>

          <div className="grid gap-1.5">
            <label className="text-xs font-medium" htmlFor="new-project-description">
              {p.descriptionLabel}{' '}
              <span className="font-normal text-muted-foreground">- {p.descriptionOptional}</span>
            </label>
            <Textarea
              className="min-h-20 text-sm leading-5"
              id="new-project-description"
              onChange={event => setDescription(event.target.value)}
              placeholder={p.descriptionPlaceholder}
              value={description}
            />
          </div>

          <WorkspaceDirField
            invalid={missingWorkspace && Boolean(error)}
            nameHint={trimmed || undefined}
            onChange={setWorkspaceDir}
            value={workspaceDir}
          />

          <label className="flex cursor-pointer select-none items-start gap-2.5 px-0.5 py-1">
            <Checkbox
              checked={cloneFromDefault}
              className="mt-0.5 shrink-0"
              onCheckedChange={checked => setCloneFromDefault(checked === true)}
            />
            <span className="grid gap-0.5 leading-snug">
              <span className="text-sm font-medium">{p.cloneFromDefault}</span>
              <span className="text-xs text-muted-foreground">{p.cloneFromDefaultDesc}</span>
            </span>
          </label>

          {error && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <DialogFooter>
            <Button disabled={busy} onClick={onClose} type="button" variant="ghost">
              {t.common.cancel}
            </Button>
            <Button disabled={busy || !trimmed || invalid || missingWorkspace} type="submit">
              <ActionStatus busy={p.creating} done={p.created} idle={p.createAction} state={status} />
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
