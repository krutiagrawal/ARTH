'use client'
import { useEffect, useState, useCallback, useMemo } from 'react'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, ImageOff, Trees, Newspaper, Trophy, Handshake, Leaf, BarChart3, History, MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import DrawerFormShell, { FormSection, FieldLabel, fieldInputClassName, fieldTextareaClassName, fieldButtonClassName } from '@/components/dashboard/DrawerFormShell'
import DataTable from '@/components/dashboard/DataTable'
import DashboardPageShell from '@/components/dashboard/DashboardPageShell'
import EmptyState from '@/components/dashboard/EmptyState'
import ConfirmDialog from '@/components/dashboard/ConfirmDialog'
import { ADMIN_CONTENT_MODELS } from '@/lib/adminContent'

const MODEL_KEYS = Object.keys(ADMIN_CONTENT_MODELS)
const IMAGE_FIELD_NAMES = new Set(['imageUrl', 'logoUrl'])
const MODEL_ICON = {
  forests: Trees,
  blogs: Newspaper,
  competitions: Trophy,
  partners: Handshake,
  ecosystemEntries: Leaf,
  stats: BarChart3,
  timelineEntries: History,
  mapPoints: MapPin,
}

async function api(path, opts = {}) {
  const res = await fetch(`/api/admin-content${path}`, {
    method: opts.method || 'GET',
    headers: opts.body ? { 'Content-Type': 'application/json' } : undefined,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  })
  if (res.status === 204) return null
  const data = await res.json().catch(() => null)
  if (!res.ok) throw new Error((data && data.error) || 'Something went wrong.')
  return data
}

function Thumbnail({ url }) {
  if (!url) {
    return (
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
        <ImageOff className="h-4 w-4" />
      </div>
    )
  }
  // eslint-disable-next-line @next/next/no-img-element -- arbitrary admin-entered URL, not a static asset
  return <img src={url} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover bg-muted" />
}

