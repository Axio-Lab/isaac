"use client";

import { useState } from "react";
import { useSkills, useCreateSkill, useUpdateSkill, useDeleteSkill } from "@/hooks/useSkills";
import type { UserSkill } from "@/hooks/useSkills";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Plus, MoreVertical, Loader2, Pencil, Trash2, Sparkles } from "lucide-react";
import { GlassButton } from "@/components/ui/glass-button";
import { SkillDialog, defaultSkillForm, type SkillFormData } from "./skill-dialog";

export function SkillsView() {
  const { data, isLoading } = useSkills();
  const createSkill = useCreateSkill();
  const updateSkill = useUpdateSkill();
  const deleteSkill = useDeleteSkill();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSkill, setEditingSkill] = useState<UserSkill | null>(null);
  const [form, setForm] = useState<SkillFormData>(defaultSkillForm);

  const skills = data?.skills ?? [];

  function openCreate() {
    setEditingSkill(null);
    setForm(defaultSkillForm);
    setDialogOpen(true);
  }

  function openEdit(skill: UserSkill) {
    setEditingSkill(skill);
    setForm({
      name: skill.name,
      description: skill.description || "",
      url: skill.url || "",
      content: skill.content || "",
    });
    setDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      name: form.name,
      description: form.description || undefined,
      url: form.url || undefined,
      content: form.content || undefined,
    };
    if (editingSkill) {
      await updateSkill.mutateAsync({ id: editingSkill.id, data: payload });
    } else {
      await createSkill.mutateAsync(payload);
    }
    setDialogOpen(false);
  }

  async function handleDelete(skill: UserSkill) {
    if (!confirm(`Delete skill "${skill.name}"?`)) return;
    await deleteSkill.mutateAsync({ id: skill.id });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-foreground tracking-tight">Skills</h1>
          <p className="text-xs text-muted-foreground">
            Add skill to improve Isaac&apos;s performance
          </p>
        </div>
        <GlassButton
          onClick={openCreate}
          size="sm"
          className="glass-filled"
          contentClassName="flex items-center gap-1.5 text-xs"
        >
          <Plus className="h-3 w-3" /> Add Skill
        </GlassButton>
      </div>

      {skills.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center mb-3">
            <Sparkles className="h-5 w-5 text-muted-foreground opacity-50" />
          </div>
          <p className="text-xs text-muted-foreground">No skills yet. Add your first skill.</p>
        </div>
      ) : (
        <div className="grid gap-2.5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {skills.map((skill) => (
            <div
              key={skill.id}
              className="border border-border rounded-xl p-4 bg-card hover:border-border/80 transition-all duration-150"
            >
              <div className="flex items-start justify-between mb-1.5">
                <h3 className="text-xs font-medium text-foreground">{skill.name}</h3>
                <DropdownMenu.Root>
                  <DropdownMenu.Trigger asChild>
                    <button className="p-1 rounded-md hover:bg-muted text-muted-foreground transition-colors">
                      <MoreVertical className="h-3.5 w-3.5" />
                    </button>
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Portal>
                    <DropdownMenu.Content
                      className="min-w-[120px] bg-popover text-popover-foreground border border-border rounded-lg shadow-xl p-1 z-50"
                      sideOffset={4}
                      align="end"
                    >
                      <DropdownMenu.Item
                        className="flex items-center gap-2 px-2.5 py-1.5 text-[11px] rounded-md cursor-pointer outline-none hover:bg-muted"
                        onSelect={() => openEdit(skill)}
                      >
                        <Pencil className="h-3 w-3" /> Edit
                      </DropdownMenu.Item>
                      <DropdownMenu.Item
                        className="flex items-center gap-2 px-2.5 py-1.5 text-[11px] rounded-md cursor-pointer outline-none hover:bg-muted text-destructive"
                        onSelect={() => handleDelete(skill)}
                      >
                        <Trash2 className="h-3 w-3" /> Delete
                      </DropdownMenu.Item>
                    </DropdownMenu.Content>
                  </DropdownMenu.Portal>
                </DropdownMenu.Root>
              </div>
              {skill.description && (
                <p className="text-[11px] text-muted-foreground mb-2 line-clamp-2">
                  {skill.description}
                </p>
              )}
              <p className="text-[10px] text-muted-foreground">
                Created {new Date(skill.createdAt).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      )}

      <SkillDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editingSkill={editingSkill}
        form={form}
        setForm={setForm}
        onSubmit={handleSubmit}
        createPending={createSkill.isPending}
        updatePending={updateSkill.isPending}
      />
    </div>
  );
}
