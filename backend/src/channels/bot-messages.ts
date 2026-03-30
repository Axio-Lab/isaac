// ─── Shared task info shape used by onboarding / help ─────────────

export interface TaskInfoForWorker {
  name: string;
  description?: string | null;
  evidenceType: string;
  requiredItems?: Array<{ label: string; evidenceType: string }>;
  acceptanceRules?: string[];
  scheduledTimes?: string[];
  timezone?: string;
  passingScore?: number;
  resubmissionAllowed?: boolean;
}

function formatTaskBrief(task: TaskInfoForWorker): string {
  const parts: string[] = [];

  if (task.description) {
    parts.push(`*About this task:* ${task.description}`);
  }

  const items = task.requiredItems ?? [];
  if (items.length > 0) {
    const list = items
      .map((it, i) => `  ${i + 1}. ${it.label} (${it.evidenceType.toLowerCase()})`)
      .join("\n");
    parts.push(`*What to submit each round:*\n${list}`);
    parts.push("Send each item one at a time in order — I'll guide you through them.");
  } else {
    parts.push(`*Evidence type:* ${task.evidenceType.toLowerCase()}`);
  }

  const rules = (task.acceptanceRules ?? []).filter((r) => r.trim().length > 0);
  if (rules.length > 0) {
    parts.push("*Acceptance criteria:*\n" + rules.map((r, i) => `  ${i + 1}. ${r}`).join("\n"));
  }

  const times = task.scheduledTimes ?? [];
  const tz = task.timezone || "UTC";
  if (times.length > 0) {
    parts.push(`*Schedule:* ${times.join(", ")} (${tz})`);
  }

  if (task.passingScore != null) {
    parts.push(`*Passing score:* ${task.passingScore}/100`);
  }
  if (task.resubmissionAllowed) {
    parts.push("*Resubmission:* allowed if you don't pass on the first try.");
  }

  return parts.join("\n\n");
}

// ─── Onboarding ───────────────────────────────────────────────────

export function msgOnboardingWelcome(workerName: string, task: TaskInfoForWorker | string): string {
  if (typeof task === "string") {
    return (
      `Hi ${workerName}, my name is Isaac — I'll be managing your task submissions.\n\n` +
      `You've been added to: "${task}"\n\n` +
      `When you're ready to start receiving task prompts, reply with "Ready".\n\n` +
      `Once activated, you'll get prompts at the scheduled times. Just reply with the required evidence ` +
      `(photo, text, etc.) and I'll review your submission automatically.`
    );
  }

  return (
    `Hi ${workerName}, my name is Isaac — I'll be managing your task submissions.\n\n` +
    `You've been assigned to: *"${task.name}"*\n\n` +
    `Here's everything you need to know:\n\n` +
    formatTaskBrief(task) +
    `\n\n` +
    `Send *help* at any time for a reminder of these details.\n\n` +
    `When you understand and are ready to start, reply with *Ready*.`
  );
}

export function msgOnboardingPrompt(workerName: string): string {
  return `Hi ${workerName}, please reply with "Ready" to confirm you're set up and start receiving tasks. Send "help" for task details.`;
}

export function msgOnboardingSuccess(workerName: string, taskName: string): string {
  return (
    `Great, ${workerName}! You're now active on "${taskName}". ` +
    `You'll receive task prompts at the scheduled times — just reply with the required evidence when prompted. Let's go!`
  );
}

// ─── Help response ────────────────────────────────────────────────

export function msgHelpResponse(
  workerName: string,
  task: TaskInfoForWorker,
  workerStatus: string,
  pendingInfo?: string
): string {
  const parts = [
    `Hi ${workerName}, here are your task details for *"${task.name}"*:\n`,
    formatTaskBrief(task),
  ];

  if (pendingInfo) {
    parts.push(`*Current status:* ${pendingInfo}`);
  }

  if (workerStatus === "ONBOARDING") {
    parts.push(`You haven't activated yet — reply with *Ready* to start receiving prompts.`);
  }

  parts.push(`If you have further questions, contact your admin.`);

  return parts.join("\n\n");
}

// ─── Task due / submission prompts ────────────────────────────────

export function msgTaskDuePrompt(
  workerName: string,
  taskName: string,
  evidenceType: string,
  dueTime: string,
  tz: string,
  requiredItems?: Array<{ label: string; evidenceType: string }>
): string {
  const items = requiredItems ?? [];
  if (items.length > 0) {
    const list = items
      .map((it, i) => `  ${i + 1}. ${it.label} (${it.evidenceType.toLowerCase()})`)
      .join("\n");
    return (
      `Hi ${workerName}, your task "${taskName}" is due at ${dueTime} (${tz}).\n\n` +
      `Please submit the following items:\n${list}\n\n` +
      `Start by sending your *${items[0].label}*. I'll guide you through the rest.`
    );
  }

  return (
    `Hi ${workerName}, your task "${taskName}" is due at ${dueTime} (${tz}).\n\n` +
    `Please submit your ${evidenceType} now or anytime before then. ` +
    `Just reply with your evidence and I'll review it.`
  );
}

