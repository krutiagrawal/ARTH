'use client'
import { useEffect, useState, useCallback, useMemo } from 'react'
import { toast } from 'sonner'
import { Plus, Pencil, Sprout, Trophy, Flag, ListChecks, TreeDeciduous, Palette, Power } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import DrawerFormShell, { FormSection, FieldLabel, fieldInputClassName, fieldTextareaClassName, fieldButtonClassName } from '@/components/dashboard/DrawerFormShell'
import DataTable from '@/components/dashboard/DataTable'
import DashboardPageShell from '@/components/dashboard/DashboardPageShell'
import EmptyState from '@/components/dashboard/EmptyState'
import ConfirmDialog from '@/components/dashboard/ConfirmDialog'
import { proxy } from '@/lib/adminProxyClient'
import { ADMIN_CATALOG_MODELS, coerceCatalogValue } from '@/lib/adminCatalogModels'

const MODEL_KEYS = Object.keys(ADMIN_CATALOG_MODELS)
const MODEL_ICON = { species: Sprout, achievements: Trophy, challenges: Flag, missions: ListChecks, themes: TreeDeciduous, decorations: Palette }

export default function AdminCatalogClient() {
  const [modelKey, setModelKey] = useState(MODEL_KEYS[0])
  const config = ADMIN_CATALOG_MODELS[modelKey]

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [togglingActive, setTogglingActive] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await proxy(`/admin/catalog/${modelKey}`)
      setItems(data)
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
    const initial = {}
    if (config.hasKey) initial.key = ''
    setForm(initial)
    setEditingId(null)
    setDialogOpen(true)
  }

  const startEdit = (item) => {
    const initial = {}
    if (config.hasKey) initial.key = item.key
    for (const f of config.fields) initial[f.name] = item[f.name] ?? (f.type === 'checkbox' ? false : '')
    if (config.fields.some((f) => f.type === 'date')) {
      for (const f of config.fields.filter((f) => f.type === 'date')) {
        initial[f.name] = item[f.name] ? new Date(item[f.name]).toISOString().slice(0, 10) : ''
      }
    }
    setForm(initial)
    setEditingId(item.id)
    setDialogOpen(true)
  }

  const submit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const body = { ...(config.hasKey ? { key: form.key } : {}) }
      for (const f of config.fields) body[f.name] = coerceCatalogValue(f, form[f.name])

      if (editingId !== null) {
        await proxy(`/admin/catalog/${modelKey}/${editingId}`, { method: 'PATCH', body })
        toast.success('Saved.')
      } else {
        await proxy(`/admin/catalog/${modelKey}`, { method: 'POST', body })
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

  const toggleActive = async (item) => {
    setTogglingActive(item.id)
    try {
      await proxy(`/admin/catalog/${modelKey}/${item.id}`, { method: 'PATCH', body: { isActive: !item.isActive } })
      await load()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setTogglingActive(null)
    }
  }

  const primaryField = config.fields[0].name

  const columns = useMemo(
    () => [
      {
        accessorKey: primaryField,
        header: config.fields[0].name,
        cell: ({ row }) => (
          <div>
            <p className="font-medium">{String(row.original[primaryField])}</p>
            {config.hasKey && <p className="text-xs text-muted-foreground font-mono">{row.original.key}</p>}
          </div>
        ),
      },
      ...(config.deactivatable
        ? [
            {
              accessorKey: 'isActive',
              header: 'Status',
              cell: ({ row }) => (row.original.isActive ? <Badge>Active</Badge> : <Badge variant="secondary">Inactive</Badge>),
            },
          ]
        : []),
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <div className="flex gap-2 justify-end">
            {config.deactivatable && (
              <Button
                size="sm"
                variant="ghost"
                className="rounded-full"
                disabled={togglingActive === row.original.id}
                onClick={() => toggleActive(row.original)}
              >
                <Power className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button size="sm" variant="outline" className="rounded-full" onClick={() => startEdit(row.original)}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </div>
        ),
      },
      // eslint-disable-next-line react-hooks/exhaustive-deps
    ],
    [modelKey, primaryField, togglingActive],
  )

  return (
    <DashboardPageShell className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="eyebrow text-primary">Admin</p>
          <h1 className="font-serif text-3xl md:text-4xl mt-2">Catalog</h1>
          <p className="mt-2 text-sm text-muted-foreground">Species, achievements, challenges, missions, themes, and decorations – previously seed-only.</p>
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
            {ADMIN_CATALOG_MODELS[key].label}
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
        eyebrow="Admin · Catalog"
        title={editingId !== null ? `Edit ${config.label.replace(/s$/, '')}` : `New ${config.label.replace(/s$/, '')}`}
        footer={
          <>
            <Button type="button" variant="outline" size="sm" className={fieldButtonClassName} onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button disabled={submitting} type="submit" form="admin-catalog-form" size="sm" className={fieldButtonClassName}>
              {submitting ? 'Saving…' : editingId !== null ? 'Save changes' : 'Create'}
            </Button>
          </>
        }
      >
        <form id="admin-catalog-form" onSubmit={submit}>
          <FormSection label="Details" first>
            {config.hasKey && (
              <label className="block">
                <FieldLabel required>key</FieldLabel>
                <input
                  required
                  disabled={editingId !== null}
                  value={form.key || ''}
                  onChange={(e) => setForm((s) => ({ ...s, key: e.target.value }))}
                  className={cn(fieldInputClassName, 'disabled:opacity-60')}
                />
              </label>
            )}
            {config.fields.map((f) => (
              <label key={f.name} className="block">
                {f.type === 'checkbox' ? (
                  <span className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={Boolean(form[f.name])}
                      onChange={(e) => setForm((s) => ({ ...s, [f.name]: e.target.checked }))}
                      className="h-3.5 w-3.5 rounded border-border/70"
                    />
                    <FieldLabel>{f.name}</FieldLabel>
                  </span>
                ) : f.type === 'select' ? (
                  <>
                    <FieldLabel required={f.required}>{f.name}</FieldLabel>
                    <select
                      required={f.required}
                      value={form[f.name] || ''}
                      onChange={(e) => setForm((s) => ({ ...s, [f.name]: e.target.value }))}
                      className={fieldInputClassName}
                    >
                      <option value="" disabled>Select…</option>
                      {f.options.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </>
                ) : f.type === 'textarea' ? (
                  <>
                    <FieldLabel required={f.required}>{f.name}</FieldLabel>
                    <textarea
                      required={f.required}
                      rows={3}
                      value={form[f.name] || ''}
                      onChange={(e) => setForm((s) => ({ ...s, [f.name]: e.target.value }))}
                      className={fieldTextareaClassName}
                    />
                  </>
                ) : (
                  <>
                    <FieldLabel required={f.required}>{f.name}</FieldLabel>
                    <input
                      type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'}
                      required={f.required}
                      value={form[f.name] || ''}
                      onChange={(e) => setForm((s) => ({ ...s, [f.name]: e.target.value }))}
                      className={fieldInputClassName}
                    />
                  </>
                )}
              </label>
            ))}
          </FormSection>
        </form>
      </DrawerFormShell>
    </DashboardPageShell>
  )
}
