#System Requiremements

Ollama https://ollama.com/download
AWS CLI V2
AWS Profile Permissions on AWS Bedrock Models (used form vector db ingestion and retrieval)
Python 3.13.3

Make sure to run the ollama server

```bash
ollama run mistral
ollama serve
```

Create and Activate Virtual environment
```bash
python3 -m venv venv
source venv/bin/activate
```

Install dependencies

```bash
pip3 install -r requirements.txt
```

# Run a query for a ruleset

```bash
python3 query_data.py "How much total money does a player start with in Monopoly? (Answer with the number only)"
```