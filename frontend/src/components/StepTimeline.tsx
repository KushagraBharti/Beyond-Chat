import type { RunStep } from "../lib/api";
import { MotionCard, StatusBadge } from "./protectedUi";

export default function StepTimeline({ steps }: { steps: RunStep[] }) {
  return (
    <MotionCard>
      <div className="context-builder-head">
        <div>
          <h3>Tool Runner</h3>
          <p>Track each stage of the run and inspect the produced output.</p>
        </div>
      </div>

      {!steps.length ? (
        <div className="meta-placeholder">No steps yet. Run a task to populate the timeline.</div>
      ) : (
        <div className="timeline-list">
          {steps.map((step, index) => (
            <div key={step.id} className="timeline-item">
              <div className="timeline-index">{index + 1}</div>
              <div className="timeline-body">
                <div className="timeline-header">
                  <div>
                    <strong>{step.step_name}</strong>
                    <p>{step.tool_used}</p>
                  </div>
                  <StatusBadge
                    status={
                      step.status === "completed" || step.status === "failed" || step.status === "running"
                        ? step.status
                        : "disconnected"
                    }
                  />
                </div>
                <pre className="timeline-output">{JSON.stringify(step.output, null, 2)}</pre>
              </div>
            </div>
          ))}
        </div>
      )}
    </MotionCard>
  );
}
