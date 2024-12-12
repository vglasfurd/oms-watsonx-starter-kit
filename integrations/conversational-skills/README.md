# Call-Center Conversational Skills

A conversational skill server implementation for IBM Sterling Order Management Call-Center. This server can be registered as as skills provider with IBM watsonx Orchestrate AI Assistant to create actions based on skills. To know more about conversational skills, please refer the following links:

- [Skill based actions](https://cloud.ibm.com/docs/watson-assistant?topic=watson-assistant-skill-based-actions)
- [Conversational skills](https://github.com/watson-developer-cloud/assistant-toolkit/tree/master/conversational-skills)
- [Conversational skill provider API reference](https://cloud.ibm.com/apidocs/assistant-v2#createprovider)

## Overview

![overview](/integrations/conversational-skills/docs/image.png)

The above diagram provides an high level overview of conversational skill based actions in IBM watsonx Orchestrate. Conversational skill based actions are backed by a skill provider, a server that implements the [endpoints](https://github.com/watson-developer-cloud/assistant-toolkit/blob/master/conversational-skills/procode-endpoints.md) prescribed by IBM watsonx Orchestrate. The assistant's turn in the conversation for a specific skill based action is controlled by the skill server. The skill provider service must be accessible from the assistant.

There are two phases to the conversational skill based actions, a setup phase and a runtime phase:

### Setup

Setting up conversational skill based actions involves two steps: registering the skill provider and configuring actions based on the skills implemented by the skill provider

#### Registration
Each Watson Assistant instance can have one skill provider registered against it. The registration is done manually by invoking [skill provider API](https://github.com/watson-developer-cloud/assistant-toolkit/blob/master/conversational-skills/README.md#Register-a-Conversational-Skill-Provider)

#### Creating actions based on the skills
Once a skill provider is registered, a new `Skill backed action` type appears on the assistant when creating a new action. When this option is chosen, the assistant invokes the `GET /providers/:providerId/conversational_skills` endpoint on the skill provider to list the skills provided by the server. An action is created against a skill by specifying a list of phrases that users can say when they intend to use this action.

### Runtime

During a conversation, the assistant will detect the user's intent to use a specific skill configured on it. At this time, the assistant invokes the `POST /providers/:providerId/ :skillId/orchestrate` with the specific skill Id (a unique identifier that represents a skill under a provider) along with the information relevant to the skill that it has gathered so far. The information gathered by the assistant is referred to as **slots**. When a skill is first identified, the assistant invokes the skill service asking for the slots to fill for the skill. Based on the slots in the response, the assistant will try to gather the information from the conversation history (or user prompt) and then proceed to ask user questions to fill those which are not filled. The assistant notifies the skill server about changes to slot's state allowing the server to react to slot changes and direct the conversation accordingly till the skill is complete or cancelled.

## Skills implemented
This implementation provides the following conversational skills:
- Get details about an order based on the order number
- Cancel an order
- Apply coupon to an order
- Apply or cancel holds on an order
- Summarize notes on an order
- Provide appeasement discount to a customer
- Search for orders based on a customer profile
  - Find the most recent payment method for a customer
  - Find the most recent transaction of a customer
  - Find the most recent order for a customer
  - Find orders based on the item id or description

## Developing

The server is built using [NestJS](http://nestjs.com). 

### Prerequisites

- Node 18-LTS
- Install [yarn](https://classic.yarnpkg.com/en/docs/install)

### Installation

1. Run `yarn` to install the node modules required.
2. Create the `.env` file from the `env.template` file provided in the repo. Please refer to the template for description and usage of each environment variable. The `.env` file is used to register the skill provider and to configure the skill server if it is running locally.

### Registering the skill provider with IBM watsonx Orchestrate

The skill provider endpoint must be registered with the IBM watsonx Orchestrate service instance. To do this, run `yarn skill-provider:register` to register the skill provider with your service instance of IBM watsonx Orchestrate.

**Note:**  
- If you are updating the skill-provider registration, run `yarn skill-provider:update`.  
- To list the skill provider registration, run `yarn skill-provider:list` to verify the assistant instance is pointing to the correct skill provider server.

### Running the skill server

The skill server should be accessible from your deployment of IBM watsonx Orchestrate. For instance, if you are using IBM watsonx Orchestrate on IBM Cloud, the skill server host must be reachable from IBM Cloud.

There are two approaches documented here for running the skill server in a way that's accessible from IBM Cloud. These steps are general and can be used regardless of where your IBM watsonx Orchestrate is deployed.

#### As a NodeJS process on the current host

This approach runs the skill server as a NodeJS process on a host that is accessible from WatsonX assistant. This approach is fairly straight forward and is typical of any development environment setup. The `SKILL_PROVIDER_DOMAIN` environment variable should use the hostname or IP of the network interface of the host that is accessible from WatsonX assistant.

Run the server using either of the following commands:  
**Development mode** `yarn start:dev`  
**Production mode** `yarn start:prod`  
**Debug mode** `yarn start:debug` or run `yarn start:dev` from a Javascript Debug Terminal

#### As a kubernetes service

A Helm chart is provided in the repository to deploy the skill server as a kubernetes service. In this deployment, the watsonx assistant interacts with the skill server via the host name of the public ingress. The `SKILL_PROVIDER_DOMAIN` environment variable for registering the skill provider should be set to the hostname of the public ingress. Refer to the [readme](/docs/setup_with_kubernetes.md) for more setting up a conversational skill provider deployment on Kubernetes or RHOCP. 

## Build

Run `yarn build` to compile and build the NodeJS application. If you wish to package it as a docker image, run `./docker-build.sh`. The docker image uses `node:18.20-alpine3.20` as the base image. The generated docker image name is `cc-conversational-skills` and the tag is generated in the format `vyyyyMMdd_HHmmss`. Set the `IMAGE_TAG` environment variable before running `./docker-build.sh` to change the tag of the image.

## Setting up actions in an assistant

The file [call-center-assistant.zip](/docs/call-center-assistant.zip) contains the assistant configuration which can be imported as is into an instance of Watsonx assistant. Refer to the [documentation](https://cloud.ibm.com/docs/watson-assistant?topic=watson-assistant-upload-download-actions) for more details.

This step requires the skill provider to be registered as per these [steps](#registering-the-skill-provider-with-watsonx-assistant). The skill provider ID in this example is `Sterling_OMS_CallCenter`
