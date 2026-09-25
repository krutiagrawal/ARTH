'use client'

import OrgBrowseClient from '@/components/dashboard/OrgBrowseClient'
import { proxy } from '../proxy'

export default function BrowseClient() {
  return <OrgBrowseClient proxy={proxy} />
}
