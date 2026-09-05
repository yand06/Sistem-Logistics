import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, useAuth } from "../../store/auth";
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
import { Plus, Trash2, Pencil } from "lucide-react";

export default function MasterCustomer() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editData, setEditData] = useState<any>(null);
  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: () => api.get("/customers"),
  });
  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    enabled: user?.role === "admin",
    queryFn: () => api.get("/users"),
  });

  const [f, setF] = useState<any>({
    name: "",
    npwp: "",
    address: "",
    contact_person: "",
    phone: "",
    email: "",
    payment_terms: "NET 30",
    sales_id: "",
  });

  const mut = useMutation({
    mutationFn: (b: any) => api.post("/customers", b),
    onSuccess: () => {
      toast.success("Customer saved");
      qc.invalidateQueries({ queryKey: ["customers"] });
      handleClose();
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Failed"),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: any) => api.patch(`/customers/${id}`, data),
    onSuccess: () => {
      toast.success("Customer updated");
      qc.invalidateQueries({ queryKey: ["customers"] });
      handleClose();
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Failed"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.del(`/customers/${id}`),
    onSuccess: () => {
      toast.success("Customer deleted");
      qc.invalidateQueries({ queryKey: ["customers"] });
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.detail || "Failed to delete"),
  });

  function handleClose() {
    setOpen(false);
    setEditData(null);
    setF({
      name: "",
      npwp: "",
      address: "",
      contact_person: "",
      phone: "",
      email: "",
      payment_terms: "NET 30",
      sales_id: "",
    });
  }

  function handleEdit(customer: any) {
    setEditData(customer);
    setF({
      name: customer.name || "",
      npwp: customer.npwp || "",
      address: customer.address || "",
      contact_person: customer.contact_person || "",
      phone: customer.phone || "",
      email: customer.email || "",
      payment_terms: customer.payment_terms || "NET 30",
      sales_id: customer.sales_id || "",
    });
    setOpen(true);
  }

  function handleDelete(id: string) {
    if (window.confirm("Are you sure you want to delete this customer?")) {
      deleteMut.mutate(id);
    }
  }

  function handleSubmit() {
    if (editData) {
      updateMut.mutate({ id: editData.id, data: f });
    } else {
      mut.mutate(f);
    }
  }

  const canCreate =
    user?.role === "admin" || user?.role === "sales" || user?.role === "cs";
  const salesUsers = (users as any[]).filter((u) => u.role === "sales");

  return (
    <>
      <PageHeader
        eyebrow="Master Data"
        title="Customers"
        subtitle={
          user?.role === "sales"
            ? "You only see customers assigned to you — data isolation is enforced server-side."
            : "Full customer master. Assign sales owners & payment terms."
        }
      />
      <Section>
        <div className="flex justify-end -mb-2">
          {canCreate && (
            <Btn data-testid="new-customer-btn" onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" /> New Customer
            </Btn>
          )}
        </div>
        <Card>
          <CardHeader title={`Customers (${customers.length})`} />
          <Table
            testId="customer-table"
            columns={[
              { key: "name", label: "Name" },
              { key: "npwp", label: "NPWP" },
              { key: "contact_person", label: "PIC" },
              { key: "phone", label: "Phone" },
              { key: "payment_terms", label: "Payment" },
              {
                key: "sales",
                label: "Sales",
                render: (r) =>
                  (users as any[]).find((u: any) => u.id === r.sales_id)
                    ?.name || (r.sales_id ? "—" : "unassigned"),
              },
              ...(canCreate
                ? [
                    {
                      key: "actions",
                      label: "",
                      align: "right" as const,
                      render: (r: any) => (
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
                            data-testid={`delete-${r.id}`}
                            onClick={() => handleDelete(r.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Btn>
                        </div>
                      ),
                    },
                  ]
                : []),
            ]}
            rows={customers}
          />
        </Card>
      </Section>

      <Modal
        open={open}
        onClose={handleClose}
        title={editData ? "Edit Customer" : "New Customer"}
        maxWidth="max-w-2xl"
      >
        <div className="grid grid-cols-2 gap-3">
          <Field label="Name">
            <input
              className={inputCls}
              value={f.name}
              onChange={(e) => setF({ ...f, name: e.target.value })}
              data-testid="c-name"
            />
          </Field>
          <Field label="NPWP">
            <input
              className={inputCls}
              value={f.npwp}
              onChange={(e) => setF({ ...f, npwp: e.target.value })}
            />
          </Field>
          <Field label="Contact Person">
            <input
              className={inputCls}
              value={f.contact_person}
              onChange={(e) => setF({ ...f, contact_person: e.target.value })}
            />
          </Field>
          <Field label="Phone">
            <input
              className={inputCls}
              value={f.phone}
              onChange={(e) => setF({ ...f, phone: e.target.value })}
            />
          </Field>
          <Field label="Email">
            <input
              className={inputCls}
              value={f.email}
              onChange={(e) => setF({ ...f, email: e.target.value })}
            />
          </Field>
          <Field label="Payment Terms">
            <select
              className={inputCls}
              value={f.payment_terms}
              onChange={(e) => setF({ ...f, payment_terms: e.target.value })}
            >
              {["COD", "NET 14", "NET 30", "NET 45", "NET 60"].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </Field>
          {user?.role === "admin" && (
            <Field label="Assign Sales">
              <select
                className={inputCls}
                value={f.sales_id}
                onChange={(e) => setF({ ...f, sales_id: e.target.value })}
              >
                <option value="">— unassigned —</option>
                {salesUsers.map((s: any) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </Field>
          )}
        </div>
        <Field label="Address">
          <textarea
            rows={2}
            className={inputCls}
            value={f.address}
            onChange={(e) => setF({ ...f, address: e.target.value })}
          />
        </Field>
        <div className="flex justify-end gap-2 mt-4">
          <Btn variant="ghost" onClick={handleClose}>
            Cancel
          </Btn>
          <Btn data-testid="c-submit" onClick={handleSubmit}>
            {editData ? "Update" : "Save"}
          </Btn>
        </div>
      </Modal>
    </>
  );
}
