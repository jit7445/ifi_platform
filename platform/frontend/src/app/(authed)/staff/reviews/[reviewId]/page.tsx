"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { RoleGate } from "@/components/AppShell";
import { ItemAndOutputs, SubmissionView } from "@/components/staff/SubmissionView";
import { Badge, Button, Card, ErrorAlert, Loading, Notice, PageHeader, StatusBadge, TextBlock, Textarea } from "@/components/ui";
import { isApiError, type ReviewDecision, type ReviewDetail } from "@/lib/api";
import { useApi } from "@/lib/auth";
import { useAsyncAction, useResource } from "@/lib/hooks";
import { fmtDate, humanize } from "@/lib/format";
import { REVIEW_ROLES } from "@/lib/roles";

const DECISIONS: { id: ReviewDecision; label: string; hint: string }[] = [
  { id: "accept", label: "Accept", hint: "The submission meets the rubric." },
  { id: "request_rework", label: "Request rework", hint: "The expert revises and resubmits." },
  { id: "reject", label: "Reject", hint: "Discard it; the slot opens for another expert." },
  { id: "escalate", label: "Escalate", hint: "Send to adjudication." },
];

export default function StaffReviewPage() {
  return (
    <RoleGate roles={REVIEW_ROLES}>
      <ReviewScreen />
    </RoleGate>
  );
}

function ReviewScreen() {
  const { reviewId } = useParams<{ reviewId: string }>();
  const api = useApi();
  const res = useResource(`staff:review:${reviewId}`, () => api.staff.review(reviewId));
  const back = { href: "/staff/reviews", label: "Reviews" };

  if (!res.data) {
    return (
      <>
        <PageHeader title="Review" back={back} />
        {res.loading ? <Loading label="Loading review" /> : <ErrorAlert error={res.error} onRetry={res.reload} />}
      </>
    );
  }
  const r = res.data;
  const slots = r.outputs.map((o) => o.slot);
  return (
    <>
      <PageHeader
        title={r.project_name}
        back={back}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge status={r.status} />
            <Badge tone={r.kind === "gold_fail" ? "red" : r.kind === "low_agreement" ? "yellow" : "gray"}>{humanize(r.kind)}</Badge>
            <span>Expert {r.expert_pseudonym}</span>
            <span>Created {fmtDate(r.created_at)}</span>
          </span>
        }
      />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="flex min-w-0 flex-col gap-4">
          {r.rubric_version?.instructions_md && (
            <details className="rounded-xl border border-line bg-surface p-4 shadow-card sm:p-5">
              <summary className="cursor-pointer text-base font-semibold text-fg">Rubric instructions (v{r.rubric_version.version})</summary>
              <TextBlock className="mt-3" text={r.rubric_version.instructions_md} />
            </details>
          )}
          <ItemAndOutputs item={r.item} outputs={r.outputs} />
        </div>
        <div className="flex flex-col gap-4">
          <Card title="Submission">
            <SubmissionView submission={r.submission} criteria={r.rubric_version?.criteria ?? []} errorLabels={r.rubric_version?.error_labels ?? []} slots={slots} />
          </Card>
          <DecisionCard review={r} onChanged={res.reload} />
        </div>
      </div>
    </>
  );
}

function DecisionCard({ review: r, onChanged }: { review: ReviewDetail; onChanged: () => void }) {
  const api = useApi();
  const [decision, setDecision] = useState<ReviewDecision | null>(null);
  const [feedback, setFeedback] = useState("");
  const [done, setDone] = useState<ReviewDecision | null>(null);
  const claim = useAsyncAction(() => api.staff.claimReview(r.id));
  const decide = useAsyncAction((d: ReviewDecision, f: string) => api.staff.decideReview(r.id, { decision: d, feedback: f }));
  const needsFeedback = decision !== null && decision !== "accept";

  if (r.status === "done" || done) {
    return <Notice tone="green">{done ? `Decision recorded: ${humanize(done)}.` : "This review is closed."}</Notice>;
  }

  return (
    <Card title="Decision">
      {r.status === "open" && (
        <div className="mb-4">
          <p className="mb-2 text-sm text-fg-muted">Claim the review so no one else works on it.</p>
          <Button
            variant="secondary"
            loading={claim.pending}
            onClick={async () => {
              if (await claim.run()) onChanged();
            }}
          >
            Claim
          </Button>
          <div className="mt-2">
            <ErrorAlert error={claim.error} />
          </div>
        </div>
      )}
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium text-fg">Outcome</legend>
        {DECISIONS.map((d) => (
          <label key={d.id} className="flex cursor-pointer items-start gap-2 rounded-md border border-line p-2 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary-subtle">
            <input type="radio" name="decision" className="mt-0.5 accent-primary" checked={decision === d.id} onChange={() => setDecision(d.id)} />
            <span>
              <span className="font-medium">{d.label}</span>
              <span className="block text-xs text-fg-muted">{d.hint}</span>
            </span>
          </label>
        ))}
      </fieldset>
      <Textarea
        wrapperClassName="mt-3"
        label="Feedback to the expert"
        required={needsFeedback}
        rows={4}
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
        hint="Experts see this message; it is not attributed to you by name."
      />
      <div className="mt-3 flex flex-col gap-2">
        {isApiError(decide.error, "self_review") ? <Notice tone="yellow">You cannot review your own submission.</Notice> : <ErrorAlert error={decide.error} />}
        <Button
          disabled={!decision || (needsFeedback && !feedback.trim())}
          loading={decide.pending}
          onClick={async () => {
            if (!decision) return;
            const res = await decide.run(decision, feedback.trim());
            if (res) {
              setDone(decision);
              onChanged();
            }
          }}
        >
          Record decision
        </Button>
      </div>
    </Card>
  );
}
