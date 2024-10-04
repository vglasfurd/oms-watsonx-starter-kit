import { Inject, Injectable, Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { get } from 'lodash';
import { MessageContext } from '../../api-model/messageContext';
import { Constants } from '../common/constants';

@Injectable({ scope: Scope.REQUEST })
export class JwtHelperService {
  constructor(@Inject(REQUEST) private req: any) {}

  protected getMessageContext(): MessageContext {
    return this.req.context;
  }

  protected getOMSIntegrationsContext() {
    return get(this.getMessageContext(), 'integrations.chat.OMS', Constants.DEFAULT_OMS_INTEGRATIONS_CONTEXT);
  }

  public get jwt() {
    return get(
      this.getMessageContext(),
      'integrations.chat.private.jwt',
      get(this.getOMSIntegrationsContext(), Constants.SESSION_VARIABLE_OMS_JWT),
    );
  }

  public get userId() {
    const userId: string = get(
      this.getMessageContext(),
      'integrations.channel.private.user.id',
      get(this.getMessageContext(), 'integrations.chat.private.jwt_details.userID', ''),
    );
    return userId.startsWith('anonymous_IBMuid') ? '' : userId;
  }
}