export function msgNoPendingSubmission(
  workerName: string,
  taskName: string,
  scheduledTimes: string[],
  tz: string
): string {
  const scheduleLine =
    scheduledTimes.length > 0
      ? `\n\nThis task is set to prompt you around: ${scheduledTimes.join(", ")} (${tz}).`
      : "\n\nNo fixed daily times are configured — you'll be notified when the next round opens.";

  return (
    `Hi ${workerName},\n\n` +
    `There isn't an open submission for "${taskName}" right now. ` +
    `We're not expecting evidence from you until the next assignment is created for you.` +
    scheduleLine +
    `\n\nWhen it's time, you'll get a message here asking for your proof — reply to that one with your evidence. ` +
    `If you already sent everything for the latest request, you're all set until the next round.`
  );
}

// ─── Multi-item collection ───────────────────────────────────────

export function msgItemReceived(
  label: string,
  received: number,
  total: number,
  nextLabel: string
): string {
  return `${label} received (${received}/${total}). Now send your *${nextLabel}*.`;
}

export function msgAllItemsReceived(workerName: string): string {
  return `Thanks ${workerName}, all items received! Reviewing your submission now...`;
}

// ─── Submission received ──────────────────────────────────────────

export function msgSubmissionReceived(workerName: string): string {
  return `Thanks ${workerName}, your submission has been received!`;
}

export function msgSubmissionReceivedReview(workerName: string): string {
  return `Thanks ${workerName}, your submission has been received and is being reviewed.`;
}

// ─── Missed submission ────────────────────────────────────────────

export function msgSubmissionMissed(
  workerName: string,
  taskName: string,
  dueTimeUtc: string
): string {
  return (
    `Hi ${workerName}, you missed your submission for "${taskName}" ` +
    `(due at ${dueTimeUtc} UTC). ` +
    `Please make sure to submit on time next round.`
  );
}

// ─── Vetting feedback ─────────────────────────────────────────────

export function msgVettingFeedback(
  score: number,
  passed: boolean,
  findings: string[],
  summary: string,
  resubmissionAllowed: boolean,
  acceptanceRules?: string[]
): string {
  const header = `Score: ${score}/100 — ${passed ? "Passed!" : "Did not pass"}`;

  const meaningfulFindings = findings.filter((f) => f.trim().length > 0);
  const findingsBlock =
    meaningfulFindings.length > 0 ? meaningfulFindings.map((f) => `- ${f}`).join("\n") : "";

  const summaryBlock = summary && summary !== "Evaluation completed" ? summary : "";

  const parts = [header];

  if (findingsBlock) {
    parts.push(findingsBlock);
  }

  if (summaryBlock) {
    parts.push(summaryBlock);
  }

  if (!passed && !findingsBlock && !summaryBlock) {
    parts.push("Your submission did not meet the required acceptance criteria.");
  }

  if (!passed && acceptanceRules && acceptanceRules.length > 0) {
    parts.push("Acceptance rules:\n" + acceptanceRules.map((r, i) => `${i + 1}. ${r}`).join("\n"));
  }

  if (!passed && resubmissionAllowed) {
    parts.push("Please try again and send a new submission.");
  }

  return parts.join("\n\n");
}

// ─── Worker status changes ────────────────────────────────────────

export function msgWorkerPaused(workerName: string, taskName: string): string {
  return (
    `Hi ${workerName}, you've been paused on "${taskName}". ` +
    `You won't receive task prompts or be able to submit until you're reactivated. ` +
    `If you think this is a mistake, reach out to your admin.`
  );
}

export function msgWorkerReactivated(workerName: string, taskName: string): string {
  return (
    `Hi ${workerName}, you've been reactivated on "${taskName}"! ` +
    `You'll start receiving task prompts again at the scheduled times. Welcome back!`
  );
}

export function msgWorkerRemoved(workerName: string, taskName: string): string {
  return (
    `Hi ${workerName}, you've been removed from "${taskName}". ` +
    `You will no longer receive task prompts for this task. Take care!`
  );
}

// ─── Task lifecycle (archive / activate) ─────────────────────────

export function msgTaskArchivedNotice(taskName: string): string {
  return (
    `The task "${taskName}" has been archived.\n\n` +
    `You will not receive reminders for it, and submissions are paused until this task is activated again.`
  );
}

export function msgTaskActivatedNotice(taskName: string): string {
  return (
    `The task "${taskName}" is active again.\n\n` +
    `You'll receive reminders and can submit evidence as usual when prompted.`
  );
}

export function msgCannotSubmitTaskArchived(workerName: string, taskName: string): string {
  return (
    `Hi ${workerName},\n\n` +
    `The task "${taskName}" is currently archived — submissions aren't accepted until your admin reactivates it.`
  );
}
