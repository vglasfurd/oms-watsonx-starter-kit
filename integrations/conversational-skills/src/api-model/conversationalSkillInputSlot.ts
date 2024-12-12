export interface ConversationalSkillInputSlot {
  name: string;
  description: string;
  type: string | 'string' | 'number' | 'date' | 'time' | 'regex' | 'entity' | 'confirmation' | 'any';
}
