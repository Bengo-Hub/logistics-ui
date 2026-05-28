"use client";

import * as RadixDialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from "react";

const Sheet = RadixDialog.Root;
const SheetTrigger = RadixDialog.Trigger;
const SheetClose = RadixDialog.Close;
const SheetPortal = RadixDialog.Portal;

const SheetOverlay = forwardRef<
  ElementRef<typeof RadixDialog.Overlay>,
  ComponentPropsWithoutRef<typeof RadixDialog.Overlay>
>(({ className, ...props }, ref) => (
  <RadixDialog.Overlay
    ref={ref}
    className={cn("fixed inset-0 z-50 bg-black/50 backdrop-blur-sm", className)}
    {...props}
  />
));
SheetOverlay.displayName = "SheetOverlay";

interface SheetContentProps extends ComponentPropsWithoutRef<typeof RadixDialog.Content> {
  side?: "top" | "right" | "bottom" | "left";
}

const sheetSideClasses = {
  top: "inset-x-0 top-0 border-b rounded-b-2xl data-[state=closed]:-translate-y-full data-[state=open]:translate-y-0",
  bottom: "inset-x-0 bottom-0 border-t rounded-t-2xl data-[state=closed]:translate-y-full data-[state=open]:translate-y-0",
  left: "inset-y-0 left-0 h-full border-r rounded-r-2xl data-[state=closed]:-translate-x-full data-[state=open]:translate-x-0 w-[min(80vw,420px)]",
  right: "inset-y-0 right-0 h-full border-l rounded-l-2xl data-[state=closed]:translate-x-full data-[state=open]:translate-x-0 w-[min(80vw,480px)]",
};

const SheetContent = forwardRef<
  ElementRef<typeof RadixDialog.Content>,
  SheetContentProps
>(({ className, children, side = "right", ...props }, ref) => (
  <SheetPortal>
    <SheetOverlay />
    <RadixDialog.Content
      ref={ref}
      className={cn(
        "fixed z-50 bg-card border-border shadow-xl transition ease-in-out duration-300 overflow-y-auto",
        sheetSideClasses[side],
        className
      )}
      {...props}
    >
      {children}
      <RadixDialog.Close className="absolute right-4 top-4 rounded-lg p-1.5 opacity-70 hover:opacity-100 hover:bg-muted transition-all focus:outline-none focus:ring-2 focus:ring-ring z-10">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </RadixDialog.Close>
    </RadixDialog.Content>
  </SheetPortal>
));
SheetContent.displayName = "SheetContent";

function SheetHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col space-y-1.5 p-6 pb-4", className)} {...props} />;
}

function SheetBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-6 pb-6", className)} {...props} />;
}

function SheetFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end gap-2 px-6 pb-6 pt-4 border-t border-border mt-auto", className)} {...props} />
  );
}

const SheetTitle = forwardRef<
  ElementRef<typeof RadixDialog.Title>,
  ComponentPropsWithoutRef<typeof RadixDialog.Title>
>(({ className, ...props }, ref) => (
  <RadixDialog.Title ref={ref} className={cn("text-lg font-semibold leading-none tracking-tight", className)} {...props} />
));
SheetTitle.displayName = "SheetTitle";

const SheetDescription = forwardRef<
  ElementRef<typeof RadixDialog.Description>,
  ComponentPropsWithoutRef<typeof RadixDialog.Description>
>(({ className, ...props }, ref) => (
  <RadixDialog.Description ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
));
SheetDescription.displayName = "SheetDescription";

export {
  Sheet,
  SheetPortal,
  SheetOverlay,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetBody,
  SheetFooter,
  SheetTitle,
  SheetDescription,
};
