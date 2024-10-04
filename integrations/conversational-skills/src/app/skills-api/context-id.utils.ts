import { ContextId } from '@nestjs/core';
import { ContextIdFactory } from '@nestjs/core/helpers/context-id-factory';
import { REQUEST_CONTEXT_ID } from '@nestjs/core/router/request/request-constants';

export function initializeContext(req: any): ContextId {
  const contextId = getContextId(req);
  req.state[REQUEST_CONTEXT_ID] = contextId;
  return contextId;
}

export function getContextId(req: any) {
  return ContextIdFactory.getByRequest(req, ['state']);
}
