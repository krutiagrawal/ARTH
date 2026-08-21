'use client'
import { useState } from 'react'
import { Mail, MapPin, Phone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import SectionWrapper from '@/components/site/SectionWrapper'

function App() {
  const [sent, setSent] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, subject, message }),
      })
      if (res.ok) setSent(true)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="pt-32">
      <SectionWrapper eyebrow="Contact" title="Write us a letter." align="center" lede="Slow replies, kindly meant. We usually respond within a few days." />
      <div className="container grid gap-10 md:grid-cols-12 max-w-5xl">
        <div className="md:col-span-5 space-y-6">
          <div className="flex items-start gap-4"><span className="h-10 w-10 grid place-items-center rounded-full bg-primary/15 text-primary"><Mail className="h-4 w-4" /></span><div><div className="text-xs uppercase tracking-widest text-muted-foreground">Email</div><div className="font-serif text-lg">hello@arth.earth</div></div></div>
          <div className="flex items-start gap-4"><span className="h-10 w-10 grid place-items-center rounded-full bg-primary/15 text-primary"><Phone className="h-4 w-4" /></span><div><div className="text-xs uppercase tracking-widest text-muted-foreground">Phone</div><div className="font-serif text-lg">+91 98230 00000</div></div></div>
          <div className="flex items-start gap-4"><span className="h-10 w-10 grid place-items-center rounded-full bg-primary/15 text-primary"><MapPin className="h-4 w-4" /></span><div><div className="text-xs uppercase tracking-widest text-muted-foreground">Studio</div><div className="font-serif text-lg">A room with a window,<br/>Bengaluru · Karnataka</div></div></div>
        </div>
        <form onSubmit={submit} className="md:col-span-7 rounded-3xl border border-border/70 bg-card p-8 soft-shadow space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block"><span className="text-xs uppercase tracking-widest text-muted-foreground">Your name</span><input required value={name} onChange={e => setName(e.target.value)} className="mt-2 w-full h-11 rounded-xl border border-border bg-background px-3 outline-none focus:ring-2 focus:ring-primary/40" /></label>
            <label className="block"><span className="text-xs uppercase tracking-widest text-muted-foreground">Email</span><input required type="email" value={email} onChange={e => setEmail(e.target.value)} className="mt-2 w-full h-11 rounded-xl border border-border bg-background px-3 outline-none focus:ring-2 focus:ring-primary/40" /></label>
          </div>
          <label className="block"><span className="text-xs uppercase tracking-widest text-muted-foreground">Subject</span><input value={subject} onChange={e => setSubject(e.target.value)} className="mt-2 w-full h-11 rounded-xl border border-border bg-background px-3 outline-none focus:ring-2 focus:ring-primary/40" /></label>
          <label className="block"><span className="text-xs uppercase tracking-widest text-muted-foreground">Message</span><textarea required rows={6} value={message} onChange={e => setMessage(e.target.value)} className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-primary/40" /></label>
          <Button className="rounded-full" type="submit" disabled={submitting}>{sent ? 'Sent, with thanks' : submitting ? 'Sending…' : 'Send letter'}</Button>
        </form>
      </div>
    </div>
  )
}
export default App
