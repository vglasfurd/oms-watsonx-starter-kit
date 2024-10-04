# WatsonX starter kit

This repository contains reference implementations for integration patterns between IBM watsonx Orchestrate and Sterling Order Management System. This repository can be used by retailers to build, deploy and maintain more effective AI solutions for their businesses. The implementations are provided as-is and can be extended or modified to fit the business requirements.

Official product documentation:
- [WatsonX Orchestrate](https://www.ibm.com/docs/en/watsonx/watson-orchestrate/current)

## Getting started

The [integrations section](/integrations) in this repo contains reference implementations and assets that can be used with IBM watsonx Orchestrate.

The code provided under any integration is a starting point to be used as-is. It's purpose is to help understand and demostrate the integration.

## Integrations

There are two integration patterns provided in this repository:

### Conversational Search
This is the OOB implementation of the RAG (Retrieval Augumented Generation) or Content Grounded Answering within IBM watsonx Orchestrate AI Assistant. The feature is used in conjunction with Elasticsearch search integration to help your assistant extract an answer from the highest-ranked query results and return a text response to the user. The search results are provided to an IBM watsonx generative AI model that produces a conversational reply to a user's question.

Refer to the [readme](/integrations/conversational-search) for more details.

### Conversational Skills
Skill-based actions, also known as conversational skill actions, allow assistants to connect and start tasks from third party applications and services. These actions require a provider that connects to IBM watsonx Orchestrate AI Assistant and provides access to the external application's or service's features. The skill based actions provider is a server implementing the REST endpoints specified by WatsonX assistant. The assistant invokes the APIs on this server to allow the skill provider to process the user's conversation for a specific skill. 

Refer to the [readme](/integrations//conversational-skills) for more details. 
