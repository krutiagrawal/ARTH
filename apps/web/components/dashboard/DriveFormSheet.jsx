'use client'

import { useEffect, useMemo, useState } from 'react'
import { useForm, useFieldArray, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Trash2, ArrowUp, ArrowDown, Users } from 'lucide-react'
import DrawerFormShell, { FormSection, FieldLabel, fieldInputClassName, fieldTextareaClassName, fieldButtonClassName } from './DrawerFormShell'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import PhotoUploadField from './PhotoUploadField'
import CitySelect from './CitySelect'

const numberField = (message) =>
  z.preprocess(
    (v) => (v === '' || v === undefined || v === null ? undefined : Number(v)),
    z.number({ required_error: message }).refine((v) => !Number.isNaN(v), message),
  )

const driveSchema = z
  .object({
    title: z.string().min(1, 'Title is required'),
    description: z.string().min(1, 'Description is required'),
    instructions: z.string().optional(),
    address: z.string().min(1, 'Address is required'),
    city: z.string().min(1, 'City is required'),
    transportMode: z.enum(['self_arrange', 'ngo_provided']),
    pickupPoints: z.array(
      z.object({
        address: z.string().min(1, 'Pickup address is required'),
        arrivalBy: z.string().min(1, 'Arrival time is required'),
      }),
    ),
    plants: z.array(
      z.object({
        speciesName: z.string().min(1, 'Species is required'),
        priceRupees: numberField('Price is required'),
      }),
    ),
    startsAt: z.string().min(1, 'Start time is required'),
    durationMinutes: z.preprocess((v) => (v === '' || v == null ? undefined : Number(v)), z.number().optional()),
    capacity: z.preprocess((v) => (v === '' || v == null ? undefined : Number(v)), z.number().optional()),
  })
  .refine((data) => data.transportMode !== 'ngo_provided' || data.pickupPoints.length > 0, {
    message: 'Add at least one pickup point, or switch to "Volunteers make their own way"',
    path: ['pickupPoints'],
  })

function toDatetimeLocal(value) {
  return value ? new Date(value).toISOString().slice(0, 16) : ''
}

function defaultsFromItem(item) {
  if (!item) {
    return {
      title: '',
      description: '',
      instructions: '',
      address: '',
      city: 'Pune',
      transportMode: 'self_arrange',
      pickupPoints: [],
      plants: [],
      startsAt: '',
      durationMinutes: undefined,
      capacity: undefined,
    }
  }
  return {
    title: item.title ?? '',
    description: item.description ?? '',
    instructions: item.instructions ?? '',
    address: item.address ?? '',
    city: item.city || 'Pune',
    transportMode: item.transportMode ?? 'self_arrange',
    pickupPoints: (item.pickupPoints ?? []).map((p) => ({ address: p.address, arrivalBy: toDatetimeLocal(p.arrivalBy) })),
    plants: (item.plants ?? []).map((p) => ({ speciesName: p.speciesName, priceRupees: p.priceCents / 100 })),
    startsAt: toDatetimeLocal(item.startsAt),
    durationMinutes: item.durationMinutes ?? undefined,
    capacity: item.capacity ?? undefined,
  }
}

/**
 * Bespoke create/edit drawer for Drives — unlike Adoptable Trees/Campaigns
 * (still on the generic ResourceFormSheet), drives need conditional sections
 * and dynamic pickup-point/plant lists that a flat field-config can't express.
 */
