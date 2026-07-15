const input = document.querySelector("#sop-input");
const wordCount = document.querySelector("#word-count");
const runButton = document.querySelector("#run-review");
const sampleButton = document.querySelector("#load-sample");
const clearButton = document.querySelector("#clear-review");
const emptyState = document.querySelector("#empty-state");
const results = document.querySelector("#review-results");
const scoreValue = document.querySelector("#score-value");
const scoreLabel = document.querySelector("#score-label");
const scoreSummary = document.querySelector("#score-summary");
const checksList = document.querySelector("#checks");
const serviceNext = document.querySelector("#service-next");
const serviceEmail = document.querySelector("#service-email");

const sampleProcedure = `# New Client Intake

## Document Control
Process owner: Client Services Lead
Version: 1.2
Effective date: 2026-07-01

## Purpose
Create a complete client record before work is scheduled.

## Trigger
Start when a signed proposal and deposit confirmation are received.

## Prerequisites
- Signed proposal
- Billing contact
- Approved project scope

## Procedure
1. Client Services confirms the proposal and deposit match the approved scope.
2. Client Services creates the client record and records the source documents.
3. Operations reviews the start date, owner, and required handoff notes.
4. Client Services sends the kickoff confirmation.

## Quality Check
- Verify the client name and billing contact against the signed proposal.
- Confirm the project owner and start date are recorded.

## Completion
Complete when Operations confirms the record is ready for scheduling and the confirmation email is saved.

## Exception Path
If the scope, payment, or contact details conflict, pause intake and escalate to the Client Services Lead.`;

