import { Logger } from '@nestjs/common';
import { SearchOrdersSkillService } from '../search-orders-skill.service';
import { Constants, PaginationParams } from '../../../common/constants';
import { Skill } from '../../../../decorators';
import { SearchOrdersSlotNames } from '../slot-names';

/**
 * This skill searches for orders based on the item's description.
 * It is an extension of {@link SearchOrdersSkillService} and has one
 * additional slot to capture the item description. The item description
 * is matched against the item ID and item description fields.
 */
@Skill({
  skillId: Constants.SEARCH_BY_DESC_SKILL_ID,
  slots: [{ name: SearchOrdersSlotNames.ITEM_DESC_SLOT }],
})
export class SearchOrdersByDescriptionSkillService extends SearchOrdersSkillService {
  protected readonly logger: Logger = new Logger('SearchOrdersByDescSkillService');

  protected gatherSearchParameters(): Record<string, any> {
    const parameters = super.gatherSearchParameters();
    parameters.itemDesc = this.getCurrentSlotValue(SearchOrdersSlotNames.ITEM_DESC_SLOT);
    return parameters;
  }

  protected constructSearchInput(parameters: Record<string, any>): { apiInput: any; pagination: PaginationParams } {
    const toReturn = super.constructSearchInput(parameters);
    toReturn.apiInput.OrderLine = {
      ComplexQuery: {
        And: {
          Or: {
            Exp: [
              {
                Name: 'ItemDesc',
                QryType: 'LIKE',
                Value: parameters.itemDesc,
              },
              {
                Name: 'ItemID',
                QryType: 'LIKE',
                Value: parameters.itemDesc,
              },
            ],
          },
        },
      },
    };
    return toReturn;
  }
}
