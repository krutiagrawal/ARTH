'use client'
import { useEffect, useState, useCallback } from 'react'
import { Plus, Pencil, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { proxy } from './proxy'

// Generic create/edit/list/cancel tab shared by Drives, Adoptable Trees, and
// Campaigns — the three NGO resources are structurally identical (a handful of
// fields + a list of cards with edit/cancel), so one parameterized component
// replaces three near-duplicate ones. `fields` drive both the form and the
// payload sent to services/api; `apiName`/`toApi`/`fromApi` handle the couple
// of fields whose form representation differs from the API's (e.g. currency
// amounts shown in rupees but sent as cents).
export default function ResourceTab({ basePath, fields, renderCard, cancelLabel, emptyLabel }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({})
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setItems(await proxy(`${basePath}/mine`))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [basePath])

  useEffect(() => {
    load()
  }, [load])

  const startCreate = () => {
    setForm({})
    setEditingId(null)
    setShowForm(true)
  }

  const startEdit = (item) => {
    const initial = {}
    for (const f of fields) {
      const raw = item[f.apiName || f.name]
      initial[f.name] = f.fromApi ? f.fromApi(raw) : (raw ?? '')
    }
    setForm(initial)
    setEditingId(item.id)
    setShowForm(true)
  }

  const cancelFormEdit = () => {
    setShowForm(false)
    setEditingId(null)
    setForm({})
  }

  const submit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      if (editingId) {
        const payload = {}
        for (const f of fields) {
          if (form[f.name] === undefined || form[f.name] === '') continue
          const key = f.apiName || f.name
          payload[key] = f.toApi ? f.toApi(form[f.name]) : form[f.name]
        }
        await proxy(`${basePath}/${editingId}`, { method: 'PATCH', body: payload })
      } else {
        const body = new FormData()
        for (const f of fields) {
          if (form[f.name] === undefined || form[f.name] === '') continue
          const key = f.apiName || f.name
          const value = f.toApi ? f.toApi(form[f.name]) : form[f.name]
          body.append(key, value)
        }
        await proxy(basePath, { method: 'POST', body })
      }
      cancelFormEdit()
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const remove = async (id) => {
    setError('')
    try {
      await proxy(`${basePath}/${id}`, { method: 'DELETE' })
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div>
      <Button onClick={showForm ? cancelFormEdit : startCreate} variant={showForm ? 'outline' : 'default'} className="rounded-full">
        {showForm ? (
          <>
            <X className="h-4 w-4" /> Cancel
          </>
        ) : (
          <>
            <Plus className="h-4 w-4" /> New
          </>
        )}
      </Button>

      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

      {showForm && (
        <form onSubmit={submit} className="mt-6 rounded-3xl border border-border/70 bg-card p-6 leaf-shadow space-y-4">
          {fields.map((f) => (
            <label key={f.name} className="block">
              <span className="eyebrow">
                {f.label}
                {f.required && ' *'}
              </span>
              {f.type === 'textarea' ? (
                <textarea
                  required={f.required}
                  value={form[f.name] || ''}
                  onChange={(e) => setForm((s) => ({ ...s, [f.name]: e.target.value }))}
                  rows={4}
                  className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-primary/40"
                />
              ) : (
                <input
                  type={f.type || 'text'}
                  required={f.required}
                  value={form[f.name] || ''}
                  onChange={(e) => setForm((s) => ({ ...s, [f.name]: e.target.value }))}
                  className="mt-2 w-full h-11 rounded-full border border-border bg-background px-4 outline-none focus:ring-2 focus:ring-primary/40"
                />
              )}
            </label>
          ))}
          <Button disabled={submitting} type="submit" className="rounded-full h-11">
            {submitting ? 'Saving…' : editingId ? 'Save changes' : 'Create'}
          </Button>
        </form>
      )}

      <div className="mt-8 space-y-4">
        {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!loading && items.length === 0 && <p className="text-sm text-muted-foreground">{emptyLabel}</p>}
        {items.map((item) => (
          <div key={item.id} className="rounded-3xl border border-border/70 bg-card p-6 leaf-shadow flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex-1">{renderCard(item)}</div>
            <div className="flex gap-2 shrink-0">
              <Button size="sm" variant="outline" className="rounded-full" onClick={() => startEdit(item)}>
                <Pencil className="h-3.5 w-3.5" /> Edit
              </Button>
              <Button size="sm" variant="secondary" className="rounded-full" onClick={() => remove(item.id)}>
                {cancelLabel}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
