"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type TaskSelectOption = { value: string; label: string };

const defaultLabelClass =
  "block text-[10px] font-medium text-muted-foreground mb-1";

const defaultToolbarButtonClass =
  "flex w-full min-w-[7.5rem] items-center justify-between gap-1.5 rounded-lg border border-input bg-background px-2.5 py-1.5 text-left text-xs text-foreground outline-none transition-colors hover:bg-muted/40 focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50 disabled:pointer-events-none";

/**
 * Radix dropdown styled like a select: opens under the trigger with collision-aware positioning.
 */
export function TaskSelectDropdown({
  label,
  value,
  onChange,
  options,
  ariaLabel,
  labelClassName,
  triggerClassName,
  buttonClassName,
  disabled,
  required,
  contentZIndexClass = "z-[100]",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: TaskSelectOption[];
  ariaLabel: string;
  labelClassName?: string;
  triggerClassName?: string;
  /** Full trigger button classes. Defaults to toolbar filter style. */
  buttonClassName?: string;
  disabled?: boolean;
  required?: boolean;
  /** Raise when used inside a dialog (e.g. z-[300]). */
  contentZIndexClass?: string;
}) {
  const current = options.find((o) => o.value === value);
  const display = current?.label ?? options[0]?.label ?? "—";
  return (
    <div className={cn("min-w-0", triggerClassName)}>
      <label className={cn(labelClassName ?? defaultLabelClass)}>
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </label>
      <DropdownMenu.Root modal={false}>
        <DropdownMenu.Trigger asChild disabled={disabled}>
          <button
            type="button"
            aria-label={ariaLabel}
            aria-required={required}
            disabled={disabled}
            className={buttonClassName ?? defaultToolbarButtonClass}
          >
            <span className="truncate">{display}</span>
            <ChevronDown className="h-3 w-3 shrink-0 opacity-50" aria-hidden />
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            className={cn(
              contentZIndexClass,
              "max-h-[min(280px,60vh)] min-w-(--radix-dropdown-menu-trigger-width) overflow-y-auto rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-xl",
            )}
            side="bottom"
            align="start"
            sideOffset={4}
            alignOffset={0}
            collisionPadding={16}
            avoidCollisions
          >
            {options.map((opt) => (
              <DropdownMenu.Item
                key={opt.value === "" ? `__empty__-${opt.label}` : opt.value}
                className={cn(
                  "cursor-pointer rounded-md px-2.5 py-1.5 text-[11px] outline-none data-highlighted:bg-muted data-highlighted:text-foreground",
                  value === opt.value && "bg-muted font-medium",
                )}
                onSelect={() => onChange(opt.value)}
              >
                {opt.label}
              </DropdownMenu.Item>
            ))}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
  );
}
