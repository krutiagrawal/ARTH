'use client'

import { useState } from 'react'
import { Flag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import ReportDialog from '@/components/dashboard/ReportDialog'

export default function ReportButton({ ngoId, orgName }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground hover:text-destructive" onClick={() => setOpen(true)}>
        <Flag className="h-4 w-4" />
      </Button>
      <ReportDialog open={open} onOpenChange={setOpen} targetType="ngo" targetId={ngoId} targetLabel={orgName} />
    </>
  )
}
