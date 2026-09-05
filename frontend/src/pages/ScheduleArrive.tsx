import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../store/auth";
import { toast } from "sonner";
import { PageHeader, Section, Card, CardHeader, Btn, Table } from "../components/layout/UI";
import { BellRing, Check } from "lucide-react";

export default function ScheduleArrive() {
  const qc = useQueryClient();
  const { data: arrivals = [] } = useQuery({ queryKey: ["arrivals"], queryFn: () => api.get("/schedule-arrive") });

  const confirmMut = useMutation({
    mutationFn: (id: string) => api.post(`/schedule-arrive/${id}/confirm`, { confirmed: true }),
    onSuccess: () => {
      toast.success("Arrival confirmed — removed from H-2 list");
      qc.invalidateQueries({ queryKey: ["arrivals"] });
    },
  });

  return (
    <>
      <PageHeader
        eyebrow="H-2 alerts"
        title="Schedule Arrive"
        subtitle="Shipments arriving within the next 2 days. Confirm to dismiss from this list."
      />
      <Section>
        <Card>
          <CardHeader title={`Pending H-2 (${arrivals.length})`} action={<BellRing className="h-4 w-4 text-red-500" />} />
          <Table
            testId="arrivals-table"
            empty="Nothing arriving in the next 48 hours."
            columns={[
              { key: "job_no", label: "Job No." },
              { key: "route", label: "Route", render: (r) => `${r.origin} → ${r.destination}` },
              { key: "vessel", label: "Vessel" },
              { key: "eta", label: "ETA" },
              {
                key: "act",
                label: "",
                align: "right",
                render: (r) => (
                  <Btn data-testid={`confirm-arrive-${r.id}`} onClick={() => confirmMut.mutate(r.id)}>
                    <Check className="h-3.5 w-3.5" /> Confirm arrival
                  </Btn>
                ),
              },
            ]}
            rows={arrivals}
          />
        </Card>
      </Section>
    </>
  );
}
