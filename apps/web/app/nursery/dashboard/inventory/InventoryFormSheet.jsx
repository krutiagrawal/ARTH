'use client'

import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, Search, Sprout, X } from 'lucide-react'
import DrawerFormShell, { FormSection, FieldLabel, fieldInputClassName, fieldTextareaClassName, fieldButtonClassName } from '@/components/dashboard/DrawerFormShell'
import { Button } from '@/components/ui/button'
import PhotoUploadField from '@/components/dashboard/PhotoUploadField'
import { proxy } from '../proxy'

const SUNLIGHT_OPTIONS = [
  { value: 'full_sun', label: 'Full sun' },
  { value: 'partial_shade', label: 'Partial shade' },
  { value: 'shade', label: 'Shade' },
]
const WATER_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
]

function emptyForm(item) {
  if (!item) {
    return {
      speciesId: '',
      speciesLabel: '',
      newSpecies: null,
      quantity: '',
      isFree: false,
      priceRupees: '',
      ageLabel: '',
      heightLabel: '',
      potSize: '',
      suitableEnvironments: '',
      nurseryNotes: '',
      lowStockThreshold: '',
    }
  }
  return {
    speciesId: item.speciesId || item.speciesRef?.id || '',
    speciesLabel: item.speciesRef?.commonName || item.species || '',
    newSpecies: null,
    quantity: String(item.quantity ?? ''),
    isFree: Boolean(item.isFree),
    priceRupees: item.priceCents != null ? String(item.priceCents / 100) : '',
    ageLabel: item.ageLabel || '',
    heightLabel: item.heightLabel || '',
    potSize: item.potSize || '',
    suitableEnvironments: (item.suitableEnvironments || []).join(', '),
    nurseryNotes: item.nurseryNotes || '',
    lowStockThreshold: item.lowStockThreshold != null ? String(item.lowStockThreshold) : '',
  }
}

/**
 * Bespoke create/edit drawer for Inventory — species picker (link an existing
 * TreeSpecies catalog entry, or author a new one inline) plus quantity/price as
 * the fast path, with age/height/pot-size/environments/notes/threshold tucked
 * behind a collapsed "More details" section, per the brief.
 */
