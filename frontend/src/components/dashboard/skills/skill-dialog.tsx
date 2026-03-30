"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Loader2, X, Link as LinkIcon } from "lucide-react";
import type { UserSkill } from "@/hooks/useSkills";

export interface SkillFormData {
  name: string;
  description: string;
  url: string;
  content: string;
}

export const defaultSkillForm: SkillFormData = {
  name: "",
  description: "",
  url: "",
  content: "",
};

interface SkillDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingSkill: UserSkill | null;
  form: SkillFormData;
  setForm: React.Dispatch<React.SetStateAction<SkillFormData>>;
  onSubmit: (e: React.FormEvent) => void;
  createPending: boolean;
  updatePending: boolean;
}

export function SkillDialog({
  open,
  onOpenChange,
  editingSkill,
  form,
  setForm,
  onSubmit,
  createPending,
  updatePending,
}: SkillDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card border border-border rounded-xl shadow-2xl w-[calc(100%-2rem)] max-w-md max-h-[85vh] overflow-y-auto p-5 z-50"
        >
          <div className="flex items-center justify-between mb-5">
            <Dialog.Title className="text-sm font-semibold text-foreground">
              {editingSkill ? "Edit Skill" : "Add Skill"}
            </Dialog.Title>
            <Dialog.Close asChild>
              <button className="p-1 rounded-md hover:bg-muted text-muted-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            </Dialog.Close>
          </div>

          <form onSubmit={onSubmit} className="space-y-3.5">
            <div>
              <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                Name
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full px-3 py-2 border border-input rounded-lg text-xs bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                Description
              </label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className="w-full px-3 py-2 border border-input rounded-lg text-xs bg-background text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                rows={2}
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                URL (optional)
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={form.url}
                  onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
                  className="flex-1 px-3 py-2 border border-input rounded-lg text-xs bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  placeholder="https://..."
                />
                {form.url && (
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 px-2.5 py-2 border border-border rounded-lg text-[10px] font-medium text-foreground hover:bg-muted transition-colors whitespace-nowrap"
                  >
                    <LinkIcon className="h-2.5 w-2.5" /> Import
                  </button>
                )}
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                Content
              </label>
              <textarea
                value={form.content}
                onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                className="w-full px-3 py-2 border border-input rounded-lg text-xs bg-background text-foreground resize-none font-mono focus:outline-none focus:ring-1 focus:ring-ring"
                rows={5}
                placeholder="Skill content..."
              />
            </div>
            <div className="flex justify-end gap-2 pt-3">
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="px-3 py-1.5 border border-border rounded-lg text-xs font-medium text-foreground hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
              </Dialog.Close>
              <button
                type="submit"
                disabled={createPending || updatePending}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {(createPending || updatePending) && <Loader2 className="h-3 w-3 animate-spin" />}
                {editingSkill ? "Update" : "Create"}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
