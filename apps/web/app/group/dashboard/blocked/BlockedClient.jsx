'use client'

import BlockedAccountsClient from '@/components/dashboard/BlockedAccountsClient'
import { proxy } from '../proxy'

export default function BlockedClient() {
  return <BlockedAccountsClient proxy={proxy} />
}
