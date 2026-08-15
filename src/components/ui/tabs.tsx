"use client";

import * as TabsPrimitive from "@radix-ui/react-tabs";
import type { ComponentPropsWithoutRef, ElementRef } from "react";
import { forwardRef } from "react";

function cn(...classes: Array<string | undefined | false | null>) {
  return classes.filter(Boolean).join(" ");
}

const Tabs = TabsPrimitive.Root;

const TabsList = forwardRef<
  ElementRef<typeof TabsPrimitive.List>,
  ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "grid min-h-12 w-full grid-cols-2 items-center gap-1 rounded-[22px] border border-[color:var(--lien-border)] bg-[color:var(--lien-surface-soft)] p-1.5 text-[color:var(--lien-muted)] shadow-lien-sm sm:grid-cols-4 md:inline-flex md:overflow-x-auto md:rounded-full",
      className
    )}
    {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = forwardRef<
  ElementRef<typeof TabsPrimitive.Trigger>,
  ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "lien-segment inline-flex h-11 w-full shrink-0 items-center justify-center rounded-full px-3 text-sm font-semibold transition hover:bg-white/80 hover:text-[color:var(--lien-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ead0c7] disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-[color:var(--lien-primary)] data-[state=active]:text-white data-[state=active]:shadow-sm md:w-auto",
      className
    )}
    {...props}
  />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = forwardRef<
  ElementRef<typeof TabsPrimitive.Content>,
  ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-0 data-[state=inactive]:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ead0c7]",
      className
    )}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsContent, TabsList, TabsTrigger };
