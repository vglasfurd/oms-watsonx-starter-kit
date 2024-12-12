import { Inject, Injectable, Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { get } from 'lodash';
import { MessageContext } from '../../api-model/messageContext';
import { Constants } from '../common/constants';

/**
 * This service provides access to the incoming JWT and the user context in the orchestrate API request
 */
@Injectable({ scope: Scope.REQUEST })
export class JwtHelperService {
  constructor(@Inject(REQUEST) private req: any) {}

  /**
   * Returns the message context.
   * @returns The message context
   */
  protected getMessageContext(): MessageContext {
    return this.req.context;
  }

  /**
   * Returns the OMS namespace in the integrations context.
   * The namespace contains any variables or context setup by the OMS UIs.
   * @returns The OMS namespace in the integrations context
   */
  protected getOMSIntegrationsContext() {
    return get(this.getMessageContext(), 'integrations.chat.OMS', Constants.DEFAULT_OMS_INTEGRATIONS_CONTEXT);
  }

  /**
   * This method returns the OMS JWT provided in the orchestrate API request.
   * @returns the OMS JWT
   */
  public get jwt() {
    return get(
      this.getMessageContext(),
      'integrations.chat.private.jwt',
      get(this.getOMSIntegrationsContext(), Constants.SESSION_VARIABLE_OMS_JWT),
    );
  }

  /**
   * This method returns the OMS login Id of the user.
   * @returns the OMS login Id of the user.
   */
  public get userId() {
    const userId: string = get(
      this.getMessageContext(),
      'integrations.channel.private.user.id',
      get(this.getMessageContext(), 'integrations.chat.private.jwt_details.userID', ''),
    );
    return userId.startsWith('anonymous_IBMuid') ? '' : userId;
  }
}
