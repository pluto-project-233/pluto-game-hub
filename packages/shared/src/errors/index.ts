/**
 * Base class for all Pluto domain errors
 */
export class PlutoError extends Error {
    constructor(
        message: string,
        public readonly code: string,
        public readonly statusCode: number = 500
    ) {
        super(message);
        this.name = 'PlutoError';
    }

    toJSON() {
        return {
            error: {
                code: this.code,
                message: this.message,
            },
        };
    }
}

// ============================================
// Authentication Errors (401)
// ============================================

export class UnauthorizedError extends PlutoError {
    constructor(message = 'Authentication required') {
        super(message, 'UNAUTHORIZED', 401);
        this.name = 'UnauthorizedError';
    }
}

export class InvalidTokenError extends PlutoError {
    constructor(message = 'Invalid or expired token') {
        super(message, 'INVALID_TOKEN', 401);
        this.name = 'InvalidTokenError';
    }
}

export class InvalidSignatureError extends PlutoError {
    constructor(message = 'Invalid HMAC signature') {
        super(message, 'INVALID_SIGNATURE', 401);
        this.name = 'InvalidSignatureError';
    }
}

// ============================================
// Authorization Errors (403)
// ============================================

export class ForbiddenError extends PlutoError {
    constructor(message = 'Access denied') {
        super(message, 'FORBIDDEN', 403);
        this.name = 'ForbiddenError';
    }
}

// ============================================
// Resource Errors (404)
// ============================================

export class NotFoundError extends PlutoError {
    constructor(resource: string, id?: string) {
        const message = id ? `${resource} with id '${id}' not found` : `${resource} not found`;
        super(message, 'NOT_FOUND', 404);
        this.name = 'NotFoundError';
    }
}

export class UserNotFoundError extends NotFoundError {
    constructor(id?: string) {
        super('User', id);
        this.name = 'UserNotFoundError';
    }
}

export class ContractNotFoundError extends NotFoundError {
    constructor(id?: string) {
        super('Contract', id);
        this.name = 'ContractNotFoundError';
    }
}

export class LobbyNotFoundError extends NotFoundError {
    constructor(id?: string) {
        super('Lobby', id);
        this.name = 'LobbyNotFoundError';
    }
}

export class SessionNotFoundError extends NotFoundError {
    constructor(id?: string) {
        super('GameSession', id);
        this.name = 'SessionNotFoundError';
    }
}

// ============================================
// Payment Errors (402)
// ============================================

export class InsufficientFundsError extends PlutoError {
    constructor(required: bigint, available: bigint) {
        super(
            `Insufficient funds: required ${required}, available ${available}`,
            'INSUFFICIENT_FUNDS',
            402
        );
        this.name = 'InsufficientFundsError';
    }
}

// ============================================
// Conflict Errors (409)
// ============================================

export class ConflictError extends PlutoError {
    constructor(message: string) {
        super(message, 'CONFLICT', 409);
        this.name = 'ConflictError';
    }
}

export class DisplayNameTakenError extends ConflictError {
    constructor(displayName: string) {
        super(`Display name '${displayName}' is already taken`);
        this.name = 'DisplayNameTakenError';
    }
}

export class AlreadyInLobbyError extends ConflictError {
    constructor() {
        super('User is already in a lobby');
        this.name = 'AlreadyInLobbyError';
    }
}

export class SessionAlreadySettledError extends ConflictError {
    constructor(sessionId: string) {
        super(`Session '${sessionId}' has already been settled`);
        this.name = 'SessionAlreadySettledError';
    }
}

export class DuplicateExecutionError extends ConflictError {
    constructor() {
        super('Duplicate contract execution attempt');
        this.name = 'DuplicateExecutionError';
    }
}

// ============================================
// Validation Errors (400)
// ============================================

export class ValidationError extends PlutoError {
    constructor(
        message: string,
        public readonly details?: Record<string, string[]>
    ) {
        super(message, 'VALIDATION_ERROR', 400);
        this.name = 'ValidationError';
    }

    override toJSON() {
        return {
            error: {
                code: this.code,
                message: this.message,
                details: this.details,
            },
        };
    }
}

// ============================================
// Business Logic Errors (422)
// ============================================

export class LobbyFullError extends PlutoError {
    constructor() {
        super('Lobby is full', 'LOBBY_FULL', 422);
        this.name = 'LobbyFullError';
    }
}

export class LobbyNotReadyError extends PlutoError {
    constructor(current: number, required: number) {
        super(
            `Lobby not ready: ${current} players, need ${required}`,
            'LOBBY_NOT_READY',
            422
        );
        this.name = 'LobbyNotReadyError';
    }
}

export class GameNotActiveError extends PlutoError {
    constructor() {
        super('Game is not active', 'GAME_NOT_ACTIVE', 422);
        this.name = 'GameNotActiveError';
    }
}

export class SessionExpiredError extends PlutoError {
    constructor(sessionId: string) {
        super(`Session '${sessionId}' has expired`, 'SESSION_EXPIRED', 422);
        this.name = 'SessionExpiredError';
    }
}
