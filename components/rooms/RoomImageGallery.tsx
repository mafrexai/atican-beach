'use client'

import { useState } from 'react'
import Image from 'next/image'
import { X, ChevronLeft, ChevronRight, ZoomIn } from 'lucide-react'
import { getOptimizedImageUrl, getPlaceholderUrl } from '@/lib/images/imageOptimizer'

interface RoomImageGalleryProps {
  roomType: string
  colorGradient: string
  imageUrl?: string | null | undefined
  galleryImages?: string[] | undefined
  imageAlt?: string | null | undefined
}

export function RoomImageGallery({
  roomType,
  colorGradient,
  imageUrl,
  galleryImages = [],
  imageAlt,
}: RoomImageGalleryProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)

  // Build image list: featured first, then gallery
  const allImages = imageUrl
    ? [imageUrl, ...galleryImages.filter((url) => url !== imageUrl)]
    : galleryImages

  const hasImages = allImages.length > 0
  const mainImage = hasImages ? allImages[currentIndex] : null

  const openLightbox = (index: number) => {
    setCurrentIndex(index)
    setLightboxOpen(true)
  }

  const closeLightbox = () => setLightboxOpen(false)

  const goNext = () => setCurrentIndex((prev) => (prev + 1) % allImages.length)
  const goPrev = () => setCurrentIndex((prev) => (prev - 1 + allImages.length) % allImages.length)

  return (
    <div className="space-y-3">
      {/* Main Image */}
      <div
        className={`relative h-80 sm:h-96 rounded-xl overflow-hidden bg-gradient-to-br ${colorGradient} cursor-pointer group`}
        onClick={() => hasImages && openLightbox(currentIndex)}
      >
        {mainImage ? (
          <>
            <Image
              src={getOptimizedImageUrl(mainImage, { width: 1200, height: 800 })}
              alt={imageAlt || `${roomType} room image`}
              fill
              className="object-cover transition-transform group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, 66vw"
              priority
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
              <ZoomIn className="w-8 h-8 text-white opacity-0 group-hover:opacity-80 transition-opacity" />
            </div>
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center text-white/60">
              <div className="w-20 h-20 mx-auto mb-3 rounded-full bg-white/10 flex items-center justify-center">
                <ZoomIn className="w-10 h-10" />
              </div>
              <p className="text-sm font-medium">No image available</p>
            </div>
          </div>
        )}

        {/* Image counter */}
        {hasImages && allImages.length > 1 && (
          <div className="absolute bottom-3 right-3 bg-black/50 text-white text-xs px-2.5 py-1 rounded-full">
            {currentIndex + 1} / {allImages.length}
          </div>
        )}
      </div>

      {/* Thumbnail Strip */}
      {hasImages && allImages.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {allImages.map((url, index) => (
            <button
              key={url}
              onClick={() => setCurrentIndex(index)}
              className={`relative w-20 h-16 rounded-lg overflow-hidden shrink-0 border-2 transition-colors ${
                index === currentIndex ? 'border-blue-500 ring-1 ring-blue-200' : 'border-transparent hover:border-gray-300'
              }`}
            >
              <Image
                src={getOptimizedImageUrl(url, { width: 150, height: 100 })}
                alt={`${roomType} thumbnail ${index + 1}`}
                fill
                className="object-cover"
                sizes="80px"
              />
            </button>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightboxOpen && hasImages && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={closeLightbox}
        >
          {/* Close */}
          <button
            className="absolute top-4 right-4 p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors z-10"
            onClick={closeLightbox}
          >
            <X className="w-6 h-6 text-white" />
          </button>

          {/* Navigation */}
          {allImages.length > 1 && (
            <>
              <button
                className="absolute left-4 p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors z-10"
                onClick={(e) => { e.stopPropagation(); goPrev() }}
              >
                <ChevronLeft className="w-6 h-6 text-white" />
              </button>
              <button
                className="absolute right-4 p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors z-10"
                onClick={(e) => { e.stopPropagation(); goNext() }}
              >
                <ChevronRight className="w-6 h-6 text-white" />
              </button>
            </>
          )}

          {/* Image */}
          <div
            className="max-w-5xl max-h-[85vh] relative"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={getOptimizedImageUrl(allImages[currentIndex], { width: 1600, height: 1200 })}
              alt={imageAlt || `${roomType} room image ${currentIndex + 1}`}
              width={1600}
              height={1200}
              className="max-w-full max-h-[85vh] object-contain rounded-lg"
            />
          </div>

          {/* Counter */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white text-sm px-4 py-2 rounded-full">
            {currentIndex + 1} / {allImages.length}
          </div>
        </div>
      )}
    </div>
  )
}