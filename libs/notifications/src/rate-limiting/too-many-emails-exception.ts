export class TooManyEmailsException extends Error {
  constructor(maskedEmail: string, emailType: string) {
    super(`Rate limit exceeded for ${emailType} emails to ${maskedEmail}`);
    this.name = "TooManyEmailsException";
  }
}
