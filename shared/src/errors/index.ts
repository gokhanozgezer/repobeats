export class RepoBeatsError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message)
    this.name = 'RepoBeatsError'
  }
}

export class RepoNotFoundError extends RepoBeatsError {
  constructor(path: string) {
    super(`Git repository not found at: ${path}`, 'REPO_NOT_FOUND', 404)
    this.name = 'RepoNotFoundError'
  }
}

export class InvalidRepoPathError extends RepoBeatsError {
  constructor(path: string, reason?: string) {
    super(
      `Invalid repository path: ${path}${reason ? ` (${reason})` : ''}`,
      'INVALID_REPO_PATH',
      400
    )
    this.name = 'InvalidRepoPathError'
  }
}

export class MappingValidationError extends RepoBeatsError {
  constructor(message: string, public issues: unknown[]) {
    super(`Mapping validation failed: ${message}`, 'MAPPING_VALIDATION_ERROR', 400)
    this.name = 'MappingValidationError'
  }
}

export class RenderError extends RepoBeatsError {
  constructor(message: string) {
    super(`MIDI render failed: ${message}`, 'RENDER_ERROR', 500)
    this.name = 'RenderError'
  }
}

export class GitCommandError extends RepoBeatsError {
  constructor(command: string, message: string) {
    super(`Git command failed [${command}]: ${message}`, 'GIT_COMMAND_ERROR', 500)
    this.name = 'GitCommandError'
  }
}

export class ExportError extends RepoBeatsError {
  constructor(message: string) {
    super(`Export failed: ${message}`, 'EXPORT_ERROR', 500)
    this.name = 'ExportError'
  }
}

export class CacheError extends RepoBeatsError {
  constructor(message: string) {
    super(`Cache error: ${message}`, 'CACHE_ERROR', 500)
    this.name = 'CacheError'
  }
}

export function isRepoBeatsError(error: unknown): error is RepoBeatsError {
  return error instanceof RepoBeatsError
}
