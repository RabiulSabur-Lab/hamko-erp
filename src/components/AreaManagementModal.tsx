import React, { useState, useEffect, useMemo } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  MapPin,
  Plus,
  Pencil,
  Trash2,
  Search,
  AlertTriangle,
  Check,
  X,
  Store,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import {
  getAreas,
  addArea,
  updateArea,
  deleteArea,
  getAreaCustomerCount,
  deriveCodePrefix,
  type Area,
} from "@/utils/localStore";

interface AreaManagementModalProps {
  open: boolean;
  onClose: () => void;
  onSelectArea?: (areaName: string) => void;
}

export function AreaManagementModal({
  open,
  onClose,
  onSelectArea,
}: AreaManagementModalProps) {
  const [areas, setAreas] = useState<Area[]>(() => getAreas());
  const [search, setSearch] = useState("");

  // New Area Form
  const [newName, setNewName] = useState("");
  const [newPrefix, setNewPrefix] = useState("");
  const [isSubmittingNew, setIsSubmittingNew] = useState(false);

  // Edit Area State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editPrefix, setEditPrefix] = useState("");
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  // Delete Restriction Alert
  const [restrictionError, setRestrictionError] = useState<string | null>(null);

  // Sync areas on storage update
  useEffect(() => {
    if (!open) return;
    const sync = () => {
      setAreas(getAreas());
    };
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("sales_erp_storage_update", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("sales_erp_storage_update", sync);
    };
  }, [open]);

  // Auto-fill code prefix as user types new area name
  const handleNewNameChange = (val: string) => {
    setNewName(val);
    if (!newPrefix || newPrefix === deriveCodePrefix(newName)) {
      setNewPrefix(deriveCodePrefix(val).slice(0, 3));
    }
  };

  const handleCreateArea = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanName = newName.trim();
    if (!cleanName) {
      toast.error("Please enter an area name");
      return;
    }

    const cleanPrefix = newPrefix.replace(/[^a-zA-Z0-9]/g, "").trim().toUpperCase().slice(0, 3);
    setIsSubmittingNew(true);
    const res = addArea(cleanName, cleanPrefix || undefined);
    setIsSubmittingNew(false);

    if (!res.success) {
      toast.error(res.error || "Failed to add area");
      return;
    }

    toast.success(`Area "${cleanName}" created successfully`);
    setNewName("");
    setNewPrefix("");
    setSearch("");
    setAreas([...res.areas]);

    if (onSelectArea && res.area) {
      onSelectArea(res.area.name);
    }
  };

  const startEdit = (area: Area) => {
    setEditingId(area.id);
    setEditName(area.name);
    setEditPrefix((area.code_prefix || deriveCodePrefix(area.name)).slice(0, 3));
    setRestrictionError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditPrefix("");
  };

  const handleSaveEdit = (id: string) => {
    const cleanName = editName.trim();
    if (!cleanName) {
      toast.error("Area name cannot be empty");
      return;
    }

    const cleanPrefix = editPrefix.replace(/[^a-zA-Z0-9]/g, "").trim().toUpperCase().slice(0, 3);
    setIsSubmittingEdit(true);
    const res = updateArea(id, cleanName, cleanPrefix || undefined);
    setIsSubmittingEdit(false);

    if (!res.success) {
      toast.error(res.error || "Failed to update area");
      return;
    }

    toast.success(`Area updated to "${cleanName}". Linked records cascaded.`);
    setEditingId(null);
    setAreas([...res.areas]);
  };

  const handleDelete = (area: Area) => {
    setRestrictionError(null);
    const count = getAreaCustomerCount(area.name);
    if (count > 0) {
      const msg = `Cannot delete "${area.name}": It is currently assigned to ${count} active customer(s). Please reassign them to another area first.`;
      setRestrictionError(msg);
      toast.error(msg);
      return;
    }

    if (window.confirm(`Are you sure you want to delete area "${area.name}"?`)) {
      const res = deleteArea(area.id);
      if (!res.success) {
        setRestrictionError(res.error || "Failed to delete area");
        toast.error(res.error || "Failed to delete area");
        return;
      }
      toast.success(`Area "${area.name}" removed successfully`);
      setAreas([...res.areas]);
    }
  };

  const filteredAreas = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return areas;
    return areas.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        (a.code_prefix && a.code_prefix.toLowerCase().includes(q))
    );
  }, [areas, search]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Area & Market Management"
      description="Manage sales areas, dynamic sequential code prefixes, and cascade updates across customers."
      size="lg"
    >
      <div className="space-y-6 pt-2">
          {/* Restriction Alert */}
          {restrictionError && (
            <div className="p-3.5 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200 flex items-start gap-2.5 text-xs">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold">Deletion Restricted</p>
                <p className="mt-0.5">{restrictionError}</p>
              </div>
              <button
                onClick={() => setRestrictionError(null)}
                className="text-amber-700 hover:text-amber-900"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Add New Area Section */}
          <div className="p-4 rounded-xl border bg-card/60 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Plus className="h-3.5 w-3.5 text-primary" />
                Add New Area / Market
              </span>
              <span className="text-[11px] text-muted-foreground">
                Prefix generates Party Codes (e.g., SDR-0123)
              </span>
            </div>

            <form
              onSubmit={handleCreateArea}
              className="grid grid-cols-1 sm:grid-cols-12 gap-2.5"
            >
              <div className="sm:col-span-7">
                <Input
                  placeholder="Area / Market name (e.g., Gulshan or Savar)"
                  value={newName}
                  onChange={(e) => handleNewNameChange(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
              <div className="sm:col-span-3">
                <div className="relative">
                  <Input
                    placeholder="e.g. SDR"
                    value={newPrefix}
                    maxLength={3}
                    onChange={(e) => setNewPrefix(e.target.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 3))}
                    className="h-9 text-sm uppercase font-mono"
                  />
                  <span className="absolute right-2 top-2.5 text-[10px] text-muted-foreground pointer-events-none">
                    Code
                  </span>
                </div>
              </div>
              <div className="sm:col-span-2">
                <Button
                  type="submit"
                  disabled={isSubmittingNew || !newName.trim()}
                  className="w-full h-9 text-xs font-semibold gap-1"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add
                </Button>
              </div>
            </form>
          </div>

          {/* Search & Statistics Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search areas or code prefix..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 pl-8 text-xs"
              />
            </div>
            <div className="flex items-center gap-2 self-end sm:self-auto text-xs text-muted-foreground">
              <span>Total: <strong className="text-foreground">{areas.length}</strong> Areas</span>
              <span>·</span>
              <span>Showing: <strong className="text-foreground">{filteredAreas.length}</strong></span>
            </div>
          </div>

          {/* Areas List / Table */}
          <div className="border rounded-xl overflow-hidden bg-card divide-y">
            <div className="grid grid-cols-12 gap-2 px-4 py-2.5 bg-muted/40 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              <div className="col-span-5">Area / Market Name</div>
              <div className="col-span-3">Code Prefix</div>
              <div className="col-span-2 text-center">Assigned Outlets</div>
              <div className="col-span-2 text-right">Actions</div>
            </div>

            {filteredAreas.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                No areas found matching &quot;{search}&quot;.
              </div>
            ) : (
              filteredAreas.map((area) => {
                const customerCount = getAreaCustomerCount(area.name);
                const isEditing = editingId === area.id;

                if (isEditing) {
                  return (
                    <div
                      key={area.id}
                      className="grid grid-cols-12 gap-2 px-4 py-3 bg-primary/5 items-center"
                    >
                      <div className="col-span-5">
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="h-8 text-xs font-semibold"
                          autoFocus
                          placeholder="Area name"
                        />
                      </div>
                      <div className="col-span-3">
                        <Input
                          value={editPrefix}
                          maxLength={3}
                          onChange={(e) => setEditPrefix(e.target.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 3))}
                          className="h-8 text-xs uppercase font-mono"
                          placeholder="e.g. SDR"
                        />
                      </div>
                      <div className="col-span-2 text-center text-xs text-muted-foreground">
                        <span className="text-[11px] bg-muted px-2 py-0.5 rounded-md font-mono">
                          {customerCount} linked
                        </span>
                      </div>
                      <div className="col-span-2 flex items-center justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                          disabled={isSubmittingEdit}
                          onClick={() => handleSaveEdit(area.id)}
                          title="Save changes and cascade"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={cancelEdit}
                          title="Cancel"
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={area.id}
                    className="grid grid-cols-12 gap-2 px-4 py-2.5 items-center hover:bg-muted/20 transition-colors text-xs"
                  >
                    <div className="col-span-5 flex items-center gap-2 font-medium">
                      <MapPin className="h-3.5 w-3.5 text-primary/70 shrink-0" />
                      <span className="truncate">{area.name}</span>
                    </div>
                    <div className="col-span-3">
                      <Badge
                        variant="secondary"
                        className="font-mono text-[10px] tracking-wider font-semibold"
                      >
                        {area.code_prefix || deriveCodePrefix(area.name)}
                      </Badge>
                    </div>
                    <div className="col-span-2 text-center">
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium ${
                          customerCount > 0
                            ? "bg-primary/10 text-primary"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        <Store className="h-2.5 w-2.5" />
                        {customerCount}
                      </span>
                    </div>
                    <div className="col-span-2 flex items-center justify-end gap-1">
                      {onSelectArea && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-[11px] text-primary"
                          onClick={() => {
                            onSelectArea(area.name);
                            onClose();
                          }}
                        >
                          Select
                        </Button>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        onClick={() => startEdit(area)}
                        title="Edit area name & code"
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className={`h-7 w-7 ${
                          customerCount > 0
                            ? "text-muted-foreground/40 cursor-not-allowed hover:bg-transparent"
                            : "text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        }`}
                        onClick={() => handleDelete(area)}
                        title={
                          customerCount > 0
                            ? `Cannot delete: ${customerCount} outlets linked`
                            : "Delete unused area"
                        }
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
        </div>

        <div className="pt-4 border-t flex items-center justify-between">
          <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
            <Sparkles className="h-3 w-3 text-amber-500" />
            <span>Editing an area cascades immediately across customers, orders, and routes.</span>
          </div>
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
