# Conversational search

The conversational search feature is the implementation of RAG (Retrieval Augumented Generation) or Content Grounded Answering within IBM watsonX Orchestrate. It is available in IBM watsonX Orchestrate AI Assistant and relies on Elasticsearch search to help your assistant extract an answer from the highest-ranked query results and return a text response to the user. The search results are provided to an watsonX generative AI model that produces a conversational reply to a user's question.

Elastic Search is the recommended vector database by IBM watsonX Orchestrate and this document outlines how conversational search can be setup using the same. Elastic search instance can either be provisioned on the IBM Cloud or deployed externally. When deployed externally, you must ensure that it's endpoint is accessible from IBM Cloud for IBM watsonX Orchestrate to run queries.

## Prerequisites

1. IBM watsonX Orchestrate (on AWS or on IBM Cloud or installed via Cloud Pack For Data)
2. Elastic Search version 8.12 or higher. This setup requires the use ELSER v2 which is available from version 8.12 and above. The instructions to setup elastic search can be found [here](https://github.com/watson-developer-cloud/assistant-toolkit/blob/master/integrations/extensions/docs/elasticsearch-install-and-setup/ICD_Elasticsearch_install_and_setup.md).

## Procedure

There are two parts to enable conversational search. The first part is to setup or run a document ingestion pipeline that indexes all the documents in Elastic for watsonX Orchestrate to query. The second part is to setup conversational search integration by configuring the details about the Elastic instance on watsonX Assistant Builder.

### 1. Ingest documents into Elastic

There are two primary approaches to ingest documents into Elastic. The high level steps behind both approaches are the same:
1. Parse the documents to be ingested
2. Run the ingestion pipeline with document. The ingestion pipeline should use ELSER v2.
3. Bulkload the output of the ingestion pipeline into the index. 

The first approach leverages FSCrawler. In this approach, FSCrawler processes all the files and folders provided to it via configuration and runs the ingestion pipeline on Elastic. The ingestion pipeline can be configured to do chunking (and overlapping) of the document content which is then provided to ELSER v2 to generate the tokens to index.

The second approach leverages LangChain and the Recursive Character Text Splitting to process the document and break it down into chunks. The chunks are then ingested using an inference pipeline with ELSER v2 and loaded into the index.

#### How to index documents using FSCrawler

The steps to ingest documents via FSCrawler are documented [here](https://github.com/watson-developer-cloud/assistant-toolkit/blob/master/integrations/extensions/docs/elasticsearch-install-and-setup/how_to_index_pdf_and_office_documents_elasticsearch.md)

#### How to index documents using Python

The steps to ingest documents via LangChain is documented [here](https://github.com/watson-developer-cloud/assistant-toolkit/blob/master/integrations/extensions/docs/elasticsearch-install-and-setup/python-document-ingestion/README.md)

### 2. Setup conversational search integration in AI Assistant

The steps to configure conversational search integration with AI Assistant can be found [here](https://cloud.ibm.com/docs/watson-assistant?topic=watson-assistant-search-elasticsearch-add)

## Useful links

- [Conversational search documentation](https://cloud.ibm.com/docs/watson-assistant?topic=watson-assistant-conversational-search)
- [WatsonX Assistant starter-kit for conversational search](https://github.com/watson-developer-cloud/assistant-toolkit/tree/master/integrations/extensions/starter-kits/language-model-conversational-search)
