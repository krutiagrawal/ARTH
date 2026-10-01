'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import StepWizardShell from '@/components/forms/StepWizardShell'
import ChipSelect from '@/components/forms/ChipSelect'
import { proxy } from '@/lib/memberProxy'

const STEPS = ['space', 'experience', 'about']

const STEP_COPY = {
  space: { emoji: '🌱', title: 'Where will you plant?', subtitle: 'Helps us recommend species that will actually thrive for you.' },
  experience: { emoji: '🌿', title: 'Tell us a bit about you', subtitle: 'So we can tailor tips and content to your level.' },
  about: { emoji: '🎯', title: 'Set a planting goal', subtitle: "Entirely optional — you can always fill this in later from Settings." },
}

const SPACE_OPTIONS = [
  { value: 'balcony', label: 'Balcony' },
  { value: 'terrace', label: 'Terrace' },
  { value: 'garden', label: 'Garden' },
  { value: 'farmland', label: 'Farmland' },
  { value: 'none', label: "I don't have space" },
]

const SUNLIGHT_OPTIONS = [
  { value: 'full_sun', label: 'Full sun' },
  { value: 'partial_shade', label: 'Partial shade' },
  { value: 'shade', label: 'Mostly shade' },
]

const EXPERIENCE_OPTIONS = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'experienced', label: 'Experienced' },
]

const MOTIVATION_OPTIONS = [
  { value: 'home_gardening', label: 'Home gardening' },
  { value: 'environmental_cause', label: 'Environmental cause' },
  { value: 'school_or_csr_project', label: 'School / CSR project' },
  { value: 'hobby', label: 'Just a hobby' },
  { value: 'other', label: 'Other' },
]

const SPECIES_OPTIONS = [
  { value: 'fruit', label: 'Fruit' },
  { value: 'flowering', label: 'Flowering' },
  { value: 'shade', label: 'Shade' },
  { value: 'medicinal', label: 'Medicinal' },
  { value: 'native', label: 'Native species' },
]

const initialForm = {
  plantingSpace: '',
  homeSunlight: '',
  gardeningExperience: '',
  motivation: [],
  dateOfBirth: '',
  speciesInterest: [],
  plantingGoal: '',
}

function App() {
  const router = useRouter()
  const [stepIndex, setStepIndex] = useState(0)
  const [form, setForm] = useState(initialForm)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const step = STEPS[stepIndex]
  const copy = STEP_COPY[step]

  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }))

  const save = async (payload) => {
    setSubmitting(true)
    setError('')
    try {
      await proxy('/users/me/personalize', { method: 'PATCH', body: payload })
      router.push('/dashboard/individual')
    } catch (err) {
      setError(err.message || 'Something went wrong.')
      setSubmitting(false)
    }
  }

  const goNext = () => {
    if (stepIndex < STEPS.length - 1) {
      setStepIndex((i) => i + 1)
      return
    }
    save({
      plantingSpace: form.plantingSpace || undefined,
      homeSunlight: form.homeSunlight || undefined,
      gardeningExperience: form.gardeningExperience || undefined,
      motivation: form.motivation.length ? form.motivation : undefined,
      dateOfBirth: form.dateOfBirth || undefined,
      speciesInterest: form.speciesInterest.length ? form.speciesInterest : undefined,
      plantingGoal: form.plantingGoal ? Number(form.plantingGoal) : undefined,
    })
  }

  const goBack = () => setStepIndex((i) => i - 1)
  const skip = () => save({})

  return (
    <div className="max-w-xl mx-auto px-6 py-10">
      <div className="flex justify-end">
        <button type="button" onClick={skip} disabled={submitting} className="text-xs text-muted-foreground hover:text-foreground transition disabled:opacity-50">
          Skip for now
        </button>
      </div>

      <StepWizardShell
        stepIndex={stepIndex}
        stepCount={STEPS.length}
        emoji={copy.emoji}
        title={copy.title}
        subtitle={copy.subtitle}
        error={error}
        onBack={goBack}
        onNext={goNext}
        nextLabel={stepIndex === STEPS.length - 1 ? 'Finish' : 'Continue'}
        submitting={submitting}
      >
        {step === 'space' && (
          <>
            <ChipSelect label="Planting space" options={SPACE_OPTIONS} value={form.plantingSpace} onChange={set('plantingSpace')} />
            <ChipSelect label="Sunlight" options={SUNLIGHT_OPTIONS} value={form.homeSunlight} onChange={set('homeSunlight')} />
          </>
        )}

        {step === 'experience' && (
          <>
            <ChipSelect label="Gardening experience" options={EXPERIENCE_OPTIONS} value={form.gardeningExperience} onChange={set('gardeningExperience')} />
            <ChipSelect label="What brings you here?" options={MOTIVATION_OPTIONS} value={form.motivation} onChange={set('motivation')} multi />
          </>
        )}

        {step === 'about' && (
          <>
            <label className="block">
              <span className="eyebrow">Date of birth</span>
              <input type="date" value={form.dateOfBirth} onChange={(e) => set('dateOfBirth')(e.target.value)} className="mt-2 w-full h-11 rounded-full border border-border bg-background px-4 outline-none focus:ring-2 focus:ring-primary/40" />
            </label>
            <ChipSelect label="Species you're interested in" options={SPECIES_OPTIONS} value={form.speciesInterest} onChange={set('speciesInterest')} multi />
            <label className="block">
              <span className="eyebrow">Trees you'd like to plant this year</span>
              <input type="number" min={1} max={10000} value={form.plantingGoal} onChange={(e) => set('plantingGoal')(e.target.value)} placeholder="e.g. 12" className="mt-2 w-full h-11 rounded-full border border-border bg-background px-4 outline-none focus:ring-2 focus:ring-primary/40" />
            </label>
          </>
        )}
      </StepWizardShell>
    </div>
  )
}
export default App
