import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../store/auth";
import { toast } from "sonner";
import {
  PageHeader,
  Section,
  Card,
  CardHeader,
  Btn,
  Field,
  inputCls,
  Table,
  Modal,
} from "../../components/layout/UI";
import { Pencil, Plus, Trash2 } from "lucide-react";

const ROLES = ["admin", "sales", "cs", "customs", "finance", "pricing"];

export default function AdminUsers() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editData, setEditData] = useState<any>(null);
  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => api.get("/users"),
  });
  const [f, setF] = useState<any>({
    email: "",
    password: "",
    name: "",
    role: "sales",
  });
  const mut = useMutation({
    mutationFn: (b: any) => api.post("/users", b),
    onSuccess: () => {
      toast.success("User created");
      qc.invalidateQueries({ queryKey: ["users"] });
      handleClose();
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Failed"),
  });

  const patchMut = useMutation({
    mutationFn: ({ id, data }: any) => api.patch(`/users/${id}`, data),
    onSuccess: () => {
      toast.success("User updated");
      qc.invalidateQueries({ queryKey: ["users"] });
      handleClose();
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.detail || "Failed to update"),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => api.del(`/users/${id}`),
    onSuccess: () => {
      toast.success("User deleted");
      qc.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.detail || "Failed to delete"),
  });

  function handleEdit(user: any) {
    setEditData(user);
    setF({
      email: user.email || "",
      password: "",
      name: user.name || "",
      role: user.role || "sales",
    });
    setOpen(true);
  }

  function handleDelete(id: string) {
    if (window.confirm("Are you sure you want to delete this user?")) {
      delMut.mutate(id);
    }
  }

  function handleClose() {
    setOpen(false);
    setEditData(null);
    setF({ email: "", password: "", name: "", role: "sales" });
  }

  function handleSubmit() {
    if (editData) {
      const payload = { ...f };
      if (!payload.password) {
        delete payload.password;
      }
      patchMut.mutate({ id: editData.id, data: payload });
    } else {
      mut.mutate(f);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Admin"
        title="User & Role Management"
        subtitle="Create division users. Roles: admin, sales, cs, customs, finance, pricing."
      />
      <Section>
        <div className="flex justify-end -mb-2">
          <Btn
            data-testid="new-user-btn"
            className="h-[40px]"
            onClick={() => setOpen(true)}
          >
            <Plus className="h-4 w-4" /> New User
          </Btn>
        </div>
        <Card>
          <CardHeader title={`Users (${users.length})`} />
          <Table
            testId="users-table"
            columns={[
              { key: "name", label: "Name" },
              { key: "email", label: "Email" },
              { key: "role", label: "Role" },
              { key: "created_at", label: "Created" },
              {
                key: "act",
                label: "",
                align: "right",
                render: (r) => (
                  <div className="flex gap-2 justify-end">
                    <Btn
                      variant="outline"
                      data-testid={`edit-${r.id}`}
                      onClick={() => handleEdit(r)}
                    >
                      <Pencil className="h-4.5 w-3" />
                    </Btn>
                    <Btn
                      variant="danger"
                      data-testid={`del-${r.id}`}
                      onClick={() => handleDelete(r.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Btn>
                  </div>
                ),
              },
            ]}
            rows={users}
          />
        </Card>
      </Section>

      <Modal open={open} onClose={() => setOpen(false)} title="New User">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Name">
            <input
              className={inputCls}
              value={f.name}
              onChange={(e) => setF({ ...f, name: e.target.value })}
              data-testid="u-name"
            />
          </Field>
          <Field label="Email">
            <input
              className={inputCls}
              value={f.email}
              onChange={(e) => setF({ ...f, email: e.target.value })}
              data-testid="u-email"
            />
          </Field>
          <Field label="Password">
            <input
              type="password"
              className={inputCls}
              value={f.password}
              onChange={(e) => setF({ ...f, password: e.target.value })}
              data-testid="u-pass"
            />
          </Field>
          <Field label="Role">
            <select
              className={inputCls}
              value={f.role}
              onChange={(e) => setF({ ...f, role: e.target.value })}
              data-testid="u-role"
            >
              {ROLES.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </Field>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Btn variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Btn>
          <Btn data-testid="u-submit" onClick={() => mut.mutate(f)}>
            Create
          </Btn>
        </div>
      </Modal>
    </>
  );
}
