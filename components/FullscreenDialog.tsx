"use client";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

// A shadcn Dialog stretched edge to edge, for photo viewers and pickers.
// Mount it when it should show; closing (Escape, close buttons) calls onClose.
export default function FullscreenDialog({
  title,
  onClose,
  className,
  onKeyDown,
  children,
}: {
  title: string;
  onClose: () => void;
  className?: string;
  onKeyDown?: React.KeyboardEventHandler<HTMLDivElement>;
  children: React.ReactNode;
}) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        onKeyDown={onKeyDown}
        className={cn(
          "top-0 left-0 flex h-dvh w-full max-w-none translate-x-0 translate-y-0 flex-col gap-0 rounded-none bg-black p-0 text-base ring-0 sm:max-w-none",
          className,
        )}
      >
        <DialogTitle className="sr-only">{title}</DialogTitle>
        {children}
      </DialogContent>
    </Dialog>
  );
}
