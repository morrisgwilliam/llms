from query_data import queryrag
from langchain_ollama import ChatOllama

EVAL_PROMPT = """"
Expected Response: {expected_response}
Actual Response: {actual_response}
---
(Answer with 'true' or 'false') Does the actual response match the expected response?
"""

def test_monopoly_rules():
    assert query_and_validate(
        question="How much total money does a player start with in Monopoly? (Answer with the number only)",
        expected_resopnse="$1500"
    )

def test_ticket_to_ride_rules():
    assert query_and_validate(
        question="How many points does the longest continuous train get in Ticket to Ride? (Answer with the number only)",
        expected_response="10 points",
    )

def query_and_validate(question: str, expected_response: str):
    response_text = queryrag(question)
    prompt = EVAL_PROMPT.format(
        expected_response=expected_response,
        actual_response=response_text
    )
    model = ChatOllama(model="mistral")
    evaluation_result_str = model.invoke(prompt)
    evaluation_result_str_cleaned = evaluation_result_str.strip().lower()

    print(prompt)

    if "true" in evaluation_result_str_cleaned:
        print("\033[92m" + f"Response: {evaluation_result_str_cleaned}" + "\033[0m")
        return True
    elif "false" in evaluation_result_str_cleaned:
        print("\033[91m" + f"Response: {evaluation_result_str_cleaned}" + "\033[0m")
        return False
    else:
        raise ValueError(
            f"Unexpected evaluation result: {evaluation_result_str_cleaned}. Expected 'true' or 'false'."
        )