import type { RestRequestRejection } from './rest.js'

export function convertRestError (
  errorStack: Error,
  data: RestRequestRejection
): Error {
  errorStack.message = `[${data.status}] ${data.error}\n${data.body ?? ''}`
  return errorStack
}
