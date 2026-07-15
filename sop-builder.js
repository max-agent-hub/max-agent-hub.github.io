const form = document.querySelector("#sop-form");
const stepsContainer = document.querySelector("#steps");
const stepTemplate = document.querySelector("#step-template");
const preview = document.querySelector("#markdown-preview");
const status = document.querySelector("#tool-status");
const addStepButton = document.querySelector("#add-step");
const copyButton = document.querySelector("#copy-markdown");
const downloadButton = document.querySelector("#download-markdown");

const value = (selector, fallback) => {
  const entry = document.querySelector(selector)?.value.trim();
  return entry || fallback;
};

const lines = (selector, fallback) => {
  const entries = document.querySelector(selector)?.value
    .split(/\r?\n/)
    .map((entry) => entry.trim())
    .filter(Boolean);
  return entries?.length ? entries : fallback;
};

const tableCell = (entry) => entry.replaceAll("|", "\\|").replace(/\s+/g, " ").trim();

function renumberSteps() {
  const rows = [...stepsContainer.querySelectorAll(".step-row")];
  rows.forEach((row, index) => {
    const number = index + 1;
    row.querySelector(".step-number").textContent = String(number).padStart(2, "0");
    for (const input of row.querySelectorAll("input, textarea")) {
      const type = input.classList.contains("step-owner")
        ? "owner"
        : input.classList.contains("step-action")
          ? "action"
          : "completion criteria";
      input.setAttribute("aria-label", `Step ${number} ${type}`);
    }
  });
}

function addStep(seed = {}) {
  const fragment = stepTemplate.content.cloneNode(true);
  const row = fragment.querySelector(".step-row");
  row.querySelector(".step-owner").value = seed.owner || "";
  row.querySelector(".step-action").value = seed.action || "";
  row.querySelector(".step-complete").value = seed.complete || "";
  stepsContainer.append(row);
  renumberSteps();
  updatePreview();
}

function buildMarkdown() {
  const procedureName = value("#procedure-name", "{{Procedure Name}}");
  const processOwner = value("#process-owner", "{{Process Owner}}");
  const version = value("#version", "1.0");
  const purpose = value("#purpose", "{{State the result this procedure must produce.}}");
  const trigger = value("#trigger", "{{Observable event that starts the procedure.}}");
  const completeWhen = value("#complete-when", "{{Observable state that proves the workflow is finished.}}");
  const prerequisites = lines("#prerequisites", ["{{Required input or prior state}}"]);
  const qualityChecks = lines("#quality-checks", ["{{Critical output is verified}}"]);
  const exceptionCondition = value("#exception-condition", "{{Missing or conflicting input}}");
  const exceptionAction = value("#exception-action", "{{Pause safely and escalate to the process owner.}}");
  const effectiveDate = new Date().toISOString().slice(0, 10);

  const procedureRows = [...stepsContainer.querySelectorAll(".step-row")].map((row, index) => {
    const owner = row.querySelector(".step-owner").value.trim() || "{{Role}}";
    const action = row.querySelector(".step-action").value.trim() || "{{Describe one observable action.}}";
    const complete = row.querySelector(".step-complete").value.trim() || "{{Observable evidence}}";
    return `| ${index + 1} | ${tableCell(owner)} | ${tableCell(action)} | ${tableCell(complete)} |`;
  });

  return `# ${procedureName}

## Document Control

| Field | Value |
| --- | --- |
| Process owner | ${tableCell(processOwner)} |
| Version | ${tableCell(version)} |
| Effective date | ${effectiveDate} |
| Status | Draft |

## Purpose

${purpose}

## Trigger And Completion

**Trigger:** ${trigger}

**Complete when:** ${completeWhen}

## Prerequisites

${prerequisites.map((entry) => `- [ ] ${entry}`).join("\n")}

## Procedure

| Step | Owner | Action | Complete When |
| ---: | --- | --- | --- |
${procedureRows.join("\n")}

## Quality Gate

${qualityChecks.map((entry) => `- [ ] ${entry}`).join("\n")}
- [ ] No credentials or unnecessary personal data were recorded.

## Exception Path

| Condition | Response And Escalation |
| --- | --- |
| ${tableCell(exceptionCondition)} | ${tableCell(exceptionAction)} |

## Field Checklist

- [ ] Trigger verified
- [ ] Prerequisites complete
- [ ] Required actions recorded
- [ ] Quality gate passed
- [ ] Exceptions resolved or escalated
- [ ] Final handoff confirmed

## Revision History

| Version | Date | Change | Approved By |
| --- | --- | --- | --- |
| ${tableCell(version)} | ${effectiveDate} | Initial draft | {{Approver}} |
`;
}

function updatePreview() {
  preview.textContent = buildMarkdown();
  status.textContent = "";
}

function filenameForDownload() {
  const name = value("#procedure-name", "operations-sop")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${name || "operations-sop"}.md`;
}

async function copyMarkdown() {
  try {
    await navigator.clipboard.writeText(buildMarkdown());
    status.textContent = "Markdown copied to the clipboard.";
  } catch {
    status.textContent = "Clipboard access was unavailable. Select the preview text to copy it.";
    preview.focus();
  }
}

function downloadMarkdown() {
  const blob = new Blob([buildMarkdown()], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filenameForDownload();
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
  status.textContent = `${filenameForDownload()} downloaded.`;
}

form.addEventListener("submit", (event) => event.preventDefault());
form.addEventListener("input", updatePreview);

addStepButton.addEventListener("click", () => addStep());

stepsContainer.addEventListener("click", (event) => {
  const removeButton = event.target.closest(".remove-step");
  if (!removeButton) return;
  if (stepsContainer.querySelectorAll(".step-row").length === 1) {
    status.textContent = "Keep at least one procedure step.";
    return;
  }
  removeButton.closest(".step-row").remove();
  renumberSteps();
  updatePreview();
});

copyButton.addEventListener("click", copyMarkdown);
downloadButton.addEventListener("click", downloadMarkdown);

addStep({ owner: "", action: "", complete: "" });
addStep({ owner: "", action: "", complete: "" });
addStep({ owner: "", action: "", complete: "" });
