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
} from "../components/layout/UI";
import { Plus, Download } from "lucide-react";

const DOC_TYPES = [
  "BL",
  "CIPL",
  "COO",
  "Packing List",
  "Tanda Terima",
  "Other",
];

export default function Documents() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const { data: docs = [] } = useQuery({
    queryKey: ["documents"],
    queryFn: () => api.get("/documents"),
  });
  const { data: jos = [] } = useQuery({
    queryKey: ["job-orders"],
    queryFn: () => api.get("/job-orders"),
  });

  const [form, setForm] = useState<any>({
    job_order_id: "",
    doc_type: "BL",
    file_name: "",
    file_url: "",
    notes: "",
  });
  const mut = useMutation({
    mutationFn: (b: any) => api.post("/documents", b),
    onSuccess: () => {
      toast.success("Document logged — auto-renamed");
      qc.invalidateQueries({ queryKey: ["documents"] });
      setOpen(false);
    },
  });

  function downloadRenamed(row: any) {
    const blob = new Blob(
      [
        `# ${row.auto_name || row.file_name}\n\nJob Order: ${row.job_order_id}\nType: ${row.doc_type}\nNotes: ${row.notes || ""}`,
      ],
      { type: "text/plain" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = row.auto_name || row.file_name || "document.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <PageHeader
        eyebrow="Job Order Attachments"
        title="Documents"
        subtitle="Upload BL, CIPL, COO & Tanda Terima. Files auto-rename by [JOB_NO]_[DOC_TYPE]_[DATE] on download."
      />
      <Section>
        <div className="flex justify-end -mb-2">
          <Btn data-testid="new-doc-btn" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> Log Document
          </Btn>
        </div>
        <Card>
          <CardHeader title={`Documents (${docs.length})`} />
          <Table
            testId="documents-table"
            columns={[
              { key: "doc_type", label: "Type" },
              {
                key: "job",
                label: "Job Order",
                render: (r) =>
                  jos.find((j: any) => j.id === r.job_order_id)?.job_no || "—",
              },
              { key: "file_name", label: "Original" },
              { key: "auto_name", label: "Auto-rename" },
              { key: "notes", label: "Notes" },
              {
                key: "dl",
                label: "",
                align: "right",
                render: (r) => (
                  <Btn
                    variant="outline"
                    data-testid={`dl-${r.id}`}
                    onClick={() => downloadRenamed(r)}
                  >
                    <Download className="h-3.5 w-3.5" /> Download
                  </Btn>
                ),
              },
            ]}
            rows={docs}
          />
        </Card>
      </Section>

      <Modal open={open} onClose={() => setOpen(false)} title="Log a Document">
        <div className="space-y-4">
          <Field label="Job Order">
            <select
              className={inputCls}
              value={form.job_order_id}
              onChange={(e) =>
                setForm({ ...form, job_order_id: e.target.value })
              }
            >
              <option value="">— None —</option>
              {jos.map((j: any) => (
                <option key={j.id} value={j.id}>
                  {j.job_no}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Document Type">
            <select
              className={inputCls}
              value={form.doc_type}
              onChange={(e) => setForm({ ...form, doc_type: e.target.value })}
            >
              {DOC_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </Field>
          <Field label="Original File Name">
            <input
              className={inputCls}
              placeholder="scan_bl_original.pdf"
              value={form.file_name}
              onChange={(e) => setForm({ ...form, file_name: e.target.value })}
            />
          </Field>
          <Field label="File URL (optional link)">
            <input
              className={inputCls}
              value={form.file_url}
              onChange={(e) => setForm({ ...form, file_url: e.target.value })}
            />
          </Field>
          <Field label="Notes">
            <textarea
              className={inputCls}
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </Field>
          <div className="flex justify-end gap-2">
            <Btn variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Btn>
            <Btn data-testid="doc-submit" onClick={() => mut.mutate(form)}>
              Save
            </Btn>
          </div>
        </div>
      </Modal>
    </>
  );
}
