'use client'

import { Download } from 'lucide-react'
import QRCode from 'react-qr-code'

interface DownloadBookingQrProps {
  bookingReference: string
  value: string
}

export default function DownloadBookingQr({
  bookingReference,
  value,
}: DownloadBookingQrProps) {
  const downloadQrCode = () => {
    const svg = document.getElementById('booking-qr-code')
    if (!svg) return

    const svgData = new XMLSerializer().serializeToString(svg)
    const blob = new Blob([svgData], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `atican-beach-${bookingReference}.svg`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <button
        type="button"
        onClick={downloadQrCode}
        className="mt-4 flex items-center gap-2 text-[#0A3D62] hover:text-[#F97316] font-medium text-sm"
      >
        <Download className="w-4 h-4" />
        Download QR Code
      </button>
      <div className="hidden">
        <QRCode id="booking-qr-code" value={value} size={256} />
      </div>
    </>
  )
}
