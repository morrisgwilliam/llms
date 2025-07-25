from langchain_aws import BedrockEmbeddings

def get_embedding_function():
    embeddings = BedrockEmbeddings(
        credentials_profile_name="default",
        region_name="us-east-1",
        model_id="amazon.titan-embed-text-v1",
    )

    return embeddings