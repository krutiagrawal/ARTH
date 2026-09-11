'use client'

import { useEffect, useRef } from 'react'
import QRCode from 'qrcode'

/**
 * Renders `value` as a QR code onto a <canvas>. Used for sapling-unit handoff
 * QR codes (order detail + the printable QR sheet) — generation/display only,
 * this app never scans a QR code (that's mobile-only, see the sapling unit
 * status flow). `value` is the sapling passport URL the code resolves to.
 */
export default function QrCodeCanvas({ value, size = 160, className }) {
  const ref = useRef(null)

  useEffect(() => {
    if (!ref.current || !value) return
    QRCode.toCanvas(ref.current, value, { width: size, margin: 1 }, () => {})
  }, [value, size])

  return <canvas ref={ref} width={size} height={size} className={className} aria-label="QR code" />
}
