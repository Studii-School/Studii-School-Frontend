"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { SidePanel } from "@/components/ui/side-panel";
import { useAcademics } from "@/features/academics/academics-context";
import { useActionFeedback } from "@/features/action-feedback/action-feedback-context";

export function StudentClassDialog({
  studentId,
  studentName,
  currentClassId,
  onClose,
}: {
  studentId: string;
  studentName?: string;
  currentClassId: string;
  onClose: () => void;
}) {
  const { state, moveStudentToClass } = useAcademics();
  const { toast } = useActionFeedback();
  const [classId, setClassId] = useState("");
  const isAssigning = !currentClassId;
  const [saving, setSaving] = useState(false);
  const current = state.classes.find((item) => item.id === currentClassId);

  const save = async () => {
    if (!classId) {
      toast("Select a class.", "error");
      return;
    }
    setSaving(true);
    try {
      await moveStudentToClass({
        studentId,
        classId,
        effectiveDate: new Date().toISOString().slice(0, 10),
        reason: isAssigning ? "Initial class assignment" : "Class changed by administrator",
      });
      const target = state.classes.find((item) => item.id === classId);
      toast(`Student ${isAssigning ? "assigned" : "moved"} to ${target?.displayName ?? "the selected class"}.`, "success");
      onClose();
    } catch (error) {
      toast(
        error instanceof Error ? error.message : `Student could not be ${isAssigning ? "assigned" : "moved"}.`,
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <SidePanel open title={isAssigning ? "Assign class" : "Move class"} description={`${studentName ? `${studentName} · ` : ""}Current class: ${current?.displayName ?? "Unassigned"}`} onClose={onClose} maxWidth="md">
      <div className="mt-5">
        <label className="text-sm font-medium">
          {isAssigning ? "Class" : "New class"}
          <Select
            className="mt-2"
            searchable
            label={isAssigning ? "Class" : "New class"}
            value={classId}
            onChange={setClassId}
            placeholder="Select a class"
            options={state.classes
              .filter((item) => item.status === "ACTIVE" && item.id !== currentClassId)
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((item) => ({ value: item.id, label: item.displayName }))}
          />
        </label>
      </div>
      <div className="mt-5 flex justify-end gap-2 border-t pt-4">
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        <Button type="button" disabled={saving} onClick={() => void save()}>
          {saving ? (isAssigning ? "Assigning student..." : "Moving student...") : (isAssigning ? "Assign class" : "Move student")}
        </Button>
      </div>
    </SidePanel>
  );
}
