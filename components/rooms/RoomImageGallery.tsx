'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Image from 'next/image'
import { X, ChevronLeft, ChevronRight, ZoomIn } from 'lucide-react'

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
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)
  const thumbnailRef = useRef<HTMLDivElement>(null)

  // Build image list: featured first, then gallery
  const allImages = imageUrl
    ? [imageUrl, ...galleryImages.filter((url) => url !== imageUrl)]
    : galleryImages

  const hasImages = allImages.length > 0
  const hasMultiple = allImages.length > 1
  const mainImage = hasImages ? allImages[currentIndex] : null

  // Reset index if images change
  useEffect(() => {
    if (currentIndex >= allImages.length) {
      setCurrentIndex(0)
    }
  }, [allImages.length, currentIndex])

  // Keyboard navigation
  useEffect(() => {
    if (!lightboxOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox()
      if (e.key === 'ArrowRight') goNext()
      if (e.key === 'ArrowLeft') goPrev()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lightboxOpen, allImages.length])

  const openLightbox = (index: number) => {
    setCurrentIndex(index)
    setLightboxOpen(true)
  }

  const closeLightbox = () => setLightboxOpen(false)

  const goNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % allImages.length)
  }, [allImages.length])

  const goPrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + allImages.length) % allImages.length)
  }, [allImages.length])

  // Scroll thumbnail into view when current index changes
  useEffect(() => {
    if (thumbnailRef.current && currentIndex < thumbnailRef.current.children.length) {
      const activeThumb = thumbnailRef.current.children[currentIndex] as HTMLElement | undefined
      if (activeThumb) {
        activeThumb.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
      }
    }
  }, [currentIndex])

  // Touch handlers for swipe
  const minSwipeDistance = 50

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null)
    const touch = e.targetTouches[0]
    if (touch) setTouchStart(touch.clientX)
  }

  const onTouchMove = (e: React.TouchEvent) => {
    const touch = e.targetTouches[0]
    if (touch) setTouchEnd(touch.clientX)
  }

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return
    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > minSwipeDistance
    const isRightSwipe = distance < -minSwipeDistance

    if (isLeftSwipe && hasMultiple) goNext()
    if (isRightSwipe && hasMultiple) goPrev()
  }

  // Placeholder for no images
  const placeholderSvg = `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
      <rect fill="#e5e7eb" width="400" height="300"/>
      <text fill="#9ca3af" font-family="Arial,sans-serif" font-size="14" x="50%" y="50%" text-anchor="middle" dy=".3em">No Image</text>
    </svg>`
  )}`

  return (
    <div className="space-y-4">
      {/* Main Hero Image */}
      <div
        className={`relative aspect-[16/9] max-h-[300px] sm:max-h-[450px] lg:max-h-[550px] rounded-2xl overflow-hidden bg-gradient-to-br ${colorGradient} cursor-pointer group`}
        onClick={() => hasImages && openLightbox(currentIndex)}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {mainImage ? (
          <>
            <Image
              src={mainImage}
              alt={imageAlt || `${roomType} room image`}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 70vw"
              priority
            />
            {/* Gradient overlay for text readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
            
            {/* Zoom icon on hover */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 flex items-center justify-center">
              <div className="bg-white/90 rounded-full p-3 opacity-0 group-hover:opacity-100 transition-all duration-300 transform scale-90 group-hover:scale-100">
                <ZoomIn className="w-6 h-6 text-[#0A3D62]" />
              </div>
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

        {/* Image counter badge */}
        {hasImages && hasMultiple && (
          <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-sm text-white text-sm px-3 py-1.5 rounded-full font-medium">
            {currentIndex + 1} / {allImages.length}
          </div>
        )}

        {/* Desktop navigation arrows on hero */}
        {hasMultiple && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); goPrev() }}
              className="hidden lg:flex absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-[#0A3D62] p-3 rounded-full shadow-lg transition-all duration-200 hover:scale-110 opacity-0 group-hover:opacity-100 items-center justify-center"
              aria-label="Previous image"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); goNext() }}
              className="hidden lg:flex absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-[#0A3D62] p-3 rounded-full shadow-lg transition-all duration-200 hover:scale-110 opacity-0 group-hover:opacity-100 items-center justify-center"
              aria-label="Next image"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}

        {/* Mobile swipe indicator */}
        {hasMultiple && (
          <div className="lg:hidden absolute bottom-4 left-4 bg-black/60 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-full">
            Swipe to navigate
          </div>
        )}

        {/* Fullscreen button */}
        {hasImages && (
          <button
            onClick={(e) => { e.stopPropagation(); openLightbox(currentIndex) }}
            className="absolute top-4 right-4 bg-black/60 hover:bg-black/80 backdrop-blur-sm text-white text-sm px-3 py-1.5 rounded-full flex items-center gap-2 transition-all duration-200"
          >
            <ZoomIn className="w-4 h-4" />
            <span className="hidden sm:inline">Fullscreen</span>
          </button>
        )}
      </div>

      {/* Dot indicators for mobile */}
      {hasMultiple && (
        <div className="flex lg:hidden justify-center gap-1.5">
          {allImages.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`h-2 rounded-full transition-all duration-200 ${
                index === currentIndex 
                  ? 'bg-[#0A3D62] w-6' 
                  : 'bg-gray-300 hover:bg-gray-400 w-2'
              }`}
              aria-label={`Go to image ${index + 1}`}
            />
          ))}
        </div>
      )}

      {/* Thumbnail Carousel */}
      {hasMultiple && (
        <div className="relative">
          {/* Desktop arrows for thumbnail strip */}
          <button
            onClick={goPrev}
            className="hidden lg:flex absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 bg-white hover:bg-[#0A3D62] text-[#0A3D62] hover:text-white p-2 rounded-full shadow-lg border border-gray-200 transition-all duration-200 hover:scale-110 items-center justify-center"
            aria-label="Scroll thumbnails left"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div
            ref={thumbnailRef}
            className="flex gap-3 overflow-x-auto pb-2 px-1 scrollbar-thin scrollbar-thumb-[#0A3D62] scrollbar-track-gray-200"
          >
            {allImages.map((url, index) => (
              <button
                key={`${url}-${index}`}
                onClick={() => setCurrentIndex(index)}
                className={`relative flex-shrink-0 w-20 h-20 sm:w-24 sm:h-24 lg:w-28 lg:h-28 rounded-xl overflow-hidden transition-all duration-200 ${
                  index === currentIndex 
                    ? 'ring-3 ring-[#0A3D62] ring-offset-2 scale-105 shadow-lg' 
                    : 'ring-1 ring-gray-200 hover:ring-[#0A3D62]/50 hover:scale-105'
                }`}
              >
                <Image
                  src={url}
                  alt={`${roomType} thumbnail ${index + 1}`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 80px, (max-width: 1024px) 96px, 112px"
                />
                {index === 0 && (
                  <div className="absolute top-1 left-1 bg-[#D4AF37] text-white text-[10px] px-1.5 py-0.5 rounded font-semibold">
                    Primary
                  </div>
                )}
                {index === currentIndex && (
                  <div className="absolute inset-0 bg-[#0A3D62]/10" />
                )}
              </button>
            ))}
          </div>

          <button
            onClick={goNext}
            className="hidden lg:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-10 bg-white hover:bg-[#0A3D62] text-[#0A3D62] hover:text-white p-2 rounded-full shadow-lg border border-gray-200 transition-all duration-200 hover:scale-110 items-center justify-center"
            aria-label="Scroll thumbnails right"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Lightbox Modal */}
      {lightboxOpen && hasImages && (
        <div
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex items-center justify-center"
          onClick={closeLightbox}
        >
          {/* Close button */}
          <button
            className="absolute top-4 right-4 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors z-20"
            onClick={closeLightbox}
            aria-label="Close lightbox"
          >
            <X className="w-6 h-6 text-white" />
          </button>

          {/* Navigation arrows */}
          {hasMultiple && (
            <>
              <button
                className="absolute left-4 lg:left-8 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors z-20"
                onClick={(e) => { e.stopPropagation(); goPrev() }}
                aria-label="Previous image"
              >
                <ChevronLeft className="w-8 h-8 text-white" />
              </button>
              <button
                className="absolute right-4 lg:right-8 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors z-20"
                onClick={(e) => { e.stopPropagation(); goNext() }}
                aria-label="Next image"
              >
                <ChevronRight className="w-8 h-8 text-white" />
              </button>
            </>
          )}

          {/* Main lightbox image */}
          <div
            className="w-full max-w-6xl h-[85vh] mx-4 relative"
            onClick={(e) => e.stopPropagation()}
          >
            {allImages[currentIndex] && (
              <Image
                src={allImages[currentIndex]!}
                alt={imageAlt || `${roomType} room image ${currentIndex + 1}`}
                fill
                className="object-contain"
                sizes="90vw"
                priority
              />
            )}
          </div>

          {/* Image counter */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-sm text-white text-sm px-5 py-2.5 rounded-full font-medium">
            {currentIndex + 1} / {allImages.length}
          </div>

          {/* Thumbnail strip in lightbox */}
          {hasMultiple && (
            <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex gap-2 px-4 py-2 bg-black/40 backdrop-blur-sm rounded-full">
              {allImages.map((url, index) => (
                <button
                  key={`lightbox-thumb-${index}`}
                  onClick={(e) => { e.stopPropagation(); setCurrentIndex(index) }}
                  className={`w-12 h-12 rounded-lg overflow-hidden transition-all duration-200 ${
                    index === currentIndex 
                      ? 'ring-2 ring-white scale-110' 
                      : 'opacity-60 hover:opacity-100'
                  }`}
                >
                  <Image
                    src={url}
                    alt={`Thumbnail ${index + 1}`}
                    width={48}
                    height={48}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}