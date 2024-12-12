# Order notes summarization skill

The order notes summarization skill performs a RAG using notes associated to an order as context. This skill depends relies on the embedded watsonx.ai models deployed with watsonx orchestrate to perform it's action. To enable the skill, a generative AI task needs to be setup within watsonx orchestrate and it must be exported as a skill to the watsonx skill catalog. The generative AI automation skill works with a predefined prompt using the order notes data as context variable. The notes summarization skill programattically invokes the AI task with order notes as input to respond to the CSR's question.

## Setting up the notes summarization generative AI task

1. Login to watsonx orchestrate.
2. Select `Skill Studio` in the left navigation menu.
3. Choose `Create -> Project`. 
4. In the dialog that opens, select `Import Project` on the left and `browse` to the location of [SterlingOMS_GenerativeAI_Tasks.zip](SterlingOMS_GenerativeAI_Tasks.zip)
5. Complete the steps in wizard to import the project.
6. Once the project is imported, share the project to create a version and publish the version to create a deployment.
7. On the `Skill Studio` main page, choose the `Skills and apps` tab and publish the `summarize_notes` skill to the skills catalog.

For more information refer to the watsonx orchestrate [documentation](https://www.ibm.com/docs/en/watsonx/watson-orchestrate/current?topic=studio-building-projects)

## Configuring the notes summarization skill in conversational skill server

The conversational skills server can interact with skills published on watsonx orchestrate programmatically. The [app-configuration.yaml](src/config/app-configuration.yaml) contains a sub-section for watsonx orchestrate. The skill server requires the following environment variables:

| Environment variable | Description | How to find it's value |
| ---------------------|------------ |----------------------- |
| WXO_TOKEN_API_ENDPOINT | The URL from which the skill server can retrieve a short lived JWT to invoke a skill on orchestrate | https://developer.ibm.com/apis/catalog/watsonorchestrate--custom-assistants/api/API--watsonorchestrate--authenticating-to-watsonx-orchestrate-api#generatingjwttoken |
| WXO_API_ENDPOINT | The watsonx orchestrate API endpoint. This value is excluding the tenant id. | https://www.ibm.com/docs/en/watsonx/watson-orchestrate/current?topic=api-getting-endpoint |
| WXO_TENANT_ID | The watsonx orchestrate tenant ID | The API endpoint in the `About` box is of the `https://api.<hostname>/instances/<tenant_id>`. The tenant ID can be extracted from this URL |
| WXO_API_KEY | The API key to generate the JWT | https://www.ibm.com/docs/en/watsonx/watson-orchestrate/current?topic=api-generating-key |
| WXO_SKILL_SET_ID | The unique ID of the skill set to which the notes summarization skill was published into | https://developer.ibm.com/apis/catalog/watsonorchestrate--custom-assistants/api/API--watsonorchestrate--skills-and-skill-sets#getskillsets |
| OMS_NOTES_SUMMARIZATION_SKILL_ID | The unique Id of the summarize_notes skill | https://developer.ibm.com/apis/catalog/watsonorchestrate--custom-assistants/api/API--watsonorchestrate--skills-and-skill-sets#getskills |
| OMS_NOTES_SUMMARIZATION_SKILL_API_PATH | The API base URL for the summarize notes skill. This value is an output of the getSkill API| https://developer.ibm.com/apis/catalog/watsonorchestrate--custom-assistants/api/API--watsonorchestrate--skills-and-skill-sets#getskills. Example. `prompts/summarize_notes/generation/text`|
