import { ContextId } from '@nestjs/core';
import { ContextIdFactory } from '@nestjs/core/helpers/context-id-factory';
import { REQUEST_CONTEXT_ID } from '@nestjs/core/router/request/request-constants';

/**
 * This method initializes the request context. This allows NestJS to create
 * a new request context so that any dependencies injected will be done on a per instance basis.
 *
 * @param req The request object.
 * @returns A new request context id
 */
export function initializeContext(req: any): ContextId {
  const contextId = getContextId(req);
  req.state[REQUEST_CONTEXT_ID] = contextId;
  return contextId;
}

/**
 * Returns the context id from the request object.
 * @param req The request object containing the context id.
 * @returns The context id.
 */
export function getContextId(req: any) {
  return ContextIdFactory.getByRequest(req, ['state']);
}
