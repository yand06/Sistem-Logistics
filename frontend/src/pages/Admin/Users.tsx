import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../store/auth";
import { toast } from "sonner";
import { PageHeader, Section, Card, CardHeader, Btn, Field, inputCls, Table, Modal } from "../../components/layout/UI";
import { Plus, Trash2 } from "lucide-react";

const ROLES = ["admin", "sales", "cs", "customs", "finance", "pricing"];

export default function AdminUsers() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const { data: users = [] } = useQuery({ queryKey: ["users"], queryFn: () => api.get("/users") });
  const [f, setF] = useState<any>({ email: "", password: "", name: "", role: "sales" });
  const mut = useMutation({
    mutationFn: (b: any) => api.post("/users", b),
    onSuccess: () => {
      toast.success("User created");
      qc.invalidateQueries({ queryKey: ["users"] });
      setOpen(false);
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Failed"),
  });
  const delMut = useMutation({
    mutationFn: (id: string) => api.del(`/users/${id}`),
    onSuccess: () => {
      toast.success("User deleted");
      qc.invalidateQueries({ queryKey: ["users"] });
    },
  });

  return (
    <>
      <PageHeader
        eyebrow="Admin"
        title="User & Role Management"
        subtitle="Create division users. Roles: admin, sales, cs, customs, finance, pricing."
        actions={<Btn data-testid="new-user-btn" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> New User</Btn>}
      />
      <Section>
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
                  <Btn variant="danger" data-testid={`del-${r.id}`} onClick={() => delMut.mutate(r.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Btn>
                ),
              },
            ]}
            rows={users}
          />
        </Card>
      </Section>

      <Modal open={open} onClose={() => setOpen(false)} title="New User">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Name"><input className={inputCls} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} data-testid="u-name" /></Field>
          <Field label="Email"><input className={inputCls} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} data-testid="u-email" /></Field>
          <Field label="Password"><input type="password" className={inputCls} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} data-testid="u-pass" /></Field>
          <Field label="Role">
            <select className={inputCls} value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })} data-testid="u-role">
              {ROLES.map((r) => <option key={r}>{r}</option>)}
            </select>
          </Field>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Btn variant="ghost" onClick={() => setOpen(false)}>Cancel</Btn>
          <Btn data-testid="u-submit" onClick={() => mut.mutate(f)}>Create</Btn>
        </div>
      </Modal>
    </>
  );
}
