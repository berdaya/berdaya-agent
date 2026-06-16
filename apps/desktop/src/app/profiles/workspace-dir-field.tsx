import { FolderOpen } from '@/lib/icons'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useI18n } from '@/i18n'
import { cn } from '@/lib/utils'

export async function pickProjectWorkspaceDir(suggestedName?: string): Promise<null | string> {
  const picker = window.hermesDesktop?.pickProjectWorkspace

  if (!picker) {
    return null
  }

  const result = await picker(suggestedName)

  return result.canceled || !result.dir ? null : result.dir
}

export function WorkspaceDirField({
  invalid,
  nameHint,
  onChange,
  value
}: {
  invalid?: boolean
  nameHint?: string
  onChange: (dir: string) => void
  value: string
}) {
  const { t } = useI18n()
  const p = t.profiles

  return (
    <div className="grid gap-1.5">
      <label className="text-xs font-medium" htmlFor="project-workspace-dir">
        {p.workspaceLabel}
      </label>
      <div className="flex gap-2">
        <Input
          aria-invalid={invalid}
          className="min-w-0 flex-1 font-mono text-[0.72rem]"
          id="project-workspace-dir"
          onChange={event => onChange(event.target.value)}
          placeholder={p.workspacePlaceholder}
          readOnly
          value={value}
        />
        <Button
          onClick={() => void pickProjectWorkspaceDir(nameHint).then(dir => dir && onChange(dir))}
          type="button"
          variant="outline"
        >
          <FolderOpen className="mr-1.5 size-3.5" />
          {p.chooseWorkspace}
        </Button>
      </div>
      <p className={cn('text-[0.66rem] leading-4', invalid ? 'text-destructive' : 'text-muted-foreground')}>
        {invalid ? p.workspaceRequired : p.workspaceHint}
      </p>
    </div>
  )
}
