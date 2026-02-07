import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { X } from "lucide-react";

interface PhotoLightboxProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url: string | null;
}

export function PhotoLightbox({ open, onOpenChange, url }: PhotoLightboxProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-3xl border-none bg-transparent shadow-none p-0"
      >
        <DialogTitle className="sr-only">Fotoğraf önizleme</DialogTitle>
        <DialogDescription className="sr-only">
          Denetim fotoğrafını büyük olarak görüntülüyorsunuz.
        </DialogDescription>
        
        <button
          type="button"
          className="absolute right-4 top-4 rounded-full bg-black/60 text-white p-1.5 hover:bg-black/80 transition"
          onClick={() => onOpenChange(false)}
        >
          <X className="w-4 h-4" />
        </button>

        {url && (
          <div className="flex items-center justify-center">
            <img
              src={url}
              alt="Fotoğraf"
              className="max-h-[80vh] w-auto rounded-2xl shadow-2xl border border-white/10"
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
