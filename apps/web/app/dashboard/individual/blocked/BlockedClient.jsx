'use client'

import BlockedAccountsClient from '@/components/dashboard/BlockedAccountsClient'
import { proxy } from '@/lib/memberProxy'

export default function BlockedClient() {
  return <BlockedAccountsClient proxy={proxy} />
}
