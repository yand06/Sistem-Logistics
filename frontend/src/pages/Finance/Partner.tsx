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
import { Plus } from "lucide-react";

export default function PartnerPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const { data: partners = [] } = useQuery({
    queryKey: ["partners"],
    queryFn: () => api.get("/partners"),
  });
  const [f, setF] = useState<any>({
    name: "",
    type: "vendor",
    contact_person: "",
    phone: "",
    email: "",
    bank_name: "",
    bank_account_no: "",
    bank_account_holder: "",
    notes: "",
  });

  const mut = useMutation({
    mutationFn: (b: any) => api.post("/partners", b),
    onSuccess: () => {
      toast.success("Partner saved");
      qc.invalidateQueries({ queryKey: ["partners"] });
      setOpen(false);
    },
  });

  return (
    <>
      <PageHeader
        eyebrow="Finance"
        title="Partner Kerjasama + Rekening Bank"
        subtitle="Vendors, agents & truckers with linked bank details for outbound payments."
      />
      <Section>
        <div className="flex justify-end -mb-2">
          <Btn data-testid="new-partner-btn" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> New Partner
          </Btn>
        </div>
        <Card>
          <CardHeader title={`Partners (${partners.length})`} />
          <Table
            testId="partner-table"
            columns={[
              { key: "name", label: "Name" },
              { key: "type", label: "Type" },
              { key: "contact_person", label: "PIC" },
              { key: "phone", label: "Phone" },
              { key: "bank_name", label: "Bank" },
              { key: "bank_account_no", label: "Account No." },
              { key: "bank_account_holder", label: "Holder" },
            ]}
            rows={partners}
          />
        </Card>
      </Section>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="New Partner"
        maxWidth="max-w-2xl"
      >
        <div className="grid grid-cols-2 gap-4">
          <Field label="Name">
            <input
              className={inputCls}
              value={f.name}
              onChange={(e) => setF({ ...f, name: e.target.value })}
            />
          </Field>
          <Field label="Type">
            <select
              className={inputCls}
              value={f.type}
              onChange={(e) => setF({ ...f, type: e.target.value })}
            >
              {["vendor", "agent", "trucking", "shipping_line"].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
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
          <Field label="Bank Name">
            <input
              className={inputCls}
              value={f.bank_name}
              onChange={(e) => setF({ ...f, bank_name: e.target.value })}
            />
          </Field>
          <Field label="Bank Account No.">
            <input
              className={inputCls}
              value={f.bank_account_no}
              onChange={(e) => setF({ ...f, bank_account_no: e.target.value })}
            />
          </Field>
          <Field label="Account Holder">
            <input
              className={inputCls}
              value={f.bank_account_holder}
              onChange={(e) =>
                setF({ ...f, bank_account_holder: e.target.value })
              }
            />
          </Field>
        </div>
        <Field label="Notes">
          <textarea
            className={inputCls}
            rows={2}
            value={f.notes}
            onChange={(e) => setF({ ...f, notes: e.target.value })}
          />
        </Field>
        <div className="flex justify-end gap-2 mt-4">
          <Btn variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Btn>
          <Btn data-testid="partner-submit" onClick={() => mut.mutate(f)}>
            Save
          </Btn>
        </div>
      </Modal>
    </>
  );
}
