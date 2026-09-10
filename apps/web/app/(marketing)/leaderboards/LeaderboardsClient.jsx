'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Trophy } from 'lucide-react'

function Reveal({ children, delay = 0, className }) {
  return <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.9, delay, ease: [0.22, 1, 0.36, 1] }} className={className}>{children}</motion.div>
}

export default function LeaderboardsClient({ leaderboards }) {
  const TABS = Object.keys(leaderboards)
  const [tab, setTab] = useState(TABS[0])
  const rows = leaderboards[tab]
  return (
    <div>
      <section className="pt-36 md:pt-48 pb-12 px-5 md:px-10">
        <div className="grid grid-cols-12 gap-6 items-end">
          <div className="col-span-12 md:col-span-9">
            <p className="eyebrow">Leaderboards</p>
            <Reveal><h1 className="display text-[14vw] md:text-[9vw] mt-6">Warm-hearted <em className="text-primary">rankings</em>.</h1></Reveal>
          </div>
          <Reveal className="col-span-12 md:col-span-3" delay={0.1}>
            <p className="text-muted-foreground max-w-xs">Not a competition. A quiet way to notice who has been showing up.</p>
          </Reveal>
        </div>
      </section>

      {/* Tabs */}
      <section className="px-5 md:px-10 border-y border-foreground/15">
        <div className="flex overflow-x-auto no-scrollbar gap-1 py-4">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)} className={`relative rounded-full border px-4 py-1.5 text-xs whitespace-nowrap transition ${tab === t ? 'text-background border-transparent' : 'border-foreground/25 hover:bg-foreground/5'}`}>
              {tab === t && <motion.span layoutId="lb-pill" className="absolute inset-0 -z-10 rounded-full bg-foreground" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}
              {t}
            </button>
          ))}
        </div>
      </section>

      {/* Editorial split: number 01 hero + list */}
      <section className="px-5 md:px-10 py-16 md:py-24">
        {rows.length === 0 ? (
          <p className="text-muted-foreground">No {tab.toLowerCase()} on the board yet – be the first to show up here.</p>
        ) : (
          <div className="grid grid-cols-12 gap-6 md:gap-14">
            <div className="col-span-12 md:col-span-4">
              <Reveal>
                <p className="eyebrow">Leading {tab.toLowerCase()}</p>
                <div className="flex items-end gap-4 mt-6">
                  <span className="font-serif italic text-primary text-6xl md:text-7xl">01</span>
                  <Trophy className="h-6 w-6 text-primary mb-3" />
                </div>
                <h2 className="font-serif text-4xl md:text-6xl mt-5 leading-[1]">{rows[0].name}</h2>
                <p className="eyebrow mt-3">{rows[0].place}</p>
                <div className="mt-8 border-t border-foreground/15 pt-6">
                  <p className="eyebrow">Score</p>
                  <p className="font-serif text-5xl md:text-6xl mt-2">{rows[0].score.toLocaleString()}</p>
                </div>
              </Reveal>
            </div>
            <div className="col-span-12 md:col-span-8">
              <AnimatePresence mode="wait">
                <motion.ol key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.35 }}>
                  {rows.slice(1).map((r, i) => (
                    <li key={r.name} className="grid grid-cols-12 items-baseline gap-4 py-6 border-t border-foreground/15 first:border-0">
                      <span className="col-span-1 font-serif italic text-muted-foreground">{String(i + 2).padStart(2, '0')}</span>
                      <div className="col-span-7 md:col-span-8">
                        <p className="font-serif text-2xl md:text-3xl">{r.name}</p>
                        <p className="eyebrow mt-1">{r.place}</p>
                      </div>
                      <span className="col-span-4 md:col-span-3 text-right font-serif text-xl md:text-2xl">{r.score.toLocaleString()}</span>
                    </li>
                  ))}
                </motion.ol>
              </AnimatePresence>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