const controlDefinitions = [
  {
    name: "Document title",
    test: ({ lines }) => lines.some((line, index) => index < 4 && (/^#{1,3}\s+\S/.test(line) || (/^[A-Z][^.!?]{4,80}$/.test(line) && !line.includes(":")))),
    pass: "A distinct procedure title is present.",
    fail: "Add a specific title that names the workflow and result."
  },
  {
    name: "Purpose or scope",
    test: ({ text }) => /\b(purpose|objective|scope|intended result)\b/i.test(text),
    pass: "Purpose or scope language is present.",
    fail: "State the result this procedure should produce and what it covers."
  },
  {
    name: "Process owner",
    test: ({ text }) => /\b(process owner|procedure owner|responsib(?:le|ility)|accountable|performed by|owner:)\b/i.test(text),
    pass: "An accountable role or owner is identified.",
    fail: "Name the role accountable for keeping the procedure current."
  },
  {
    name: "Start condition",
    test: ({ text }) => /\b(trigger|starts? when|begin when|initiated when|upon receipt|after receiving|when received)\b/i.test(text),
    pass: "An observable trigger or start condition is present.",
    fail: "Define the event or condition that starts the workflow."
  },
  {
    name: "Prerequisites and inputs",
    test: ({ text }) => /\b(prerequisites?|required inputs?|before (you )?begin|requirements?|dependencies|materials|access needed)\b/i.test(text),
    pass: "Required inputs or prior conditions are named.",
    fail: "List the information, approval, material, or prior state required before step one."
  },
  {
    name: "Ordered procedure steps",
    test: ({ stepCount }) => stepCount >= 3,
    detail: ({ stepCount }) => stepCount >= 3 ? `${stepCount} structured steps detected.` : `${stepCount} structured steps detected. Add at least three numbered steps or checklist items.`,
    pass: "The procedure contains a usable action sequence.",
    fail: "Break the work into numbered actions with one observable action per step."
  },
  {
    name: "Completion evidence",
    test: ({ text }) => /\b(complete when|completion criteria|done when|evidence|final output|handoff|confirmation|record is ready)\b/i.test(text),
    pass: "The document indicates how completion can be verified.",
    fail: "Define the record, handoff, approval, or observable state that proves the work is complete."
  },
  {
    name: "Quality control",
    test: ({ text }) => /\b(quality (check|gate|control)|verify|validation|acceptance criteria|review and approve|double-check)\b/i.test(text),
    pass: "A quality check or validation step is present.",
    fail: "Add a check for the highest-risk output before final handoff."
  },
  {
    name: "Exception and escalation path",
    test: ({ text }) => /\b(exception|escalat|fallback|if .{0,50}(fails?|missing|conflict|cannot|unable)|when .{0,40}(missing|conflict))\b/i.test(text),
    pass: "The procedure addresses a failure or exception path.",
    fail: "State what to do, who to notify, and when to stop if the normal path fails."
  },
  {
    name: "Revision control",
    test: ({ text }) => /\b(version|revision history|effective date|last reviewed|review date|approved by)\b/i.test(text),
    pass: "Version, review, or effective-date information is present.",
    fail: "Add a version and effective or review date so staff can identify the current procedure."
  }
];

function getContext() {
  const text = input.value.trim();
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const stepCount = lines.filter((line) => /^(?:step\s+\d+|\d+[.)]|[-*]\s+\[[ xX]\])\s+/i.test(line)).length;
  return { text, lines, stepCount };
}

function updateWordCount() {
  const text = input.value.trim();
  const count = text ? text.split(/\s+/).length : 0;
  wordCount.textContent = `${count} ${count === 1 ? "word" : "words"}`;
}

function resultLabel(score) {
  if (score >= 90) return "Controlled draft";
  if (score >= 70) return "Usable draft with gaps";
  if (score >= 40) return "Control details missing";
  return "Incomplete procedure";
}

function renderCheck(definition, passed, context) {
  const item = document.createElement("li");
  item.className = `check ${passed ? "check-pass" : "check-fail"}`;

  const mark = document.createElement("span");
  mark.className = "check-mark";
  mark.textContent = passed ? "Y" : "!";
  mark.setAttribute("aria-hidden", "true");

  const copy = document.createElement("div");
  copy.className = "check-copy";
  const heading = document.createElement("strong");
  heading.textContent = definition.name;
  const detail = document.createElement("p");
  detail.textContent = definition.detail ? definition.detail(context) : passed ? definition.pass : definition.fail;
  copy.append(heading, detail);

  const status = document.createElement("span");
  status.className = "check-status";
  status.textContent = passed ? "Present" : "Needs work";

  item.append(mark, copy, status);
  checksList.append(item);
}

function runReview() {
  const context = getContext();
  if (!context.text) {
    results.hidden = true;
    emptyState.hidden = false;
    emptyState.querySelector("p").textContent = "Paste a procedure before running the check.";
    input.focus();
    return;
  }

  const outcomes = controlDefinitions.map((definition) => ({
    definition,
    passed: Boolean(definition.test(context))
  }));
  const passedCount = outcomes.filter((outcome) => outcome.passed).length;
  const score = passedCount * 10;
  const gapCount = controlDefinitions.length - passedCount;

  scoreValue.textContent = String(score);
  scoreLabel.textContent = resultLabel(score);
  scoreSummary.textContent = `${passedCount} controls present. ${gapCount} ${gapCount === 1 ? "gap" : "gaps"} identified.`;
  checksList.replaceChildren();
  outcomes.forEach(({ definition, passed }) => renderCheck(definition, passed, context));

  const subject = encodeURIComponent(`SOP cleanup request - ${score}/100 review`);
  const body = encodeURIComponent(`Hello,\n\nI ran the SOP quality checklist and scored ${score}/100. I would like a fixed-scope cleanup quote.\n\nWorkflow name:\nCurrent format:\nTarget deadline:\n\nI will attach or paste a redacted draft after you confirm the next step.`);
  serviceEmail.href = `mailto:max@mackanictechnologies.com?subject=${subject}&body=${body}`;
  serviceNext.hidden = gapCount === 0;
  emptyState.hidden = true;
  results.hidden = false;
}

function clearReview() {
  input.value = "";
  results.hidden = true;
  emptyState.hidden = false;
  emptyState.querySelector("p").textContent = "Run the check to see passed controls and specific gaps.";
  updateWordCount();
  input.focus();
}

input.addEventListener("input", updateWordCount);
runButton.addEventListener("click", runReview);
sampleButton.addEventListener("click", () => {
  input.value = sampleProcedure;
  updateWordCount();
  runReview();
});
clearButton.addEventListener("click", clearReview);

updateWordCount();
