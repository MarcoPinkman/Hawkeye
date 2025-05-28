import os
from openai import OpenAI
import json,base64

with open("messages.json", "r") as f:
    messages = json.loads(f.read())

response_schema = {
            "schema": {
                "type": "object",
                "properties": {
                    "events": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "event_code": {"type": "string"},
                                "detected": {"type": "boolean"},
                                "explanation": {"type": "string"},
                            },
                            "required": ["event_code", "detected", "explanation"],
                        },
                    }
                },
                "required": ["events"],
            }
        }

client = OpenAI(
    # 若没有配置环境变量，请用百炼API Key将下行替换为：api_key="sk-xxx",
    api_key="sk-8b81f0c91eb3497388d5fe85c2df9abb",
    base_url="https://dashscope.aliyuncs.com/compatible-mode/v1",
)
completion = client.chat.completions.create(
    model="qwen-vl-max",  # 此处以qwen-vl-max-latest为例，可按需更换模型名称。模型列表：https://help.aliyun.com/model-studio/getting-started/model
    messages=messages,
    # response_format={"type": "json_schema", "json_schema": json_schema},
    response_format = {"type":"json_object"}
)
print(completion.choices[0].message.content)