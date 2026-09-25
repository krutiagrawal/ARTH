'use client'

import MyReportsClient from '@/components/dashboard/MyReportsClient'
import { proxy } from '../proxy'

export default function ReportsClient() {
  return <MyReportsClient proxy={proxy} />
}
