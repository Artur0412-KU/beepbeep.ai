"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, ImageOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ListingCarousel({ images, alt }: { images: string[]; alt: string }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [failedImages, setFailedImages] = useState<string[]>([]);
  const hasImages = images.length > 0;
  const activeImage = images[activeIndex];
  const activeImageFailed = activeImage ? failedImages.includes(activeImage) : true;

  const move = (direction: number) => {
    if (!hasImages) return;
    setActiveIndex((current) => (current + direction + images.length) % images.length);
  };

  const markImageFailed = (image: string) => {
    setFailedImages((current) => current.includes(image) ? current : [...current, image]);
  };

  return (
    <div className="space-y-3">
      <div className="relative flex aspect-[16/10] items-center justify-center overflow-hidden rounded-2xl bg-[#dce9d9]">
        {activeImage && !activeImageFailed ? (
          <img src={activeImage} alt={`${alt} image ${activeIndex + 1}`} className="h-full w-full object-cover" onError={() => markImageFailed(activeImage)} />
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted"><ImageOff className="h-10 w-10" /><span>Image unavailable</span></div>
        )}
        {images.length > 1 && (
          <>
            <Button type="button" variant="outline" size="icon" aria-label="Previous image" className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-card/90" onClick={() => move(-1)}><ChevronLeft className="h-4 w-4" /></Button>
            <Button type="button" variant="outline" size="icon" aria-label="Next image" className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-card/90" onClick={() => move(1)}><ChevronRight className="h-4 w-4" /></Button>
          </>
        )}
      </div>
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Listing images">
          {images.map((image, index) => (
            <button key={image} type="button" aria-label={`Show image ${index + 1}`} aria-current={index === activeIndex} onClick={() => setActiveIndex(index)} className={cn("h-16 w-20 shrink-0 overflow-hidden rounded-md border-2 bg-[#dce9d9]", index === activeIndex ? "border-[#66891a]" : "border-transparent")}>
              {!failedImages.includes(image) ? <img src={image} alt="" className="h-full w-full object-cover" onError={() => markImageFailed(image)} /> : <ImageOff className="mx-auto h-5 w-5 text-muted" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
