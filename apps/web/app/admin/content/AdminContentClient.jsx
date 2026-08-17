'use client'
import { useEffect, useState, useCallback } from 'react'
import { Plus, Pencil, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ADMIN_CONTENT_MODELS } from '@/lib/adminContent'

const MODEL_KEYS = Object.keys(ADMIN_CONTENT_MODELS)

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

export default function AdminContentClient() {
  const [modelKey, setModelKey] = useState(MODEL_KEYS[0])
  const config = ADMIN_CONTENT_MODELS[modelKey]

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({})
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await api(`/${modelKey}`)
      setItems(data.items)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [modelKey])

  useEffect(() => {
    setShowForm(false)
    setEditingId(null)
    setForm({})
    load()
  }, [load])

  const startCreate = () => {
    setForm({})
    setEditingId(null)
    setShowForm(true)
  }

  const startEdit = (item) => {
    const initial = {}
    for (const f of config.fields) initial[f.name] = item[f.name] ?? ''
    if (config.idKind === 'string') initial.id = item.id
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
      if (editingId !== null) {
        await api(`/${modelKey}/${editingId}`, { method: 'PATCH', body: form })
      } else {
        await api(`/${modelKey}`, { method: 'POST', body: form })
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
      await api(`/${modelKey}/${id}`, { method: 'DELETE' })
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="pt-32 md:pt-40 pb-24">
      <div className="container max-w-4xl">
        <p className="eyebrow text-primary">Admin</p>
        <h1 className="font-serif text-3xl md:text-5xl mt-2">Content</h1>

        <div className="mt-8 flex flex-wrap gap-2 border-b border-border/70 pb-4">
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

        <div className="mt-6">
          <Button onClick={showForm ? cancelFormEdit : startCreate} variant={showForm ? 'outline' : 'default'} className="rounded-full">
            {showForm ? <><X className="h-4 w-4" /> Cancel</> : <><Plus className="h-4 w-4" /> New {config.label.replace(/s$/, '')}</>}
          </Button>

          {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

          {showForm && (
            <form onSubmit={submit} className="mt-6 rounded-3xl border border-border/70 bg-card p-6 leaf-shadow space-y-4">
              {config.idKind === 'string' && (
                <label className="block">
                  <span className="eyebrow">id (slug) *</span>
                  <input required disabled={editingId !== null} value={form.id || ''} onChange={(e) => setForm((s) => ({ ...s, id: e.target.value }))} className="mt-2 w-full h-11 rounded-full border border-border bg-background px-4 outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-60" />
                </label>
              )}
              {config.fields.map((f) => (
                <label key={f.name} className="block">
                  <span className="eyebrow">{f.name}{f.required && ' *'}</span>
                  {f.type === 'textarea' ? (
                    <textarea required={f.required} rows={4} value={form[f.name] || ''} onChange={(e) => setForm((s) => ({ ...s, [f.name]: e.target.value }))} className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-primary/40" />
                  ) : (
                    <input type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'} required={f.required} value={form[f.name] || ''} onChange={(e) => setForm((s) => ({ ...s, [f.name]: e.target.value }))} className="mt-2 w-full h-11 rounded-full border border-border bg-background px-4 outline-none focus:ring-2 focus:ring-primary/40" />
                  )}
                </label>
              ))}
              <Button disabled={submitting} type="submit" className="rounded-full h-11">
                {submitting ? 'Saving…' : editingId !== null ? 'Save changes' : 'Create'}
              </Button>
            </form>
          )}

          <div className="mt-8 space-y-3">
            {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
            {!loading && items.length === 0 && <p className="text-sm text-muted-foreground">Nothing here yet.</p>}
            {items.map((item) => (
              <div key={item.id} className="rounded-2xl border border-border/70 bg-card p-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{item[config.fields[0].name]}</p>
                  <p className="text-xs text-muted-foreground truncate">id: {item.id}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button size="sm" variant="outline" className="rounded-full" onClick={() => startEdit(item)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" variant="secondary" className="rounded-full" onClick={() => remove(item.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