export default function DriveFormSheet({ open, onOpenChange, item, submitting, onSubmit }) {
  const [photoFile, setPhotoFile] = useState(null)

  const form = useForm({
    resolver: zodResolver(driveSchema),
    defaultValues: useMemo(() => defaultsFromItem(item), [item]),
  })

  useEffect(() => {
    if (open) {
      form.reset(defaultsFromItem(item))
      setPhotoFile(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, item])

  const pickupPoints = useFieldArray({ control: form.control, name: 'pickupPoints' })
  const plants = useFieldArray({ control: form.control, name: 'plants' })
  const transportMode = form.watch('transportMode')

  const movePickup = (from, to) => {
    if (to < 0 || to >= pickupPoints.fields.length) return
    pickupPoints.move(from, to)
  }

  const submit = form.handleSubmit((values) => {
    const payload = {
      title: values.title,
      description: values.description,
      address: values.address,
      city: values.city,
      transportMode: values.transportMode,
      startsAt: new Date(values.startsAt).toISOString(),
    }
    if (values.instructions) payload.instructions = values.instructions
    if (values.durationMinutes) payload.durationMinutes = values.durationMinutes
    if (values.capacity) payload.capacity = values.capacity
    if (values.transportMode === 'ngo_provided' && values.pickupPoints.length) {
      payload.pickupPoints = JSON.stringify(
        values.pickupPoints.map((p, i) => ({ address: p.address, arrivalBy: new Date(p.arrivalBy).toISOString(), order: i })),
      )
    }
    if (values.plants.length) {
      payload.plants = JSON.stringify(
        values.plants.map((p) => ({ speciesName: p.speciesName, priceCents: Math.round(Number(p.priceRupees) * 100) })),
      )
    }
    onSubmit(payload, photoFile)
  })

  return (
    <DrawerFormShell
      open={open}
      onOpenChange={onOpenChange}
      icon={Users}
      eyebrow="NGO Dashboard"
      title={item ? 'Edit drive' : 'New drive'}
      description={item ? 'Update the details volunteers see for this drive.' : 'Publish a new planting drive for volunteers to join.'}
      footer={
        <>
          <Button type="button" variant="outline" size="sm" className={fieldButtonClassName} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form="drive-form-sheet" size="sm" disabled={submitting} className={fieldButtonClassName}>
            {submitting ? 'Saving…' : item ? 'Save changes' : 'Create'}
          </Button>
        </>
      }
    >
      <form id="drive-form-sheet" onSubmit={submit}>
        <FormSection first>
          <PhotoUploadField label="Cover photo" value={photoFile} onChange={setPhotoFile} currentUrl={item?.photoUri} />
        </FormSection>

        <FormSection label="Details">
          <label className="block">
            <FieldLabel required>Title</FieldLabel>
            <input {...form.register('title')} className={fieldInputClassName} />
            {form.formState.errors.title && <p className="mt-1 text-xs text-destructive">{form.formState.errors.title.message}</p>}
          </label>
          <label className="block">
            <FieldLabel required>Description</FieldLabel>
            <textarea {...form.register('description')} rows={3} className={fieldTextareaClassName} />
            {form.formState.errors.description && <p className="mt-1 text-xs text-destructive">{form.formState.errors.description.message}</p>}
          </label>
          <label className="block">
            <FieldLabel>Instructions for volunteers</FieldLabel>
            <textarea
              {...form.register('instructions')}
              rows={3}
              placeholder="What to carry, expected weather, meeting notes…"
              className={fieldTextareaClassName}
            />
          </label>
        </FormSection>

        <FormSection label="Location">
          <label className="block">
            <FieldLabel required>Address</FieldLabel>
            <textarea {...form.register('address')} rows={2} placeholder="Plot / street / landmark" className={fieldTextareaClassName} />
            {form.formState.errors.address && <p className="mt-1 text-xs text-destructive">{form.formState.errors.address.message}</p>}
          </label>
          <label className="block">
            <FieldLabel required>City</FieldLabel>
            <Controller
              control={form.control}
              name="city"
              render={({ field }) => <CitySelect value={field.value} onChange={field.onChange} className="mt-2 h-9" />}
            />
            {form.formState.errors.city && <p className="mt-1 text-xs text-destructive">{form.formState.errors.city.message}</p>}
          </label>
        </FormSection>

        <FormSection label="Transport">
          <Controller
            control={form.control}
            name="transportMode"
            render={({ field }) => (
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'self_arrange', label: 'Volunteers make their own way' },
                  { value: 'ngo_provided', label: "We'll help volunteers get there" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => field.onChange(opt.value)}
                    className={cn(
                      'rounded-[10px] border px-3 py-2.5 text-left text-[12px] font-medium leading-snug transition',
                      field.value === opt.value
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border/70 bg-background text-muted-foreground hover:border-primary/40',
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          />

          {transportMode === 'ngo_provided' && (
            <div className="mt-1 space-y-2.5">
              {form.formState.errors.pickupPoints?.message && (
                <p className="text-xs text-destructive">{form.formState.errors.pickupPoints.message}</p>
              )}
              {pickupPoints.fields.map((field, index) => (
                <div key={field.id} className="rounded-[10px] border border-border/60 bg-secondary/20 p-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Stop {index + 1}
                    </span>
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => movePickup(index, index - 1)} disabled={index === 0} className="rounded p-1 text-muted-foreground hover:text-foreground disabled:opacity-30">
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button type="button" onClick={() => movePickup(index, index + 1)} disabled={index === pickupPoints.fields.length - 1} className="rounded p-1 text-muted-foreground hover:text-foreground disabled:opacity-30">
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                      <button type="button" onClick={() => pickupPoints.remove(index)} className="rounded p-1 text-destructive hover:bg-destructive/10">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <label className="mt-1.5 block">
                    <FieldLabel required>Pickup address</FieldLabel>
                    <input {...form.register(`pickupPoints.${index}.address`)} className={fieldInputClassName} />
                  </label>
                  <label className="mt-1.5 block">
                    <FieldLabel required>Reach by</FieldLabel>
                    <input type="datetime-local" {...form.register(`pickupPoints.${index}.arrivalBy`)} className={fieldInputClassName} />
                  </label>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={fieldButtonClassName}
                onClick={() => pickupPoints.append({ address: '', arrivalBy: '' })}
              >
                <Plus className="h-3.5 w-3.5" /> Add pickup point
              </Button>
            </div>
          )}
        </FormSection>

        <FormSection label="Plants to sponsor (optional)">
          <p className="text-[11px] leading-snug text-muted-foreground">
            List the plants you'll be planting. Volunteers can pay to sponsor a specific plant when they RSVP.
          </p>
          <div className="space-y-2.5">
            {plants.fields.map((field, index) => (
              <div key={field.id} className="flex items-end gap-2 rounded-[10px] border border-border/60 bg-secondary/20 p-2.5">
                <label className="block flex-1">
                  <FieldLabel required>Plant / species</FieldLabel>
                  <input {...form.register(`plants.${index}.speciesName`)} className={fieldInputClassName} />
                </label>
                <label className="block w-24">
                  <FieldLabel required>₹ price</FieldLabel>
                  <input type="number" min="1" {...form.register(`plants.${index}.priceRupees`)} className={fieldInputClassName} />
                </label>
                <button type="button" onClick={() => plants.remove(index)} className="mb-1 rounded p-1.5 text-destructive hover:bg-destructive/10">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={fieldButtonClassName}
            onClick={() => plants.append({ speciesName: '', priceRupees: '' })}
          >
            <Plus className="h-3.5 w-3.5" /> Add plant
          </Button>
        </FormSection>

        <FormSection label="Schedule & capacity">
          <label className="block">
            <FieldLabel required>Starts at</FieldLabel>
            <input type="datetime-local" {...form.register('startsAt')} className={fieldInputClassName} />
            {form.formState.errors.startsAt && <p className="mt-1 text-xs text-destructive">{form.formState.errors.startsAt.message}</p>}
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            <label className="block">
              <FieldLabel>Duration</FieldLabel>
              <input type="number" placeholder="Minutes" {...form.register('durationMinutes')} className={fieldInputClassName} />
            </label>
            <label className="block">
              <FieldLabel>Capacity</FieldLabel>
              <input type="number" placeholder="No limit" {...form.register('capacity')} className={fieldInputClassName} />
            </label>
          </div>
        </FormSection>
      </form>
    </DrawerFormShell>
  )
}
