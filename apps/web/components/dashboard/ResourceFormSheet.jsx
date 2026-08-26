'use client'

import { useEffect, useMemo, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import DrawerFormShell, { FormSection, FieldLabel, fieldInputClassName, fieldTextareaClassName, fieldButtonClassName } from './DrawerFormShell'
import { Button } from '@/components/ui/button'
import PhotoUploadField from './PhotoUploadField'

function schemaFor(field) {
  if (field.type === 'number') {
    const num = z.preprocess(
      (v) => (v === '' || v === undefined || v === null ? undefined : Number(v)),
      field.required
        ? z.number({ required_error: `${field.label} is required` }).refine((v) => !Number.isNaN(v), `${field.label} must be a number`)
        : z.number().optional()
    )
    return num
  }
  return field.required ? z.string().min(1, `${field.label} is required`) : z.string().optional()
}

function buildSchema(fields) {
  const shape = {}
  for (const f of fields) shape[f.name] = schemaFor(f)
  return z.object(shape)
}

function defaultsFromItem(fields, item) {
  const defaults = {}
  for (const f of fields) {
    if (!item) {
      defaults[f.name] = f.type === 'number' ? undefined : ''
      continue
    }
    const raw = item[f.apiName || f.name]
    defaults[f.name] = f.fromApi ? f.fromApi(raw) : raw ?? (f.type === 'number' ? undefined : '')
  }
  return defaults
}

/**
 * Right-side drawer create/edit form shared by Drives, Adoptable Trees, and
 * Campaigns. `fields` uses the same shape as the resource field configs
 * (name/label/type/required/apiName/toApi/fromApi/section).
 */
// Consecutive short numeric fields (lat/lng, duration/capacity) are paired
// into a single row instead of each taking a full-width line on its own —
// the main lever for shortening the form enough to need less scrolling.
function rowsFor(fields) {
  const rows = []
  for (let i = 0; i < fields.length; i++) {
    const field = fields[i]
    const next = fields[i + 1]
    if (field.type === 'number' && next?.type === 'number') {
      rows.push([field, next])
      i++
    } else {
      rows.push([field])
    }
  }
  return rows
}

// Groups fields into sections by their `section` label, preserving first-seen
// order. Fields without a `section` fall into a single unlabeled group.
function sectionsFor(fields) {
  const order = []
  const byLabel = new Map()
  for (const f of fields) {
    const label = f.section || null
    if (!byLabel.has(label)) {
      byLabel.set(label, [])
      order.push(label)
    }
    byLabel.get(label).push(f)
  }
  return order.map((label) => ({ label, fields: byLabel.get(label) }))
}

function FieldInput({ form, field: f }) {
  return (
    <Controller
      control={form.control}
      name={f.name}
      render={({ field, fieldState }) => (
        <label className="block">
          <FieldLabel required={f.required}>{f.label}</FieldLabel>
          {f.type === 'textarea' ? (
            <textarea {...field} value={field.value ?? ''} rows={3} placeholder={f.placeholder} className={fieldTextareaClassName} />
          ) : f.type === 'select' ? (
            <select {...field} value={field.value ?? ''} className={fieldInputClassName}>
              <option value="">{f.placeholder || 'None'}</option>
              {(f.options || []).map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          ) : (
            <input {...field} value={field.value ?? ''} type={f.type || 'text'} placeholder={f.placeholder} className={fieldInputClassName} />
          )}
          {fieldState.error && <p className="mt-1 text-xs text-destructive">{fieldState.error.message}</p>}
        </label>
      )}
    />
  )
}

export default function ResourceFormSheet({
  open,
  onOpenChange,
  title,
  description,
  icon,
  eyebrow = 'NGO Dashboard',
  fields,
  item,
  photoLabel,
  submitting,
  onSubmit,
}) {
  const schema = useMemo(() => buildSchema(fields), [fields])
  const sections = useMemo(() => sectionsFor(fields), [fields])
  const [photoFile, setPhotoFile] = useState(null)

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: defaultsFromItem(fields, item),
  })

  useEffect(() => {
    if (open) {
      form.reset(defaultsFromItem(fields, item))
      setPhotoFile(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, item])

  const submit = form.handleSubmit((values) => {
    const payload = {}
    for (const f of fields) {
      const raw = values[f.name]
      if (raw === undefined || raw === '') continue
      const key = f.apiName || f.name
      payload[key] = f.toApi ? f.toApi(raw) : raw
    }
    onSubmit(payload, photoFile)
  })

  return (
    <DrawerFormShell
      open={open}
      onOpenChange={onOpenChange}
      icon={icon}
      eyebrow={eyebrow}
      title={title}
      description={description}
      footer={
        <>
          <Button type="button" variant="outline" size="sm" className={fieldButtonClassName} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form="resource-form-sheet" size="sm" disabled={submitting} className={fieldButtonClassName}>
            {submitting ? 'Saving…' : item ? 'Save changes' : 'Create'}
          </Button>
        </>
      }
    >
      <form id="resource-form-sheet" onSubmit={submit}>
        {photoLabel && (
          <FormSection first>
            <PhotoUploadField label={photoLabel} value={photoFile} onChange={setPhotoFile} currentUrl={item?.photoUrl || item?.coverPhotoUrl} />
          </FormSection>
        )}

        {sections.map((section, idx) => (
          <FormSection key={section.label || idx} label={section.label} first={idx === 0 && !photoLabel}>
            {rowsFor(section.fields).map((row) => (
              <div key={row[0].name} className={row.length > 1 ? 'grid grid-cols-2 gap-2.5' : undefined}>
                {row.map((f) => (
                  <FieldInput key={f.name} form={form} field={f} />
                ))}
              </div>
            ))}
          </FormSection>
        ))}
      </form>
    </DrawerFormShell>
  )
}
