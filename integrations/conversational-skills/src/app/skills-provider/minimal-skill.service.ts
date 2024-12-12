import { Logger } from '@nestjs/common';
import { AbstractSkillProviderService } from '../skills-api/abstract-skill-provider.service';
import { Slot, EntityValue, Entity } from '../../conv-sdk/index';
import { Constants } from '../common/constants';
import { areAllParametersSet } from '../common/functions';
import { OmsCommonService } from '../oms/oms-common.service';
import { OnSlotChange, Skill } from 'src/decorators';

const MINIMAL_SKILL_SLOT = 'MinimalSkill';

@Skill({
  skillId: Constants.MINIMAL_SKILL_ID,
  slots: [{ name: MINIMAL_SKILL_SLOT }],
})
export class MinimalSkillService extends AbstractSkillProviderService {
  protected readonly logger: Logger = new Logger('MinimalSkillService');

  constructor(protected commonService: OmsCommonService) {
    super();
  }

  protected async initializeSlotsInFlight() {
    const options1 = [
      new EntityValue({ label: 'Slot 1a', value: 'slot-1a', synonyms: ['Slot 1a', 'slot-1a'], patterns: undefined }),
    ];

    const skillSlot = this.getSkillResponseSlot(MINIMAL_SKILL_SLOT);
    skillSlot.schema = new Entity(MINIMAL_SKILL_SLOT, options1);
  }

  protected async postOnSlotStateChange() {
    const parameters = this.getNormalizedSlotValues([MINIMAL_SKILL_SLOT]);
    console.log('postOnSlotStateChange', parameters);
    if (areAllParametersSet(parameters)) {
      console.log('All parameters set!');
      // Do your thing!
    }
  }

  @OnSlotChange(MINIMAL_SKILL_SLOT)
  private async onSimpleChange1(slot: Slot, slotInFlight: Slot) {
    console.log('onSimpleChange1', slot, slotInFlight);
  }
}
