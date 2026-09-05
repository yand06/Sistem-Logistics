import React from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../store/auth";
import { PageHeader, Section, Card, CardHeader, Table } from "../../components/layout/UI";

export default function AuditLog() {
  const { data: logs = [] } = useQuery({ queryKey: ["audit"], queryFn: () => api.get("/audit-logs") });
  return (
    <>
      <PageHeader
        eyebrow="Compliance"
        title="Audit Log"
        subtitle="Every finance & master-data change is captured here — who, when, what."
      />
      <Section>
        <Card>
          <CardHeader title={`Log entries (${logs.length})`} />
          <Table
            testId="audit-table"
            columns={[
              { key: "created_at", label: "Timestamp" },
              { key: "actor_email", label: "User" },
              { key: "actor_role", label: "Role" },
              { key: "action", label: "Action" },
              { key: "entity", label: "Entity" },
              { key: "entity_id", label: "ID" },
            ]}
            rows={logs}
          />
        </Card>
      </Section>
    </>
  );
}
