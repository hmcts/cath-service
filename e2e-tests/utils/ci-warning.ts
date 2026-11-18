// Surfaces the message as a warning annotation on the GitHub Actions run summary; plain console warning elsewhere
export function warnInCi(message: string): void {
  const singleLine = message.replace(/\r?\n/g, " ");
  if (process.env.GITHUB_ACTIONS === "true") {
    console.log(`::warning title=E2E test data cleanup::${singleLine}`);
  } else {
    console.warn(`WARNING: ${singleLine}`);
  }
}
