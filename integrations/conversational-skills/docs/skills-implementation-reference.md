# Conversational skills implementation patterns

## Skill patterns

The following patterns are demonstrated in the sample skills provided in this repository:

### Order modification pattern
The order modification pattern requires the order context to be established.  The order context is established by  
  - The ui when the csr  opens an order. 
  - When the csr looks up an order either by searching for an order number or by the user profile
  - By the skill itself by asking for order no and enterprise code
The skills in this pattern will check if the modification is allowed before gathering all the information and confirmation from the csr to perform the action

At the code level, the skills with this pattern extend the look up order skill to inherit the order look up capability.

**User experience:**
  - CSRs can continue to use the UI as usual. They can seamlessly switch to the chat and issue modification requests
  - Perform modifications via chat by answering a few prompts
  - The modification actions have few inputs to be gathered.
  - Confirmation is always required before proceeding.
  - The order is refreshed on the ui as well to reflect the updation

### Order lookup pattern

There are two patterns we have implemented in the sample. 
  - The simple lookup based on order no and enterprise code
  - Search  for  orders. There are variations of this pattern for specific intents.
    - Most recent orde
    - Most recent transaction
    - Most recent payment method  
    The assistant narrows down the intent and the appropriate skill is invoked to produce a specific output.  
    If the skill returns a single order, it establishes the order context. When the number of results are more, a table gets rendered in the UI and the csr needs to click on a specific order to establish context. If natural language needs to be used to establish context, it can be done via a skill (not in the sample, but it's possible to implement)
  
**User experience:**
 - CSRs can use these skills to establish the order context via chat
 - The search results are rendered as a table inline in chat if there is more than one
 - Currently the output template for the assistant's response for an order is fixed. (However, we could run the order through an LLM too for summarization)

### Customer appeasement pattern
This is a complex flow with the following steps:
- ask for user information like an email address or phone number
- Find previous appeasement discounts provided
- If an appeasement can be provided, the CSR needs to pick an order for the customer to which to apply the appeasement to
- Once the order is retrieved, the CSR provides the right coupon code to apply to the order

Since this is a complex flow with a lot of turns in the conversation, we rely on using `actions from scratch` (no-code actions) to orchestrate the conversation by calling specific skill-based actions (pro-code). This way we can build small purposeful skill-based actions that gather a few inputs and hide away all the validations, slot repairs etc to provide an output that can be used by `no-code` actions to build the conversation.

A skill-based action upon completion can return additional metadata which is made available as an action variable in the no-code action. This metadata is used to build the conversation flow in the no-code action. Please refer to `markSkillComplete` method in `AbstractSkillProviderService` for more details.

### Summarization pattern
Here we have leveraged wxo embedded watsonx ai to summarize unstructured data like order notes. This skill also requires the order context. The notes data from the order is passed as context to a prompt in wxo. In this skill pattern, we can see how specific wxo skills can be invoked programmatically.

### Key takeaways across all pattern:
  1. Slot prompt and description is used by the slot filling llm in the assistant. This is crucial and allows for prompt tuning of the assistant during slot filling
  2. Assistant prioritizes slot filling over digression. The no code action has a way to letting the assistant know that a digression is expected in a step but this does not exist in skill based slots
  3. Entity based slots allow specific information gathering and validation is handled by assistant
  4. Skill implementations should perform slot validation at individual slot level but always assess the overall state of the information gathered once all slots are processed
  5. All skill-based actions should leverage the capability of passing additional metadata upon completion. This information helps design the conversation using no-code actions.


## Look up order skill

This is a standalone skill and is the starting point for other conversational skills that require an order to be available in context. The skill assumes `DocumentType` as`0001` but it can be made into another slot to fill. The skill has two slots to fill:

|Slot Name| Type | Description | Validation |
| ------- | ---- | ----------- | ---------- |
| EnterpriseCode | Entity | A dropdown with all the organizations that the CSR has access to. | The validation is performed by the assistant with additional validation in the skill |
| OrderNo | String | The order number to find. | Validation is done using regular expression in the conversational skill server. The assistant fills the slots based on the description provided about the slot but it does not validate using a regular expression (which is possible in no-code action) |

Once the slots are filled, the skill invokes `getCompleteOrderDetails` API to fetch the order details. The assistant's response is constructed using string literals that are interpolated using the order.

**Skill response metdata** :
```JSON
{
  "order": The order object 
}
```

### OMS APIs invoked:

- `getOrganizationList` 
 **API Input:** 
 ```JSON
 { 
   Organization: { 
     DataAccessFilter: {
       UserId: $userId
    }, 
    OrgRoleList: { 
      OrgRole: [{ RoleKey: 'ENTERPRISE' }] 
    }
  }
}
``` 
**Output Template:** [common.json](/src/assets/oms/api-templates/common.json).`getOrganizationList`

 - `getCompleteOrderDetails`
 **API Input:** 
 ```JSON
{ 
  DocumentType: '0001',
  OrderNo: $orderNo,
  EnterpriseCode: $enterpriseCode
}
``` 
**Output Template:** [lookup-order.json](/src/assets/oms/api-templates/lookup-order.json).`default`

## Cancel order skill

This skill is an extension of the look up order skill. It allows the look up order skill to load the current order in context and then verifies if the order can be cancelled or not. If the order can be cancelled, it asks the user for confirmation and invokes the `cancelOrder` API.

|Slot Name| Type | Description | Validation |
| ------- | ---- | ----------- | ---------- |
| ConfirmCancellation | Confirmation | Asks the user if they want to proceed with the cancellation. This slot is shown only when `ModificationType` `CANCEL` is allowed on the order | none |

**Skill response metdata** :
```JSON
{ 
  orderCancelled: false | true , 
  modificationAllowed: false | true,
  userCancelled: true | false,
  failed?: true, 
  message?: "error message"
}
```

### OMS APIs invoked:

- `getCompleteOrderDetails`
 **API Input:** 
 ```JSON
{ 
  DocumentType: '0001',
  OrderNo: $orderNo,
  EnterpriseCode: $enterpriseCode,
  Modifications: {
    Modification: [{
      ModificationType: 'CANCEL'
    }]
  }
}
``` 
**Output Template:** [lookup-order.json](/src/assets/oms/api-templates/lookup-order.json).`default`

- `cancelOrder`
**API Input:**

```JSON
{
  OrderHeaderKey: $orderHeaderKey,
}
```
**Output Template:** API default template

## Apply coupon skill

This skill is an extension of the look up order skill. It allows the look up skill to load the current order in context and then gathers the coupon code to be applied to the order. Once all the slots are gathered, it asks the user to confirm if all the data is correct before calling `changeOrder` API to apply the coupon.

This skill is used as a sub-action for customer appeasement flow. The customer appeasement flow sends an additional session variable `applyCouponAsAppeasement` to indicate that coupon is being applied as an appeasement discount.

|Slot Name| Type | Description | Validation |
| ------- | ---- | ----------- | ---------- |
| PromotionId | String | Gathers the promotion Id or coupon code to apply | The value is validated using `validateCoupon` API |

**Skill response metdata** :
```JSON
{ 
  promotionApplied: false | true , 
  modificationAllowed: false | true ,
  userCancelled: true | false,
  failed?: true, 
  message?: "error message"
}
```

### OMS APIs invoked:

- `getCompleteOrderDetails`
 **API Input:** 
 ```JSON
{ 
  DocumentType: '0001',
  OrderNo: $OrderNo,
  EnterpriseCode: $EnterpriseCode,
  Modifications: {
    Modification: [{
      ModificationType: 'PRICE'
    }, {
      ModificationType: 'CHANGE_PROMOTION'
    }]
  }
}
``` 
**Output Template:** [lookup-order.json](/src/assets/oms/api-templates/lookup-order.json).`default`

- `validateCoupon`  
**API Input:**

```JSON
{
  CouponID: $promotionId,
  Currency: $order.PriceInfo.Currency,
  OrganizationCode: $order.EnterpriseCode,
}
```
**Output Template:** API default template

- `changeOrder`  
**API Input:**
```JSON
{
  OrderHeaderKey: $OrderHeaderKey,
  Promotions: { 
    Promotion: [{ 
      PromotionId: $PromotionId 
    }] 
  },
  Note: Used when applying coupon as an appeasement
}
```
**Output Template:** [apply-coupon.json](/src/assets/oms/api-templates/apply-coupon.json).`default`

## Summarize notes on an order

This skill is an extension of the look up order skill. It uses the order identified and answers questions about the order based on the notes associated with the order. This skill demonstrates how unstructured data present in OMS can be made available to an LLM to perform tasks like summarization or QandA.

|Slot Name| Type | Description | Validation |
| ------- | ---- | ----------- | ---------- |
| NotesRelatedQuestion | String | The user's question about the notes associated with the order| none |

**Skill response metdata** :
```JSON
{ 
  actionPerformed: false | true , 
  noNotes: false | true ,
  answer: "answer to user's question about the notes",
  numNotes: number
  failed?: true, 
  message?: "error message"
}
```

### OMS APIs invoked:

- `getCompleteOrderDetails`
 **API Input:** 
 ```JSON
{ 
  DocumentType: '0001',
  OrderNo: $OrderNo,
  EnterpriseCode: $EnterpriseCode
}
``` 
**Output Template:** [lookup-order.json](/src/assets/oms/api-templates/lookup-order.json).`notesSummarization`

For more details on notes summarization, refer to [this](/docs/notes-summarization-skill.md) document.

## Apply or cancel holds on an order

This skill is an extension of the look up order skill. It applies or cancels holds on an order. The skill is based along the same lines as order cancel or apply coupon.

|Slot Name| Type | Description | Validation |
| ------- | ---- | ----------- | ---------- |
| ApplyOrCancelHold | Entity | Check if the user wants to apply or cancel a hold | Entity based validation performed by the assistant |
| HoldReason | String | The reason why a hold is being applied on the order | None |
| HoldType | Entity | A list of HoldType objects for the CSR to choose from. The list is obtained using `getHoldTypeList` API | Entity based validation |

**Skill response metdata** :
```JSON
{ 
  actionPerformed: false | true , 
  modificationAllowed: false | true ,
  failed?: true, 
  message?: "error message"
}
```

### OMS APIs invoked:

- `getCompleteOrderDetails`
 **API Input:** 
 ```JSON
{ 
  DocumentType: '0001',
  OrderNo: $OrderNo,
  EnterpriseCode: $EnterpriseCode,
  Modifications: {
    Modification: [{
      ModificationType: 'HOLD'
    }]
  }
}
``` 
**Output Template:** [lookup-order.json](/src/assets/oms/api-templates/lookup-order.json).`default`

- `getHoldTypeList`  
**API input:**
```JSON
{
  CallingOrganizationCode: $order.EnterpriseCode,
  DisplayLocalizedFieldInLocale: 'en_US_EST',
  DocumentType: $order.DocumentType,
  HoldLevel: 'ORDER',
}
```
**Output Template:** Default API template

- `changeOrder`  
**API Input:**
```JSON
{
  CallingOrganizationCode: $order.EnterpriseCode,
  Action: 'MODIFY',
  OrderHeaderKey: $order.OrderHeaderKey,
  OrderHoldTypes: {
    OrderHoldType: [
      {
        HoldLevel: 'ORDER',
        HoldType: $HoldType,
        Status: $Status,
        ReasonText: $HoldReason,
      },
    ],
  },
}
```
`$Status` is set to `1100` for applying hold and `1300` for removing a hold.

## Search for orders based on a customer profile

This skill helps find orders based on a customer profile. There are multiple variations of this skill each varying with the type of data returned.

- Find the most recent payment method for a customer
- Find the most recent transaction of a customer
- Find the most recent order for a customer

The skill uses three slots:
|Slot Name| Type | Description | Validation |
| ------- | ---- | ----------- | ---------- |
| CustomerProfileCriteria | String | Gathers the customer information to search by. | The LLM does validation based on the prompt and normalizes the value to email address or phone number. We do an additional regex based validation |
| NumberOfOrders | String | The number of orders to retrieve | LLM based validation |
| IncludeDraftOrders | Confirmation | Checks if draft orders should be included or not | LLM validation |

The skill invokes the `getOrderList` API to fetch orders. If the initial criteria does not return orders, the skill checks if the user wants to include draft orders if they have not already done so. The output of the skill varies based on the variation in play.

**Skill response metdata** :
```JSON
{
  searchResponse: The actual API response,
  // for variations like most recent order or transaction or payment method where there is only order,
  order: The single order retrieved
}
```

### OMS APIs invoked:

- `getOrderList`
 **API Input:** 
 ```JSON
{
  DisplayLocalizedFieldInLocale: 'en_US_EST',
  DraftOrderFlag: $IncludeDraftOrders,
  MaximumRecords: 500,
  ComplexQuery: {
    And: {
      Exp: [{ Name: $SearchField, QryType: 'EQ', Value: $CustomerProfileCriteria }],
    },
  },
  OrderBy: {
    Attribute: {
      Name: 'OrderDate',
      Desc: true,
    },
  },
}
``` 
`$SearchField` is either `CustomerEMailID` or `CustomerPhoneNo` based on the type of criteria.

**Output Template:** 

- Search orders base skill and most recent order skill: [search-orders.json](/src/assets/oms/api-templates/search-orders.json).`default`
- Most recent payment method skill: [most-recent-payment-method.json](/src/assets/oms/api-templates/most-recent-payment-method.json).`default`
- Most recent transaction skill: [most-recent-transaction.json](/src/assets/oms/api-templates/most-recent-transaction.json).`default`

For most recent transaction skill, we additionally invoke `getDocumentTypeList` API to fetch the document type of the transaction.

## Search orders based on customer profile and item details

This skill is an extension of the search orders skill which takes an additional filter of item details. The skill searches based on item id or item description.

|Slot Name| Type | Description | Validation |
| ------- | ---- | ----------- | ---------- |
| ItemDescription | String | Gathers the item details. | We do a regex based validation to decide if the search is ItemID or ItemDesc |

**Skill response metdata** :
```JSON
{
  searchResponse: The actual API response
}
```

### OMS APIs invoked:

- `getOrderList`
 **API Input:** 
 ```JSON
{
  ComplexQuery: {
    And: {
      Exp: { Name: $SearchField, QryType: 'EQ', Value: $CustomerProfileCriteria },
    },
  },
  DocumentType: '0001',
  DraftOrderFlag: this.includeDraftOrders(),
  OrderLine: {
    ComplexQuery: {
      And: {
        Or: {
          Exp: [
            {
              Name: 'ItemDesc',
              QryType: 'LIKE',
              Value: `${itemDesc}`,
            },
            {
              Name: 'ItemID',
              QryType: 'LIKE',
              Value: `${itemDesc}`,
            },
          ],
        },
      },
    },
  },
  ReadFromHistory: 'N',
}
``` 
`$SearchField` is either `CustomerEMailID` or `CustomerPhoneNo` based on the type of criteria.

**Output template**: [search-orders](/src/assets/oms/api-templates/search-orders.json).`default`

## Find appeasements skill

This skill finds out how many appeasement discounts were provided to a customer in the last 6 months.


|Slot Name| Type | Description | Validation |
| ------- | ---- | ----------- | ---------- |
| CustomerProfileCriteria | String | Gathers the customer information to search by. | The LLM does validation based on the prompt and normalizes the value to email address or phone number. We do an additional regex based validation |

**Skill response metdata** :
```JSON
{
 previousAppeasementsCount: number,
 previousAppeasements: The orders which had appeasements in it,
 failed: true | false,
 message: error message
}
```

### OMS APIs invoked:

- `getOrderList`
 **API Input:** 
 ```JSON
{
  ComplexQuery: {
    And: {
      Exp: { Name: $SearchField, QryType: 'EQ', Value: $CustomerProfileCriteria },
    },
  },
  DocumentType: '0001',
  DraftOrderFlag: 'N',
  FromOrderDate: '',
  ToOrderDate: '',
  OrderDateQryType: 'BETWEEN',
  ReadFromHistory: 'N',
}
``` 

**Output template:** [appease-customer.json](/src/assets/oms/api-templates/appease-customer.json).`default`

## Recommend appeasement skill

This skill is an extension of find appeasements skill in which it provides a recommendation if an appeasement can be given or not.

**Skill response metdata** :
```JSON
{
 recommendation: 'approve | reject',
 failed: true | false,
 message: error message
}
```