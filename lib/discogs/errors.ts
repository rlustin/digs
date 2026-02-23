export class AuthExpiredError extends Error {
  constructor() {
    super("authentication_expired");
    this.name = "AuthExpiredError";
  }
}
