'use client'
import { useState } from 'react'
import Link from 'next/link'
import { ComposableMap, Geographies, Geography } from 'react-simple-maps'
import { geoMercator, geoPath } from 'd3-geo'
import { ArrowUpRight, MapPin, X } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

const GEO_URL = '/india-states.topojson'
const MAP_W = 800
const MAP_H = 600
const BUBBLE_LIMIT = 6

// A handful of harmonious green shades (not just one flat sage) so forest-bearing
// states read as a varied, hand-tinted map rather than a single-color choropleth.
// EMPTY_FILL stays a single warm neutral so "no forest yet" is still unambiguous.
const FOREST_SHADES = ['#B7CFA9', '#93B885', '#7FAB72', '#A8C3A0', '#6FA487', '#9FC38A', '#729C68', '#8CBE9E']
const EMPTY_FILL = '#EDE6D6'
const EMPTY_HOVER = '#E0D5BC'
const STROKE = '#6E5847'

function hashIndex(str, mod) {
  let h = 0
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0
  return h % mod
}

function darken(hex, amt) {
  const num = parseInt(hex.slice(1), 16)
  const r = Math.max(0, (num >> 16) - amt)
  const g = Math.max(0, ((num >> 8) & 0xff) - amt)
  const b = Math.max(0, (num & 0xff) - amt)
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`
}

function shadeFor(name) {
  return FOREST_SHADES[hashIndex(name, FOREST_SHADES.length)]
}

// Mirrors ComposableMap's internal projection (default 800x600 viewBox) so
// geoPath.centroid() below lands in the same coordinate space it renders in —
// that's how a click on a state finds the screen position for its bubbles.
const projection = geoMercator().center([82.8, 22.5]).scale(1050).translate([MAP_W / 2, MAP_H / 2])
const pathGen = geoPath(projection)

function ForestBubble({ forest }) {
  return (
    <div className="flex items-center gap-2 rounded-full bg-card border border-border pl-1.5 pr-1.5 py-1.5 shadow-lg">
      <img src={forest.imageUrl} alt="" className="h-8 w-8 rounded-full object-cover shrink-0" />
      <span className="text-xs font-bold text-foreground whitespace-nowrap">{forest.name}</span>
      <Link href={`/forests/${forest.id}`} aria-label={`Visit ${forest.name}`} className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary/20 text-primary hover:bg-primary hover:text-primary-foreground transition-colors">
        <ArrowUpRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  )
}

export default function IndiaMap({ forestsByState }) {
  const [hovered, setHovered] = useState(null)
  const [selected, setSelected] = useState(null) // { name, xPct, yPct }
  const [showAllOpen, setShowAllOpen] = useState(false)

  const stateForests = selected ? forestsByState[selected.name] || [] : []
  const shownForests = stateForests.length > BUBBLE_LIMIT ? stateForests.slice(0, BUBBLE_LIMIT - 1) : stateForests
  const hasMore = stateForests.length > BUBBLE_LIMIT

  const handleStateClick = (geo, name, hasForests) => {
    if (!hasForests) return
    if (selected?.name === name) { setSelected(null); return }
    const [x, y] = pathGen.centroid(geo)
    setSelected({ name, xPct: (x / MAP_W) * 100, yPct: (y / MAP_H) * 100 })
  }

  return (
    <div className="relative">
      <div className="relative w-full aspect-[4/3]">
        <ComposableMap
          projection="geoMercator"
          projectionConfig={{ center: [82.8, 22.5], scale: 1050 }}
          width={MAP_W}
          height={MAP_H}
          className="absolute inset-0 h-full w-full"
        >
          <Geographies geography={GEO_URL}>
            {({ geographies }) =>
              geographies
                .filter((geo) => geo.properties?.name)
                .map((geo) => {
                  const name = geo.properties.name
                  const count = forestsByState[name]?.length || 0
                  const hasForests = count > 0
                  const isSelected = selected?.name === name
                  const shade = hasForests ? shadeFor(name) : EMPTY_FILL
                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      onClick={() => handleStateClick(geo, name, hasForests)}
                      onMouseEnter={() => setHovered({ name, count })}
                      onMouseLeave={() => setHovered(null)}
                      className={`outline-none transition-colors duration-200 ${hasForests ? 'cursor-pointer' : 'cursor-default'}`}
                      style={{
                        default: {
                          fill: isSelected ? darken(shade, 35) : shade,
                          stroke: STROKE,
                          strokeWidth: isSelected ? 1.1 : 0.5,
                        },
                        hover: {
                          fill: isSelected ? darken(shade, 35) : hasForests ? darken(shade, 18) : EMPTY_HOVER,
                          stroke: STROKE,
                          strokeWidth: 1,
                        },
                        pressed: {
                          fill: hasForests ? darken(shade, 35) : EMPTY_FILL,
                          stroke: STROKE,
                          strokeWidth: 1.1,
                        },
                      }}
                    />
                  )
                })
            }
          </Geographies>
        </ComposableMap>

        {/* hover tooltip — the empty-state message lives here now, right on the
            state itself, instead of a separate section the visitor had to scroll to */}
        {hovered && (
          <div className="pointer-events-none absolute top-2 left-2 rounded-xl bg-foreground text-background px-3 py-1.5 text-xs font-bold shadow-lg max-w-[220px]">
            {hovered.count > 0
              ? `${hovered.name} – ${hovered.count} ${hovered.count === 1 ? 'forest' : 'forests'}`
              : `${hovered.name} – still waiting for its first forest`}
          </div>
        )}

        {/* geotag-style popup bubbles, anchored to the clicked state's centroid.
            Wraps into rows instead of a single tall stack — a max-width flex-wrap
            block rather than a flex-col. */}
        {selected && stateForests.length > 0 && (
          <div className="absolute z-20" style={{ left: `${selected.xPct}%`, top: `${selected.yPct}%` }}>
            <div className="relative flex w-max max-w-[480px] -translate-x-1/2 -translate-y-[calc(100%+10px)] flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setSelected(null)}
                aria-label="Close"
                className="absolute -top-8 right-0 grid h-6 w-6 place-items-center rounded-full bg-foreground text-background shadow-lg"
              >
                <X className="h-3.5 w-3.5" />
              </button>
              {shownForests.map((f) => <ForestBubble key={f.id} forest={f} />)}
              {hasMore && (
                <button
                  type="button"
                  onClick={() => setShowAllOpen(true)}
                  className="rounded-full bg-foreground text-background px-3.5 py-1.5 text-xs font-bold shadow-lg"
                >
                  Show all {stateForests.length}
                </button>
              )}
              <span className="absolute -bottom-1 left-1/2 h-2.5 w-2.5 -translate-x-1/2 rotate-45 border-b border-r border-border bg-card" />
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm" style={{ backgroundColor: FOREST_SHADES[3] }} /> Has forests</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm" style={{ backgroundColor: EMPTY_FILL }} /> Not yet</span>
        <span className="hidden md:inline">Tap a state to see its forests</span>
      </div>

      <Dialog open={showAllOpen} onOpenChange={setShowAllOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl font-normal">{selected?.name} – {stateForests.length} forests</DialogTitle>
          </DialogHeader>
          <div className="mt-2 space-y-3">
            {stateForests.map((f) => (
              <div key={f.id} className="flex items-center gap-4 rounded-2xl border border-border p-3">
                <img src={f.imageUrl} alt={f.name} className="h-20 w-20 shrink-0 rounded-xl object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="eyebrow flex items-center gap-1"><MapPin className="h-3 w-3" />{f.location}</p>
                  <h3 className="font-serif text-lg mt-0.5">{f.name}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">{f.story}</p>
                </div>
                <Link href={`/forests/${f.id}`} className="shrink-0 inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-primary hover:text-accent transition-colors">
                  Visit <ArrowUpRight className="h-3 w-3" />
                </Link>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
