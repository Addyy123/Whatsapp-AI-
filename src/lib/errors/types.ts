export class AgentError extends Error {
  constructor(message: string, public code: string, public status: number = 500) {
    super(message);
    this.name = 'AgentError';
  }
}

export class AuthError extends AgentError {
  constructor(message = 'Unauthorized agent access') {
    super(message, 'UNAUTHORIZED', 401);
    this.name = 'AuthError';
  }
}

export class PolicyError extends AgentError {
  constructor(message: string) {
    super(message, 'POLICY_VIOLATION', 403);
    this.name = 'PolicyError';
  }
}

export class ContextLengthError extends AgentError {
  constructor(message = 'Context length exceeded') {
    super(message, 'CONTEXT_LENGTH_EXCEEDED', 400);
    this.name = 'ContextLengthError';
  }
}

export class LLMTimeoutError extends AgentError {
  constructor(message = 'LLM timed out') {
    super(message, 'LLM_TIMEOUT', 504);
    this.name = 'LLMTimeoutError';
  }
}