export default function InventoryFormSheet({ open, onOpenChange, item, submitting, onSubmit }) {
  const [form, setForm] = useState(() => emptyForm(item))
  const [photoFile, setPhotoFile] = useState(null)
  const [species, setSpecies] = useState([])
  const [speciesQuery, setSpeciesQuery] = useState('')
  const [pickerOpen, setPickerOpen] = useState(false)
  const [addingNew, setAddingNew] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setForm(emptyForm(item))
      setPhotoFile(null)
      setSpeciesQuery('')
      setPickerOpen(false)
      setAddingNew(false)
      setMoreOpen(false)
      setError('')
      proxy('/species').then(setSpecies).catch(() => setSpecies([]))
    }
  }, [open, item])

  const filteredSpecies = useMemo(() => {
    const q = speciesQuery.trim().toLowerCase()
    if (!q) return species.slice(0, 20)
    return species.filter((s) => s.commonName.toLowerCase().includes(q)).slice(0, 20)
  }, [species, speciesQuery])

  const set = (key) => (e) => setForm((s) => ({ ...s, [key]: e.target.value }))

  const pickSpecies = (s) => {
    setForm((f) => ({ ...f, speciesId: s.id, speciesLabel: s.commonName, newSpecies: null }))
    setPickerOpen(false)
    setSpeciesQuery('')
  }

  const startNewSpecies = () => {
    setAddingNew(true)
    setPickerOpen(false)
    setForm((f) => ({
      ...f,
      speciesId: '',
      newSpecies: { commonName: speciesQuery || '', scientificName: '', localName: '', emoji: '', isNative: false, sunlightNeeds: '', waterNeeds: '', soilNeeds: '', matureHeightLabel: '', plantingSeasons: '', co2KgPerYear: '', description: '' },
    }))
  }

  const setNewSpecies = (key) => (e) => {
    const value = e?.target ? (e.target.type === 'checkbox' ? e.target.checked : e.target.value) : e
    setForm((f) => ({ ...f, newSpecies: { ...f.newSpecies, [key]: value } }))
  }

  const submit = (e) => {
    e.preventDefault()
    setError('')

    if (!form.speciesId && !form.newSpecies?.commonName?.trim()) {
      setError('Pick a species from the catalog, or add a new one.')
      return
    }
    if (!form.quantity) {
      setError('Quantity is required.')
      return
    }
    if (!form.isFree && !form.priceRupees) {
      setError('Set a price, or mark this listing as free.')
      return
    }

    const payload = {
      quantity: Number(form.quantity),
      isFree: form.isFree,
    }
    if (!form.isFree) payload.priceCents = Math.round(Number(form.priceRupees) * 100)

    if (form.speciesId) {
      payload.speciesId = form.speciesId
    } else if (form.newSpecies) {
      const ns = form.newSpecies
      payload.species = {
        commonName: ns.commonName.trim(),
        ...(ns.scientificName ? { scientificName: ns.scientificName } : {}),
        ...(ns.localName ? { localName: ns.localName } : {}),
        ...(ns.emoji ? { emoji: ns.emoji } : {}),
        isNative: Boolean(ns.isNative),
        ...(ns.sunlightNeeds ? { sunlightNeeds: ns.sunlightNeeds } : {}),
        ...(ns.waterNeeds ? { waterNeeds: ns.waterNeeds } : {}),
        ...(ns.soilNeeds ? { soilNeeds: ns.soilNeeds } : {}),
        ...(ns.matureHeightLabel ? { matureHeightLabel: ns.matureHeightLabel } : {}),
        ...(ns.plantingSeasons ? { plantingSeasons: ns.plantingSeasons.split(',').map((s) => s.trim()).filter(Boolean) } : {}),
        ...(ns.co2KgPerYear ? { co2KgPerYear: Number(ns.co2KgPerYear) } : {}),
        ...(ns.description ? { description: ns.description } : {}),
      }
    }

    if (form.ageLabel) payload.ageLabel = form.ageLabel
    if (form.heightLabel) payload.heightLabel = form.heightLabel
    if (form.potSize) payload.potSize = form.potSize
    if (form.suitableEnvironments) {
      payload.suitableEnvironments = form.suitableEnvironments.split(',').map((s) => s.trim()).filter(Boolean)
    }
    if (form.nurseryNotes) payload.nurseryNotes = form.nurseryNotes
    if (form.lowStockThreshold) payload.lowStockThreshold = Number(form.lowStockThreshold)

    onSubmit(payload, photoFile)
  }

  return (
    <DrawerFormShell
      open={open}
      onOpenChange={onOpenChange}
      icon={Sprout}
      eyebrow="Nursery Dashboard"
      title={item ? 'Edit stock' : 'Add stock'}
      description={item ? 'Update this listing.' : 'List a species you have in stock right now.'}
      footer={
        <>
          <Button type="button" variant="outline" size="sm" className={fieldButtonClassName} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form="inventory-form-sheet" size="sm" disabled={submitting} className={fieldButtonClassName}>
            {submitting ? 'Saving…' : item ? 'Save changes' : 'Create'}
          </Button>
        </>
      }
    >
      <form id="inventory-form-sheet" onSubmit={submit}>
        <FormSection first>
          <PhotoUploadField label="Photo (optional)" value={photoFile} onChange={setPhotoFile} currentUrl={item?.photoUrl} />
        </FormSection>

        <FormSection label="Species">
          {!addingNew ? (
            <div className="relative">
              <FieldLabel required>Species</FieldLabel>
              <div className="relative mt-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  value={pickerOpen ? speciesQuery : form.speciesLabel}
                  onChange={(e) => {
                    setSpeciesQuery(e.target.value)
                    setPickerOpen(true)
                  }}
                  onFocus={() => setPickerOpen(true)}
                  placeholder="Search the species catalog…"
                  className={`${fieldInputClassName} pl-7`}
                />
              </div>
              {pickerOpen && (
                <div className="absolute z-10 mt-1 w-full max-h-56 overflow-y-auto rounded-[8px] border border-border/70 bg-background shadow-lg">
                  {filteredSpecies.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => pickSpecies(s)}
                      className="flex w-full items-center gap-2 px-2.5 py-2 text-left text-[13px] hover:bg-secondary/40"
                    >
                      <span>{s.emoji || '🌱'}</span>
                      <span className="flex-1 truncate">{s.commonName}</span>
                      {s.isNative && <span className="text-[10px] text-primary">Native</span>}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={startNewSpecies}
                    className="w-full border-t border-border/60 px-2.5 py-2 text-left text-[13px] font-medium text-primary hover:bg-primary/5"
                  >
                    + Add &ldquo;{speciesQuery || 'a new species'}&rdquo; to the catalog
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-[10px] border border-border/60 bg-secondary/20 p-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">New species</span>
                <button type="button" onClick={() => { setAddingNew(false); setForm((f) => ({ ...f, newSpecies: null })) }} className="rounded p-1 text-muted-foreground hover:bg-secondary/60">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <label className="block">
                <FieldLabel required>Common name</FieldLabel>
                <input value={form.newSpecies?.commonName ?? ''} onChange={setNewSpecies('commonName')} className={fieldInputClassName} />
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                <label className="block">
                  <FieldLabel>Scientific name</FieldLabel>
                  <input value={form.newSpecies?.scientificName ?? ''} onChange={setNewSpecies('scientificName')} className={fieldInputClassName} />
                </label>
                <label className="block">
                  <FieldLabel>Local name</FieldLabel>
                  <input value={form.newSpecies?.localName ?? ''} onChange={setNewSpecies('localName')} className={fieldInputClassName} />
                </label>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <label className="block">
                  <FieldLabel>Emoji</FieldLabel>
                  <input value={form.newSpecies?.emoji ?? ''} onChange={setNewSpecies('emoji')} placeholder="🌳" className={fieldInputClassName} />
                </label>
                <label className="flex items-center gap-2 pt-5">
                  <input type="checkbox" checked={Boolean(form.newSpecies?.isNative)} onChange={setNewSpecies('isNative')} className="h-4 w-4 rounded border-border/70" />
                  <span className="text-[12px] text-muted-foreground">Native species</span>
                </label>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <label className="block">
                  <FieldLabel>Sunlight</FieldLabel>
                  <select value={form.newSpecies?.sunlightNeeds ?? ''} onChange={setNewSpecies('sunlightNeeds')} className={fieldInputClassName}>
                    <option value="">Not set</option>
                    {SUNLIGHT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </label>
                <label className="block">
                  <FieldLabel>Water needs</FieldLabel>
                  <select value={form.newSpecies?.waterNeeds ?? ''} onChange={setNewSpecies('waterNeeds')} className={fieldInputClassName}>
                    <option value="">Not set</option>
                    {WATER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </label>
              </div>
              <label className="block">
                <FieldLabel>Mature height</FieldLabel>
                <input value={form.newSpecies?.matureHeightLabel ?? ''} onChange={setNewSpecies('matureHeightLabel')} placeholder="e.g. 10-15 m" className={fieldInputClassName} />
              </label>
              <label className="block">
                <FieldLabel>Planting seasons (comma separated)</FieldLabel>
                <input value={form.newSpecies?.plantingSeasons ?? ''} onChange={setNewSpecies('plantingSeasons')} placeholder="Monsoon, Winter" className={fieldInputClassName} />
              </label>
              <label className="block">
                <FieldLabel>Description</FieldLabel>
                <textarea value={form.newSpecies?.description ?? ''} onChange={setNewSpecies('description')} rows={2} className={fieldTextareaClassName} />
              </label>
            </div>
          )}
        </FormSection>

        <FormSection label="Stock & price">
          <div className="grid grid-cols-2 gap-2.5">
            <label className="block">
              <FieldLabel required>Quantity</FieldLabel>
              <input type="number" min="0" value={form.quantity} onChange={set('quantity')} className={fieldInputClassName} />
            </label>
            <label className="block">
              <FieldLabel required={!form.isFree}>Price (₹)</FieldLabel>
              <input type="number" min="0" step="0.01" disabled={form.isFree} value={form.priceRupees} onChange={set('priceRupees')} className={fieldInputClassName} />
            </label>
          </div>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.isFree} onChange={(e) => setForm((s) => ({ ...s, isFree: e.target.checked }))} className="h-4 w-4 rounded border-border/70" />
            <span className="text-[12px] text-muted-foreground">Offer this free (requested in-app, not purchased)</span>
          </label>
        </FormSection>

        <div className="mt-3 rounded-xl border border-border/60 bg-background shadow-sm">
          <button
            type="button"
            onClick={() => setMoreOpen((v) => !v)}
            className="flex w-full items-center justify-between p-3.5 text-left"
          >
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary/80">More details (optional)</span>
            {moreOpen ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
          </button>
          {moreOpen && (
            <div className="space-y-3 p-3.5 pt-0">
              <div className="grid grid-cols-3 gap-2.5">
                <label className="block">
                  <FieldLabel>Age</FieldLabel>
                  <input value={form.ageLabel} onChange={set('ageLabel')} placeholder="6 months" className={fieldInputClassName} />
                </label>
                <label className="block">
                  <FieldLabel>Height</FieldLabel>
                  <input value={form.heightLabel} onChange={set('heightLabel')} placeholder="2 ft" className={fieldInputClassName} />
                </label>
                <label className="block">
                  <FieldLabel>Pot size</FieldLabel>
                  <input value={form.potSize} onChange={set('potSize')} placeholder="12 in" className={fieldInputClassName} />
                </label>
              </div>
              <label className="block">
                <FieldLabel>Suitable environments (comma separated)</FieldLabel>
                <input value={form.suitableEnvironments} onChange={set('suitableEnvironments')} placeholder="Terrace, Garden, Roadside" className={fieldInputClassName} />
              </label>
              <label className="block">
                <FieldLabel>Notes</FieldLabel>
                <textarea value={form.nurseryNotes} onChange={set('nurseryNotes')} rows={2} className={fieldTextareaClassName} />
              </label>
              <label className="block">
                <FieldLabel>Low-stock alert threshold</FieldLabel>
                <input type="number" min="0" value={form.lowStockThreshold} onChange={set('lowStockThreshold')} placeholder="5" className={fieldInputClassName} />
              </label>
            </div>
          )}
        </div>

        {error && <p className="mt-3 text-xs text-destructive">{error}</p>}
      </form>
    </DrawerFormShell>
  )
}
