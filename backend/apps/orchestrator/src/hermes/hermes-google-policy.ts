/**
 * The decision to use a billable/external Google API must come from the user's
 * CURRENT message, never a tool-call JSON invented by a model or an old chat turn.
 * Google Search / Google Images inside the authorized Chrome extension remain
 * the default browser workflow; this flag exclusively controls separate APIs.
 */
export function explicitlyAuthorizedGoogleApi(message: string): boolean {
  return /(?:^|\r?\n)AUTORIZO GOOGLE API(?:\r?\n|$)/i.test(message.trim());
}
