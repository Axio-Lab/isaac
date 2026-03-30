export function submissionStatusColor(status: string) {
  switch (status) {
    case "APPROVED":
    case "VETTED":
      return "bg-success/10 text-success border-success/20";
    case "REJECTED":
      return "bg-destructive/10 text-destructive border-destructive/20";
    case "SUBMITTED":
      return "bg-primary/10 text-primary border-primary/20";
    case "MISSED":
      return "bg-destructive/10 text-destructive border-destructive/20";
    case "COLLECTING":
      return "bg-primary/10 text-primary border-primary/20";
    case "PENDING":
      return "bg-warning/10 text-warning border-warning/20";
    case "LATE":
      return "bg-orange-500/10 text-orange-400 border-orange-500/20";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}
