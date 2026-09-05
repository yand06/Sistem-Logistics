import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../store/auth";
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
  StatusBadge,
} from "../components/layout/UI";
import { Plus } from "lucide-react";

const STATUSES = ["in_progress", "cleared", "held"];

export default function Customs() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const { data: docs = [] } = useQuery({
    queryKey: ["customs-docs"],
    queryFn: () => api.get("/customs-docs"),
  });
  const { data: jos = [] } = useQuery({
    queryKey: ["job-orders"],
    queryFn: () => api.get("/job-orders"),
  });
  const [f, setF] = useState<any>({
    job_order_id: "",
    doc_number: "",
    doc_type: "PIB",
    status: "in_progress",
    notes: "",
  });

  const mut = useMutation({
    mutationFn: (b: any) => api.post("/customs-docs", b),
    onSuccess: () => {
      toast.success("Customs doc created");
      qc.invalidateQueries({ queryKey: ["customs-docs"] });
      setOpen(false);
    },
  });
  const patchMut = useMutation({
    mutationFn: ({ id, status }: any) =>
      api.patch(`/customs-docs/${id}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["customs-docs"] }),
  });

  return (
    <>
      <PageHeader
        eyebrow="Customs"
        title="Kepabeanan"
        subtitle="Create PIB / PEB / customs documents and update their clearance status."
      />
      <Section>
        <div className="flex justify-end -mb-2">
          <Btn data-testid="new-customs-btn" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> New Customs Doc
          </Btn>
        </div>
        <Card>
          <CardHeader title={`Customs Documents (${docs.length})`} />
          <Table
            testId="customs-table"
            columns={[
              { key: "doc_number", label: "No." },
              { key: "doc_type", label: "Type" },
              {
                key: "job",
                label: "Job Order",
                render: (r) =>
                  jos.find((j: any) => j.id === r.job_order_id)?.job_no || "—",
              },
              {
                key: "status",
                label: "Status",
                render: (r) => <StatusBadge status={r.status} />,
              },
              {
                key: "act",
                label: "",
                align: "right",
                render: (r) => (
                  <select
                    className={`${inputCls} inline-block w-40`}
                    data-testid={`status-${r.id}`}
                    value={r.status}
                    onChange={(e) =>
                      patchMut.mutate({ id: r.id, status: e.target.value })
                    }
                  >
                    {STATUSES.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                ),
              },
            ]}
            rows={docs}
          />
        </Card>
      </Section>

      <Modal open={open} onClose={() => setOpen(false)} title="New Customs Doc">
        <Field label="Job Order">
          <select
            className={inputCls}
            value={f.job_order_id}
            onChange={(e) => setF({ ...f, job_order_id: e.target.value })}
          >
            <option value="">—</option>
            {jos.map((j: any) => (
              <option key={j.id} value={j.id}>
                {j.job_no}
              </option>
            ))}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3 mt-3">
          <Field label="Doc Number">
            <input
              className={inputCls}
              value={f.doc_number}
              onChange={(e) => setF({ ...f, doc_number: e.target.value })}
            />
          </Field>
          <Field label="Doc Type">
            <select
              className={inputCls}
              value={f.doc_type}
              onChange={(e) => setF({ ...f, doc_type: e.target.value })}
            >
              {["PIB", "PEB", "PPFTZ", "Other"].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Notes">
          <textarea
            rows={2}
            className={inputCls}
            value={f.notes}
            onChange={(e) => setF({ ...f, notes: e.target.value })}
          />
        </Field>
        <div className="flex justify-end gap-2 mt-4">
          <Btn variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Btn>
          <Btn data-testid="customs-submit" onClick={() => mut.mutate(f)}>
            Save
          </Btn>
        </div>
      </Modal>
    </>
  );
}
