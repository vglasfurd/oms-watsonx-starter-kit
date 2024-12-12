# How to add a new skill

**Add a new constant to `constants.ts`**

Example:

```typescript
static readonly MINIMAL_SKILL_ID = 'minimal-skill';
```

**Add the skill to `app-configuration.yaml`**

Example:

```yaml
    - id: minimal-skill
      name: Minimal skill
      description: A simple starting place for new skills
      skill_controller_token: minimal-skill
```

**Copy `minimal-skill.service.ts` and use it as a starting point.**

**Add your skill to `skill-service-list.ts`**

**Add translations.**

Create a folder for it in `src/assets/i18n/your-skill-id`
and copy `en.json` from `src/assets/i18n/minimal-skill` to use as a starting point.
