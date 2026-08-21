'use client'

import { TreePine, MapPin, Heart, Edit3 } from 'lucide-react'
import DrawerFormShell, { FormSection, DetailRow, DetailGrid } from '@/components/dashboard/DrawerFormShell'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

const STATUS_VARIANT = { available: 'secondary', adopted: 'default', removed: 'outline' }

export default function TreeDetailSheet({ tree, onOpenChange, onEdit }) {
  return (
    <DrawerFormShell
      open={Boolean(tree)}
      onOpenChange={onOpenChange}
      icon={TreePine}
      eyebrow="NGO Dashboard"
      title={tree?.nickname}
      description="Full details and adoption activity for this tree."
      widthClassName="w-full sm:max-w-xl"
      footer={
        <>
          <Button type="button" variant="outline" size="sm" className="h-8 rounded-[8px] px-3 text-xs" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button type="button" size="sm" className="h-8 rounded-[8px] px-3 text-xs" onClick={() => onEdit(tree)}>
            <Edit3 className="h-3.5 w-3.5" /> Edit tree
          </Button>
        </>
      }
    >
      {tree && (
        <>
          <FormSection first label="Overview">
            <DetailGrid>
              <DetailRow label="Species">{tree.speciesName}</DetailRow>
              <DetailRow label="Status">
                <Badge variant={STATUS_VARIANT[tree.status] || 'outline'} className="capitalize">
                  {tree.status}
                </Badge>
              </DetailRow>
              <DetailRow label="Description" full>
                <p className="whitespace-pre-line">{tree.description}</p>
              </DetailRow>
              <DetailRow label="Instructions for adopters" full>
                <p className="whitespace-pre-line">{tree.instructions}</p>
              </DetailRow>
              <DetailRow label="Listed on">{tree.createdAt && new Date(tree.createdAt).toLocaleDateString()}</DetailRow>
            </DetailGrid>
          </FormSection>

          <FormSection label="Location">
            <DetailRow label="Location" full>
              <span className="flex items-start gap-1">
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                {[tree.location, tree.city].filter(Boolean).join(', ') || 'Not set'}
              </span>
            </DetailRow>
          </FormSection>

          <FormSection label="Adoption activity">
            {tree.adopter ? (
              <div className="rounded-[8px] border border-border/60 bg-secondary/20 p-2.5">
                <p className="flex items-center gap-1.5 text-[13px] font-medium">
                  <Heart className="h-3.5 w-3.5 text-primary" /> {tree.adopter.name}
                  <span className="font-normal text-muted-foreground">{tree.adopter.handle}</span>
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Adopted {new Date(tree.adopter.adoptedAt).toLocaleDateString()}
                </p>
                {tree.adopter.message && (
                  <p className="mt-1.5 text-[12px] italic text-foreground">&ldquo;{tree.adopter.message}&rdquo;</p>
                )}
              </div>
            ) : (
              <p className="text-[12px] text-muted-foreground">
                {tree.status === 'removed' ? 'This tree has been removed and is no longer listed.' : 'Not adopted yet — still available.'}
              </p>
            )}
          </FormSection>
        </>
      )}
    </DrawerFormShell>
  )
}
