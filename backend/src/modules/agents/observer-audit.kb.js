import auditKb from '../../seed/observer-audit.json' with { type: 'json' };

export function getObserverAuditKb() {
  return auditKb;
}

export function getObserverSystemPrompt() {
  return auditKb.observer_prompt;
}

export function getObserverOutputSchema() {
  return auditKb.output_schema;
}

export function getObserverHeadlineFindings() {
  return auditKb.headline_findings_from_171_calls;
}

export function getObserverDetectionFloors() {
  return auditKb.detection_rates_floors;
}
