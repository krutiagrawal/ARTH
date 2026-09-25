'use client'

import MyReportsClient from '@/components/dashboard/MyReportsClient'
import { proxy } from '@/lib/memberProxy'

export default function ReportsClient() {
  return <MyReportsClient proxy={proxy} />
}
