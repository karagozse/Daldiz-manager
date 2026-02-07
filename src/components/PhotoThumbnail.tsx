/**
 * PhotoThumbnail Component - Reusable photo thumbnail with actions
 * 
 * Displays a photo thumbnail with optional view/change/delete actions.
 * Used in inspection forms and read-only displays.
 */

import React from "react";
import { getPhotoUrl } from "@/lib/photoUtils";
import { Camera, X } from "lucide-react";
import { cn } from "@/lib/utils";

type PhotoThumbnailProps = {
  photoPath?: string | null;
  onView?: (e?: React.MouseEvent) => void;       // open large viewer
  onChange?: () => void;     // re-upload
  onDelete?: () => void;     // delete photo
  size?: "sm" | "md" | "lg"; // thumbnail size
};

export const PhotoThumbnail: React.FC<PhotoThumbnailProps> = ({
  photoPath,
  onView,
  onChange,
  onDelete,
  size = "md",
}) => {
  const url = getPhotoUrl(photoPath);
  
  const sizeClasses = {
    sm: "h-10 w-10",
    md: "h-16 w-16",
    lg: "h-20 w-20",
  };

  if (!url) {
    // State: no photo yet - only show "Fotoğraf ekle" if onChange is provided
    if (!onChange) {
      // Read-only mode: show nothing (no placeholder)
      return null;
    }
    
    // Edit mode: show large tappable upload area
    return (
      <button
        type="button"
        onClick={onChange}
        className={cn(
          "w-full h-28 md:h-32 rounded-xl border-2 border-dashed border-muted-foreground/40 bg-muted/50 hover:border-primary/50 hover:bg-muted transition-colors flex flex-col items-center justify-center gap-2",
          "active:bg-muted/80"
        )}
        aria-label="Fotoğraf ekle"
      >
        <Camera className="h-8 w-8 text-muted-foreground" />
        <span className="text-sm font-medium text-muted-foreground">Fotoğraf ekle</span>
      </button>
    );
  }

  // Photo exists: show thumbnail with optional actions
  // Layout: thumbnail on left, buttons stacked vertically on right
  return (
    <div className="flex flex-row items-center gap-4">
      {/* Thumbnail - clickable to open viewer */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onView?.(e);
        }}
        className={cn(
          sizeClasses[size],
          "rounded-lg overflow-hidden border border-border bg-muted hover:ring-2 ring-primary/50 transition-shadow cursor-pointer flex-shrink-0"
        )}
        aria-label="Fotoğrafı büyüt"
      >
        <img
          src={url}
          alt="Denetim fotoğrafı"
          className="h-full w-full object-cover"
        />
      </button>

      {/* Action buttons - larger and easier to tap on mobile */}
      {(onChange || onDelete) && (
        <div className="flex flex-col gap-2 w-full sm:w-auto sm:min-w-[120px]">
          {onChange && (
            <button
              type="button"
              onClick={onChange}
              className="px-4 py-2.5 rounded-lg text-sm font-medium border border-border bg-background text-foreground hover:bg-muted transition-colors active:bg-muted/80"
            >
              Değiştir
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="px-4 py-2.5 rounded-lg text-sm font-medium border border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/15 transition-colors active:bg-destructive/20 flex items-center justify-center gap-1.5"
            >
              <X className="h-4 w-4" />
              <span>Sil</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};