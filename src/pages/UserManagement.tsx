import { useState, useEffect, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty";
import {
  Users,
  UserPlus,
  Search,
  Lock,
  Mail,
  User,
  ShieldCheck,
  Eye,
  EyeOff,
  Loader2,
  Calendar,
  CheckCircle2,
  Pencil,
  Trash2,
  Phone,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import {
  type SystemRole,
  type ManagedUser,
  DEFAULT_SYSTEM_USERS,
  getUserDisplayCode,
  getStoredUsers,
  fetchManagedUsers,
  updateManagedUser,
  deleteManagedUser,
  createManagedUser,
} from "@/services/userService";

export { type SystemRole, type ManagedUser, DEFAULT_SYSTEM_USERS, getUserDisplayCode };

export function UserManagement() {
  const queryClient = useQueryClient();
  const { user: currentAuthUser, refreshProfile } = useAuth();
  const { t } = useI18n();

  const [users, setUsers] = useState<ManagedUser[]>(() => getStoredUsers());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  // Create Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Create Form State: Strictly two roles (super_admin, sales_officer)
  const [formData, setFormData] = useState<{
    fullName: string;
    email: string;
    phone: string;
    password: string;
    role: SystemRole;
    is_active: boolean;
  }>({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    role: "sales_officer",
    is_active: true,
  });

  // Edit Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [editForm, setEditForm] = useState<{
    fullName: string;
    email: string;
    phone: string;
    role: SystemRole;
    is_active: boolean;
    newPassword?: string;
  }>({
    fullName: "",
    email: "",
    phone: "",
    role: "sales_officer",
    is_active: true,
    newPassword: "",
  });

  // Load and reconcile users from Supabase and local store
  async function loadUsers() {
    setLoading(true);
    try {
      const reconciled = await fetchManagedUsers();
      setUsers(reconciled);
    } catch (err) {
      console.warn("User fetch notice, using local store:", err);
      setUsers(getStoredUsers());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();

    const handleStorageUpdate = () => {
      setUsers(getStoredUsers());
    };
    window.addEventListener("sales_erp_storage_update", handleStorageUpdate);
    window.addEventListener("storage", handleStorageUpdate);
    return () => {
      window.removeEventListener("sales_erp_storage_update", handleStorageUpdate);
      window.removeEventListener("storage", handleStorageUpdate);
    };
  }, []);

  // Filtered users for table
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        u.full_name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase()) ||
        (u.phone && u.phone.toLowerCase().includes(search.toLowerCase())) ||
        (u.role_name || u.role).toLowerCase().includes(search.toLowerCase());

      const normalizedRole = (u.role || u.role_name || "").toLowerCase().replace(/[\s_-]+/g, "");
      let matchesRole = true;
      if (roleFilter !== "all") {
        if (roleFilter === "super_admin") {
          matchesRole = normalizedRole.includes("admin");
        } else if (roleFilter === "sales_officer") {
          matchesRole = normalizedRole.includes("officer") || normalizedRole === "so";
        }
      }

      return matchesSearch && matchesRole;
    });
  }, [users, search, roleFilter]);

  // Role Statistics Summary (Super Admin vs Sales Officer)
  const stats = useMemo(() => {
    let superAdminCount = 0;
    let salesOfficerCount = 0;

    users.forEach((u) => {
      const r = (u.role || u.role_name || "").toLowerCase().replace(/[\s_-]+/g, "");
      if (r.includes("admin")) {
        superAdminCount++;
      } else {
        salesOfficerCount++;
      }
    });

    return {
      total: users.length,
      superAdminCount,
      salesOfficerCount,
    };
  }, [users]);

  // Reset create form
  const handleCloseModal = () => {
    setModalOpen(false);
    setFormData({
      fullName: "",
      email: "",
      phone: "",
      password: "",
      role: "sales_officer",
      is_active: true,
    });
    setShowPassword(false);
  };

  // Open Edit Modal prefilled with selected user's details
  const handleOpenEdit = (user: ManagedUser) => {
    setEditingUser(user);
    const normalizedRole: SystemRole = (user.role || "").toLowerCase().includes("admin")
      ? "super_admin"
      : "sales_officer";

    setEditForm({
      fullName: user.full_name,
      email: user.email,
      phone: user.phone || "",
      role: normalizedRole,
      is_active: user.is_active !== false,
      newPassword: "",
    });
    setShowEditPassword(false);
    setEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setEditModalOpen(false);
    setEditingUser(null);
    setSavingEdit(false);
    setShowEditPassword(false);
  };

  // Submit Handler: Creates user via isolated Supabase Auth client & persists profile
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();

    const name = formData.fullName.trim();
    const email = formData.email.trim().toLowerCase();
    const phone = formData.phone.trim();
    const password = formData.password.trim();
    const role: SystemRole = formData.role === "super_admin" ? "super_admin" : "sales_officer";

    if (!name) {
      toast.error("Please enter the user's Full Name.");
      return;
    }
    if (!email || !email.includes("@") || !email.includes(".")) {
      toast.error("Please enter a valid email address.");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters long.");
      return;
    }

    // Check duplicate email in local state
    if (users.some((u) => u.email.toLowerCase() === email)) {
      toast.error("A user with this email address already exists.");
      return;
    }

    setSubmitting(true);

    try {
      const { user: newUser } = await createManagedUser({
        fullName: name,
        email,
        phone,
        password,
        role,
        is_active: formData.is_active,
      });

      // Update local state immediately
      setUsers((prev) => [newUser, ...prev.filter((u) => u.id !== newUser.id && u.email.toLowerCase() !== email)]);

      // Explicit React-Query cache invalidation
      await queryClient.invalidateQueries({ queryKey: ["users"] });

      toast.success("User created successfully!");
      handleCloseModal();
    } catch (err: any) {
      console.error("Error creating user:", err);
      toast.error(err.message || "Failed to create user. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // Save Edit Handler: Updates profiles/users table, auth credentials, and local state
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    const name = editForm.fullName.trim();
    const email = editForm.email.trim().toLowerCase();
    const phone = editForm.phone.trim();
    const newPassword = (editForm.newPassword || "").trim();

    if (!name) {
      toast.error("Please enter a valid full name.");
      return;
    }
    if (!email || !email.includes("@") || !email.includes(".")) {
      toast.error("Please enter a valid email address.");
      return;
    }

    // Check if new email is already taken by another user
    if (
      email !== editingUser.email.toLowerCase() &&
      users.some((u) => u.id !== editingUser.id && u.email.toLowerCase() === email)
    ) {
      toast.error("A user with this email address already exists.");
      return;
    }

    if (newPassword && newPassword.length < 6) {
      toast.error("New password must be at least 6 characters long.");
      return;
    }

    const isEditingSelf =
      currentAuthUser?.email?.toLowerCase() === editingUser.email.toLowerCase() ||
      currentAuthUser?.id === editingUser.id;

    // Safety guard: cannot demote or deactivate oneself
    const finalRole: SystemRole = isEditingSelf ? "super_admin" : editForm.role;
    const finalIsActive = isEditingSelf ? true : editForm.is_active;

    setSavingEdit(true);
    try {
      const result = await updateManagedUser(
        editingUser,
        {
          fullName: name,
          email,
          phone,
          role: finalRole,
          is_active: finalIsActive,
          newPassword,
        },
        currentAuthUser
      );

      // Instantly update table row and user state without manual reload
      setUsers((prev) =>
        prev.map((u) =>
          u.id === editingUser.id ||
          u.id === result.user.id ||
          u.email.toLowerCase() === editingUser.email.toLowerCase()
            ? result.user
            : u
        )
      );

      // Refresh auth profile if current user edited their own details
      if (isEditingSelf && refreshProfile) {
        try {
          await refreshProfile();
        } catch (refreshErr) {
          console.warn("Notice refreshing auth profile:", refreshErr);
        }
      }

      // Explicit React-Query cache invalidation
      await queryClient.invalidateQueries({ queryKey: ["users"] });

      if (result.warning) {
        toast.info(result.warning);
      } else if (result.credentialsUpdated) {
        toast.success("Authentication credentials (email/password) and profile updated successfully!");
      } else {
        toast.success("User profile metadata updated successfully!");
      }
      handleCloseEditModal();
    } catch (err: any) {
      console.error("Error updating user:", err);
      toast.error(err.message || "Failed to update user profile.");
    } finally {
      setSavingEdit(false);
    }
  };

  // Delete Handler with Safety Guard against self-deletion and tombstone persistence
  const handleDeleteUser = async (user: ManagedUser) => {
    const isSelf =
      currentAuthUser?.email?.toLowerCase() === user.email.toLowerCase() ||
      currentAuthUser?.id === user.id;

    if (isSelf) {
      toast.error("Safety Guard: You cannot delete your own Super Admin account.");
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete user "${user.full_name}" (${user.email})? This action cannot be undone.`
    );
    if (!confirmed) return;

    try {
      await deleteManagedUser(user, currentAuthUser);

      // Instantly remove row from DOM and update KPI counter metrics
      setUsers((prev) =>
        prev.filter((u) => u.id !== user.id && u.email.toLowerCase() !== user.email.toLowerCase())
      );

      // Explicit React-Query cache invalidation
      await queryClient.invalidateQueries({ queryKey: ["users"] });

      toast.success("User deleted successfully!");
    } catch (err: any) {
      console.error("Error deleting user:", err);
      toast.error(err.message || "Failed to delete user record.");
    }
  };

  const getRoleBadge = (roleStr?: string) => {
    const r = (roleStr || "").toLowerCase().replace(/[\s_-]+/g, "");
    if (r.includes("admin")) {
      return (
        <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-200 dark:border-purple-800 flex items-center gap-1 font-medium">
          <ShieldCheck className="h-3 w-3" /> Super Admin
        </Badge>
      );
    }
    return (
      <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 flex items-center gap-1 font-medium">
        <User className="h-3 w-3" /> Sales Officer
      </Badge>
    );
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "—";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return "—";
      return d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return "—";
    }
  };

  const isEditingSelf = Boolean(
    editingUser &&
      (currentAuthUser?.email?.toLowerCase() === editingUser.email.toLowerCase() ||
        currentAuthUser?.id === editingUser.id)
  );

  return (
    <div className="space-y-5">
      {/* Header Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            User Management
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Super Admin portal to provision and manage system users (Super Admin & Sales Officer accounts).
          </p>
        </div>
        <Button
          onClick={() => setModalOpen(true)}
          className="gap-1.5 shadow-sm"
          size="sm"
        >
          <UserPlus className="h-4 w-4" />
          + Add New User
        </Button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Total Registered Users</p>
              <p className="text-xl font-bold text-foreground mt-0.5">{stats.total}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Super Admins</p>
              <p className="text-xl font-bold text-foreground mt-0.5">{stats.superAdminCount}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <User className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Sales Officers</p>
              <p className="text-xl font-bold text-foreground mt-0.5">{stats.salesOfficerCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card>
        <CardContent className="p-3">
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by full name, email, phone number, or role..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>
            <div className="w-full sm:w-52">
              <Select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="h-9 text-xs"
              >
                <option value="all">All Roles</option>
                <option value="super_admin">Super Admin</option>
                <option value="sales_officer">Sales Officer</option>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <EmptyState
              icon={<Users className="h-10 w-10 text-muted-foreground" />}
              title="No Users Found"
              description={search ? "Try adjusting your search query or role filter." : "Click '+ Add New User' to provision the first account."}
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="min-w-[180px]">Full Name</TableHead>
                    <TableHead className="min-w-[200px]">Email</TableHead>
                    <TableHead className="min-w-[140px]">Phone Number</TableHead>
                    <TableHead className="min-w-[140px]">Role</TableHead>
                    <TableHead className="min-w-[120px]">Created Date</TableHead>
                    <TableHead className="w-24">Status</TableHead>
                    <TableHead className="text-right w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((u) => {
                    const isSelf =
                      currentAuthUser?.email?.toLowerCase() === u.email.toLowerCase() ||
                      currentAuthUser?.id === u.id;

                    return (
                      <TableRow key={u.id} className="hover:bg-muted/30 transition-colors">
                        {/* Full Name */}
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-xs shrink-0">
                              {u.full_name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-xs text-foreground flex items-center gap-1.5">
                                {u.full_name}
                                {isSelf && (
                                  <Badge variant="outline" className="text-[10px] py-0 px-1 font-normal text-muted-foreground">
                                    You
                                  </Badge>
                                )}
                              </p>
                              <span
                                className="inline-flex items-center gap-1 text-[11px] font-mono text-muted-foreground"
                                title={`Internal UUID: ${u.id}`}
                              >
                                <span className="text-[10px] font-sans font-medium text-muted-foreground/70">ID:</span>
                                <span className="font-semibold text-foreground/80">{getUserDisplayCode(u, users)}</span>
                              </span>
                            </div>
                          </div>
                        </TableCell>

                        {/* Email */}
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-xs text-foreground font-mono">
                            <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span>{u.email}</span>
                          </div>
                        </TableCell>

                        {/* Phone Number */}
                        <TableCell>
                          {u.phone ? (
                            <div className="flex items-center gap-1.5 text-xs text-foreground font-mono">
                              <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              <span>{u.phone}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>

                        {/* Role */}
                        <TableCell>
                          {getRoleBadge(u.role_name || u.role)}
                        </TableCell>

                        {/* Created Date */}
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Calendar className="h-3.5 w-3.5 shrink-0" />
                            <span>{formatDate(u.created_at)}</span>
                          </div>
                        </TableCell>

                        {/* Status */}
                        <TableCell>
                          {u.is_active !== false ? (
                            <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground font-medium">
                              Inactive
                            </span>
                          )}
                        </TableCell>

                        {/* Actions: Edit & Delete */}
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenEdit(u)}
                              title={`Edit ${u.full_name}`}
                              className="h-8 w-8 text-foreground hover:text-primary"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>

                            {isSelf ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                disabled
                                className="h-8 w-8 opacity-30 cursor-not-allowed text-muted-foreground"
                                title="Safety Guard: You cannot delete your own account"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteUser(u)}
                                title={`Delete ${u.full_name}`}
                                className="h-8 w-8 text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add New User Modal: Strictly Two Roles */}
      <Dialog
        open={modalOpen}
        onClose={handleCloseModal}
        title="Add New User Account"
        size="md"
      >
        <form onSubmit={handleCreateUser} className="space-y-4">
          <p className="text-xs text-muted-foreground leading-relaxed -mt-2">
            Create a new authorized login credential with system permissions (Super Admin or Sales Officer).
          </p>

          {/* Full Name */}
          <div className="space-y-1.5">
            <Label htmlFor="user-fullname" className="text-xs font-semibold">
              Full Name <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="user-fullname"
                type="text"
                required
                placeholder="e.g. Tanvir Ahmed"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className="pl-9 h-9 text-xs"
              />
            </div>
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="user-email" className="text-xs font-semibold">
              Email Address <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="user-email"
                type="email"
                required
                placeholder="e.g. tanvir@hamko.com.bd"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="pl-9 h-9 text-xs"
              />
            </div>
          </div>

          {/* Phone Number */}
          <div className="space-y-1.5">
            <Label htmlFor="user-phone" className="text-xs font-semibold">
              Phone Number
            </Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="user-phone"
                type="tel"
                placeholder="e.g. +880 1711-234567"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="pl-9 h-9 text-xs"
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <Label htmlFor="user-password" className="text-xs font-semibold">
              Password <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="user-password"
                type={showPassword ? "text" : "password"}
                required
                minLength={6}
                placeholder="At least 6 characters"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="pl-9 pr-9 h-9 text-xs"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              User will log in using this password.
            </p>
          </div>

          {/* Role Dropdown: STRICTLY TWO ROLES */}
          <div className="space-y-1.5">
            <Label htmlFor="user-role" className="text-xs font-semibold">
              Role <span className="text-destructive">*</span>
            </Label>
            <Select
              id="user-role"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as SystemRole })}
              className="h-9 text-xs"
            >
              <option value="super_admin">Super Admin (Full System & User Management Access)</option>
              <option value="sales_officer">Sales Officer (Field Orders, Collections & SFA)</option>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              Select &quot;Super Admin&quot; for complete administrative access or &quot;Sales Officer&quot; for field operations.
            </p>
          </div>

          {/* Account Status */}
          <div className="space-y-1.5">
            <Label htmlFor="user-status" className="text-xs font-semibold">
              Account Status
            </Label>
            <Select
              id="user-status"
              value={formData.is_active ? "active" : "inactive"}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.value === "active" })}
              className="h-9 text-xs"
            >
              <option value="active">Active (Access Allowed)</option>
              <option value="inactive">Inactive (Access Suspended)</option>
            </Select>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-3 border-t">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCloseModal}
              disabled={submitting}
            >
              {t("cancel")}
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={submitting}
              className="gap-1.5"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating User...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" />
                  Create User
                </>
              )}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Edit User Modal: Unlocked Email, Phone Number, and Optional Password Reset */}
      <Dialog
        open={editModalOpen}
        onClose={handleCloseEditModal}
        title="Edit User Profile & Role"
        size="md"
      >
        {editingUser && (
          <form onSubmit={handleSaveEdit} className="space-y-4">
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 border border-border/60 -mt-1">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-xs shrink-0">
                  {editingUser.full_name.charAt(0).toUpperCase()}
                </div>
                <div className="truncate">
                  <p className="text-xs font-semibold text-foreground truncate">{editingUser.full_name}</p>
                  <p className="text-[11px] text-muted-foreground truncate font-mono">{editingUser.email}</p>
                </div>
              </div>
              <Badge variant="secondary" className="font-mono text-[11px] shrink-0 font-medium">
                ID: {getUserDisplayCode(editingUser, users)}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed -mt-1">
              Update user credentials, phone number, and system role permissions.
            </p>

            {/* Full Name */}
            <div className="space-y-1.5">
              <Label htmlFor="edit-user-fullname" className="text-xs font-semibold">
                Full Name <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="edit-user-fullname"
                  type="text"
                  required
                  value={editForm.fullName}
                  onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                  className="pl-9 h-9 text-xs"
                />
              </div>
            </div>

            {/* Email Address: Fully Editable */}
            <div className="space-y-1.5">
              <Label htmlFor="edit-user-email" className="text-xs font-semibold">
                Email Address <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="edit-user-email"
                  type="email"
                  required
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="pl-9 h-9 text-xs"
                  placeholder="e.g. tanvir@hamko.com.bd"
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Email serves as the unique login credential.
              </p>
            </div>

            {/* Phone Number: Editable */}
            <div className="space-y-1.5">
              <Label htmlFor="edit-user-phone" className="text-xs font-semibold">
                Phone Number
              </Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="edit-user-phone"
                  type="tel"
                  placeholder="e.g. +880 1711-234567"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="pl-9 h-9 text-xs"
                />
              </div>
            </div>

            {/* Role Dropdown: STRICTLY TWO ROLES */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="edit-user-role" className="text-xs font-semibold">
                  Role <span className="text-destructive">*</span>
                </Label>
                {isEditingSelf && (
                  <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300 dark:border-amber-700">
                    Self-Demotion Guard Active
                  </Badge>
                )}
              </div>
              <Select
                id="edit-user-role"
                value={editForm.role}
                onChange={(e) => setEditForm({ ...editForm, role: e.target.value as SystemRole })}
                disabled={isEditingSelf}
                className={`h-9 text-xs ${isEditingSelf ? "bg-muted/50 cursor-not-allowed opacity-80" : ""}`}
              >
                <option value="super_admin">Super Admin (Full System & User Management Access)</option>
                <option value="sales_officer">Sales Officer (Field Orders, Collections & SFA)</option>
              </Select>
              {isEditingSelf ? (
                <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                  Safety Guard: You cannot demote or change your own role to prevent lockout.
                </p>
              ) : (
                <p className="text-[11px] text-muted-foreground">
                  Select &quot;Super Admin&quot; for complete administrative access or &quot;Sales Officer&quot; for field operations.
                </p>
              )}
            </div>

            {/* Status Toggle / Select */}
            <div className="space-y-1.5">
              <Label htmlFor="edit-user-status" className="text-xs font-semibold">
                Account Status
              </Label>
              <Select
                id="edit-user-status"
                value={editForm.is_active ? "active" : "inactive"}
                onChange={(e) => setEditForm({ ...editForm, is_active: e.target.value === "active" })}
                disabled={isEditingSelf}
                className={`h-9 text-xs ${isEditingSelf ? "bg-muted/50 cursor-not-allowed opacity-80" : ""}`}
              >
                <option value="active">Active (Access Allowed)</option>
                <option value="inactive">Inactive (Access Suspended)</option>
              </Select>
              {isEditingSelf && (
                <p className="text-[11px] text-muted-foreground">
                  You cannot deactivate your own account while logged in.
                </p>
              )}
            </div>

            {/* New Password (Optional) */}
            <div className="space-y-1.5">
              <Label htmlFor="edit-user-password" className="text-xs font-semibold">
                New Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="edit-user-password"
                  type={showEditPassword ? "text" : "password"}
                  minLength={6}
                  placeholder="Enter new password (optional)"
                  value={editForm.newPassword || ""}
                  onChange={(e) => setEditForm({ ...editForm, newPassword: e.target.value })}
                  className="pl-9 pr-9 h-9 text-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowEditPassword(!showEditPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showEditPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Leave blank to keep the current password.
              </p>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-3 border-t">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCloseEditModal}
                disabled={savingEdit}
              >
                {t("cancel")}
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={savingEdit}
                className="gap-1.5"
              >
                {savingEdit ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Pencil className="h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </Dialog>
    </div>
  );
}
