import { Logger } from '@nestjs/common';
import { MostRecentTransactionSkillService } from '../most-recent-transaction/most-recent-transaction-skill.service';
import { Constants } from '../../../common/constants';
import { Skill } from '../../../../decorators';
import { getArray } from 'src/app/common/functions';
import { get, chain } from 'lodash';

/**
 * This skill fetches the most recent payment transaction made by a shopper.
 * This is an extension of the {@link MostRecentTransactionSkillService}.
 */
@Skill({
  skillId: Constants.MOST_RECENT_PAYMENT_METHOD_SKILL_ID,
  slots: [],
})
export class MostRecentPaymentSkillService extends MostRecentTransactionSkillService {
  protected logger: Logger = new Logger('MostRecentPaymentSkillService');

  protected getTemplateName() {
    return Constants.MOST_RECENT_PAYMENT_METHOD_SKILL_ID;
  }

  protected async constructOrderDetailsResponse(Order: any, parameters: any): Promise<void> {
    const paymentMethods = getArray(get(Order, 'PaymentMethods.PaymentMethod'));
    if (paymentMethods.length > 0) {
      const paymentTypes = chain(await this.commonService.getPaymentTypeList(Order.EnterpriseCode))
        .keyBy('PaymentType')
        .mapValues('PaymentTypeDescription')
        .value();
      this.addTextResponse(this.getStringLiteral('actionResponses.paymentMethodsUsed', { parameters, Order }));
      paymentMethods.forEach((PaymentMethod) => {
        PaymentMethod.Amount = PaymentMethod.TotalCharged || PaymentMethod.PlannedRefundAmount;
        PaymentMethod.PaymentTypeDescription = paymentTypes[PaymentMethod.PaymentType];
        this.addTextResponse(
          this.getStringLiteral('actionResponses.paymentMethodDetails', {
            PaymentMethod,
            Order,
          }),
        );
      });
      super.constructOrderDetailsResponse(Order, parameters);
    } else {
      this.addTextResponse(this.getStringLiteral('actionResponses.noRecentPaymentMethod', { parameters }));
    }
  }
}