export default function AdminContentClient() {
  const [modelKey, setModelKey] = useState(MODEL_KEYS[0])
  const config = ADMIN_CONTENT_MODELS[modelKey]

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api(`/${modelKey}`)
      setItems(data.items)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }, [modelKey])

  useEffect(() => {
    setDialogOpen(false)
    setEditingId(null)
    setForm({})
    load()
  }, [load])

  const startCreate = () => {
    setForm({})
    setEditingId(null)
    setDialogOpen(true)
  }

  const startEdit = (item) => {
    const initial = {}
    for (const f of config.fields) initial[f.name] = item[f.name] ?? ''
    if (config.idKind === 'string') initial.id = item.id
    setForm(initial)
    setEditingId(item.id)
    setDialogOpen(true)
  }

  const submit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      if (editingId !== null) {
        await api(`/${modelKey}/${editingId}`, { method: 'PATCH', body: form })
        toast.success('Saved.')
      } else {
        await api(`/${modelKey}`, { method: 'POST', body: form })
        toast.success('Created.')
      }
      setDialogOpen(false)
      await load()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleting) return
    try {
      await api(`/${modelKey}/${deleting.id}`, { method: 'DELETE' })
      toast.success('Deleted.')
      await load()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setDeleting(null)
    }
  }

  const primaryField = config.fields[0].name
  const imageField = config.fields.find((f) => IMAGE_FIELD_NAMES.has(f.name))

  const fieldGroups = useMemo(
    () => ({
      basics: config.fields.filter((f) => f.type !== 'textarea' && !IMAGE_FIELD_NAMES.has(f.name)),
      media: config.fields.filter((f) => IMAGE_FIELD_NAMES.has(f.name)),
      description: config.fields.filter((f) => f.type === 'textarea'),
    }),
    [config],
  )

  const columns = useMemo(
    () => [
      {
        id: 'preview',
        header: '',
        cell: ({ row }) => <Thumbnail url={imageField ? row.original[imageField.name] : null} />,
      },
      {
        accessorKey: primaryField,
        header: config.fields[0].name,
        cell: ({ row }) => (
          <div>
            <p className="font-medium">{String(row.original[primaryField])}</p>
            <p className="text-xs text-muted-foreground font-mono">{row.original.id}</p>
          </div>
        ),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="outline" className="rounded-full" onClick={() => startEdit(row.original)}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button size="sm" variant="ghost" className="rounded-full text-destructive hover:text-destructive" onClick={() => setDeleting(row.original)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ),
      },
      // eslint-disable-next-line react-hooks/exhaustive-deps
    ],
    [modelKey, imageField, primaryField],
  )

  return (
    <DashboardPageShell className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="eyebrow text-primary">Admin</p>
          <h1 className="font-serif text-3xl md:text-4xl mt-2">Content</h1>
        </div>
        <Button onClick={startCreate} className="rounded-full shrink-0">
          <Plus className="h-4 w-4" /> New {config.label.replace(/s$/, '')}
        </Button>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-border/70 pb-4">
        {MODEL_KEYS.map((key) => (
          <button
            key={key}
            onClick={() => setModelKey(key)}
            className={`px-3 py-1.5 rounded-full text-xs transition ${
              modelKey === key ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-secondary'
            }`}
          >
            {ADMIN_CONTENT_MODELS[key].label}
          </button>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={items}
        loading={loading}
        searchKey={primaryField}
        searchPlaceholder={`Search ${config.label.toLowerCase()}…`}
        emptyState={<EmptyState title="Nothing here yet" body={`Create your first ${config.label.toLowerCase().replace(/s$/, '')}.`} actionLabel="New" onAction={startCreate} />}
      />

      <DrawerFormShell
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        icon={MODEL_ICON[modelKey]}
        eyebrow="Admin · Content"
        title={editingId !== null ? `Edit ${config.label.replace(/s$/, '')}` : `New ${config.label.replace(/s$/, '')}`}
        description={`Manage a ${config.label.toLowerCase().replace(/s$/, '')} entry shown on the public site.`}
        footer={
          <>
            <Button type="button" variant="outline" size="sm" className={fieldButtonClassName} onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button disabled={submitting} type="submit" form="admin-content-form" size="sm" className={fieldButtonClassName}>
              {submitting ? 'Saving…' : editingId !== null ? 'Save changes' : 'Create'}
            </Button>
          </>
        }
      >
        <form id="admin-content-form" onSubmit={submit}>
          <FormSection label="Basics" first>
            {config.idKind === 'string' && (
              <label className="block">
                <FieldLabel required>id (slug)</FieldLabel>
                <input
                  required
                  disabled={editingId !== null}
                  value={form.id || ''}
                  onChange={(e) => setForm((s) => ({ ...s, id: e.target.value }))}
                  className={cn(fieldInputClassName, 'disabled:opacity-60')}
                />
              </label>
            )}
            {fieldGroups.basics.map((f) => (
              <label key={f.name} className="block">
                <FieldLabel required={f.required}>{f.name}</FieldLabel>
                <input
                  type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'}
                  required={f.required}
                  value={form[f.name] || ''}
                  onChange={(e) => setForm((s) => ({ ...s, [f.name]: e.target.value }))}
                  className={fieldInputClassName}
                />
              </label>
            ))}
          </FormSection>

          {fieldGroups.media.length > 0 && (
            <FormSection label="Media">
              {fieldGroups.media.map((f) => (
                <label key={f.name} className="block">
                  <FieldLabel required={f.required}>{f.name}</FieldLabel>
                  <input
                    type="text"
                    required={f.required}
                    value={form[f.name] || ''}
                    onChange={(e) => setForm((s) => ({ ...s, [f.name]: e.target.value }))}
                    className={fieldInputClassName}
                  />
                  {form[f.name] && (
                    <div className="mt-2">
                      <Thumbnail url={form[f.name]} />
                    </div>
                  )}
                </label>
              ))}
            </FormSection>
          )}

          {fieldGroups.description.length > 0 && (
            <FormSection label="Description">
              {fieldGroups.description.map((f) => (
                <label key={f.name} className="block">
                  <FieldLabel required={f.required}>{f.name}</FieldLabel>
                  <textarea
                    required={f.required}
                    rows={4}
                    value={form[f.name] || ''}
                    onChange={(e) => setForm((s) => ({ ...s, [f.name]: e.target.value }))}
                    className={fieldTextareaClassName}
                  />
                </label>
              ))}
            </FormSection>
          )}
        </form>
      </DrawerFormShell>

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete this item?"
        description="This can't be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
      />
    </DashboardPageShell>
  )
}
