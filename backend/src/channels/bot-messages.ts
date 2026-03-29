// ─── Onboarding ───────────────────────────────────────────────────

export function msgOnboardingWelcome(workerName: string, taskName: string): string {
  return (
    `Hi ${workerName}, my name is Isaac — I'll be managing your task submissions.\n\n` +
    `You've been added to: "${taskName}"\n\n` +
    `When you're ready to start receiving task prompts, reply with "Ready".\n\n` +
    `Once activated, you'll get prompts at the scheduled times. Just reply with the required evidence ` +
    `(photo, text, etc.) and I'll review your submission automatically.`
  );
}

export function msgOnboardingPrompt(workerName: string): string {
  return `Hi ${workerName}, please reply with "Ready" to confirm you're set up and start receiving tasks.`;
}

export function msgOnboardingSuccess(workerName: string, taskName: string): string {
  return (
    `Great, ${workerName}! You're now active on "${taskName}". ` +
    `You'll receive task prompts at the scheduled times — just reply with the required evidence when prompted. Let's go!`
  );
}

// ─── Task due / submission prompts ────────────────────────────────

export function msgTaskDuePrompt(
  workerName: string,
  taskName: string,
  evidenceType: string,
  dueTime: string,
  tz: string,
): string {
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
  tz: string,
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
  dueTimeUtc: string,
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
): string {
  const findingsText = findings.map((f) => `- ${f}`).join("\n");
  let feedback = `Score: ${score}/100 — ${passed ? "Passed!" : "Did not pass"}\n\n${findingsText}\n\n${summary}`;
  if (!passed && resubmissionAllowed) {
    feedback += "\n\nPlease try again and send a new submission.";
  }
  return feedback;
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

/** Broadcast to all active workers when a task is archived. */
export function msgTaskArchivedNotice(taskName: string): string {
  return (
    `The task "${taskName}" has been archived.\n\n` +
    `You will not receive reminders for it, and submissions are paused until this task is activated again.`
  );
}

/** Broadcast when an archived task is reactivated. */
export function msgTaskActivatedNotice(taskName: string): string {
  return (
    `The task "${taskName}" is active again.\n\n` +
    `You'll receive reminders and can submit evidence as usual when prompted.`
  );
}

export function msgCannotSubmitTaskArchived(
  workerName: string,
  taskName: string,
): string {
  return (
    `Hi ${workerName},\n\n` +
    `The task "${taskName}" is currently archived — submissions aren't accepted until your admin reactivates it.`
  );
}
