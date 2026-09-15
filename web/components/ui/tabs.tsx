"use client";

import * as React from "react";
import { Tabs as TabsPrimitive } from "@base-ui/react/tabs";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  badge?: string;
  description?: string;
}

interface TabsProps extends Omit<TabsPrimitive.Root.Props, "value" | "defaultValue" | "onChange"> {
  items?: TabItem[];
  activeId?: string;
  onChange?: (id: string) => void;
  value?: string;
  defaultValue?: string;
}

function Tabs({
  className,
  orientation = "horizontal",
  items,
  activeId,
  onChange,
  value,
  defaultValue,
  children,
  ...props
}: TabsProps) {
  // If used with items shorthand:
  if (items && items.length > 0) {
    const active = value ?? activeId ?? items[0].id;
    return (
      <TabsPrimitive.Root
        data-slot="tabs"
        data-orientation={orientation}
        value={active}
        onValueChange={(val) => {
          if (typeof val === "string") {
            onChange?.(val);
          }
        }}
        className={cn("group/tabs flex gap-2 data-horizontal:flex-col", className)}
        {...props}
      >
        <TabsList variant="line" className="w-full justify-start border-b border-[#E8E8E3] dark:border-[#292929] px-0.5 gap-6">
          {items.map((tab) => {
            const Icon = tab.icon;
            return (
              <TabsTrigger key={tab.id} value={tab.id} className="gap-1.5 pb-2 text-xs">
                {Icon && <Icon className="h-3.5 w-3.5" />}
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className="text-[9px] px-1 py-0.2 rounded font-mono bg-black/5 dark:bg-white/10">
                    {tab.badge}
                  </span>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>
        {children}
      </TabsPrimitive.Root>
    );
  }

  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      value={value}
      defaultValue={defaultValue}
      className={cn(
        "group/tabs flex gap-2 data-horizontal:flex-col",
        className
      )}
      {...props}
    >
      {children}
    </TabsPrimitive.Root>
  );
}

const tabsListVariants = cva(
  "group/tabs-list inline-flex w-fit items-center justify-center rounded-lg p-[3px] text-muted-foreground group-data-horizontal/tabs:h-8 group-data-vertical/tabs:h-fit group-data-vertical/tabs:flex-col data-[variant=line]:rounded-none",
  {
    variants: {
      variant: {
        default: "bg-muted/60 dark:bg-white/5",
        line: "gap-4 bg-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

function TabsList({
  className,
  variant = "default",
  ...props
}: TabsPrimitive.List.Props & VariantProps<typeof tabsListVariants>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    />
  );
}

function TabsTrigger({ className, ...props }: TabsPrimitive.Tab.Props) {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-trigger"
      className={cn(
        "relative inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-2.5 py-1 text-xs font-medium whitespace-nowrap text-[#6F6F6A] dark:text-[#A0A09B] transition-all group-data-vertical/tabs:w-full group-data-vertical/tabs:justify-start hover:text-[#181818] dark:hover:text-[#F2F2F0] focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-hidden disabled:pointer-events-none disabled:opacity-50 cursor-pointer select-none",
        "data-active:text-[#181818] dark:data-active:text-[#F2F2F0] data-active:font-semibold",
        "group-data-[variant=default]/tabs-list:data-active:bg-white dark:group-data-[variant=default]/tabs-list:data-active:bg-[#1E1E1E] group-data-[variant=default]/tabs-list:data-active:shadow-xs",
        "after:absolute after:bg-[#2563EB] dark:after:bg-[#5B8CFF] after:opacity-0 after:transition-opacity group-data-horizontal/tabs:after:inset-x-0 group-data-horizontal/tabs:after:bottom-[-1px] group-data-horizontal/tabs:after:h-0.5 group-data-vertical/tabs:after:inset-y-0 group-data-vertical/tabs:after:-right-1 group-data-vertical/tabs:after:w-0.5 group-data-[variant=line]/tabs-list:data-active:after:opacity-100",
        className
      )}
      {...props}
    />
  );
}

function TabsContent({ className, ...props }: TabsPrimitive.Panel.Props) {
  return (
    <TabsPrimitive.Panel
      data-slot="tabs-content"
      className={cn("flex-1 text-sm outline-hidden", className)}
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants };
