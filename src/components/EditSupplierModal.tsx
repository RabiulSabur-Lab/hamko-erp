import { useState, useEffect } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { saveSupplier, type Supplier } from "@/utils/localStore";
import { Building2, Phone, MapPin, User, Mail, Loader2, Save } from "lucide-react";

export interface EditSupplierModalProps {
  open: boolean;
  onClose: () => void;
  supplier: Supplier | null;
  onSuccess?: (updatedSupplier: Supplier) => void;
}

export function EditSupplierModal({
  open,
  onClose,
  supplier,
  onSuccess,
}: EditSupplierModalProps) {
  const [name, setName] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [address, setAddress] = useState<string>("");
  const [contactPerson, setContactPerson] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [companyName, setCompanyName] = useState<string>("");
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    if (open && supplier) {
      setName(supplier.name || "");
      setPhone(supplier.phone || "");
      setAddress(supplier.address || "");
      setContactPerson(supplier.contact_person || "");
      setEmail(supplier.email || "");
      setCompanyName(supplier.company_name || "");
    }
  }, [open, supplier]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplier) return;

    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error("Supplier / Vendor Name is required.");
      return;
    }

    setSaving(true);
    try {
      const updated = saveSupplier({
        ...supplier,
        id: supplier.id,
        name: trimmedName,
        phone: phone.trim() || null,
        address: address.trim() || null,
        contact_person: contactPerson.trim() || null,
        email: email.trim() || null,
        company_name: companyName.trim() || null,
      });

      toast.success(`Supplier profile for "${updated.name}" updated successfully.`);
      onSuccess?.(updated);
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update supplier profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title="Edit Supplier Information" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Supplier / Vendor Name */}
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5 text-sm font-medium">
            <Building2 className="h-4 w-4 text-primary" />
            Supplier / Vendor Name <span className="text-destructive">*</span>
          </Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. HAMKO Industries Ltd."
            required
            className="w-full"
            autoFocus
          />
        </div>

        {/* Company / Trade Name (Optional) */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-muted-foreground">
            Company / Trade Name (Optional)
          </Label>
          <Input
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="e.g. HAMKO Group / Head Office"
            className="w-full"
          />
        </div>

        {/* Phone Number & Email (2 columns) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-sm font-medium">
              <Phone className="h-4 w-4 text-primary" />
              Phone Number
            </Label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. +880 1700-000000"
              className="w-full"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-sm font-medium">
              <Mail className="h-4 w-4 text-primary" />
              Email
            </Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. procurement@hamko.com.bd"
              className="w-full"
            />
          </div>
        </div>

        {/* Contact Person */}
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5 text-sm font-medium">
            <User className="h-4 w-4 text-primary" />
            Contact Person
          </Label>
          <Input
            value={contactPerson}
            onChange={(e) => setContactPerson(e.target.value)}
            placeholder="e.g. Engr. Tanvir Ahmed (Key Accounts)"
            className="w-full"
          />
        </div>

        {/* Address */}
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5 text-sm font-medium">
            <MapPin className="h-4 w-4 text-primary" />
            Address / Office Location
          </Label>
          <Textarea
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="e.g. 141-143 Motijheel C/A, Dhaka-1000, Bangladesh"
            className="min-h-[70px] w-full text-sm"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t mt-5">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving || !name.trim()} className="gap-1.5">
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" /> Save Profile
              </>
            )}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
