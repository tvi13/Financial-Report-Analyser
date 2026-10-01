import google.generativeai as genai
import os
import sys

key = os.environ.get("GOOGLE_API_KEY")
if not key:
    print("NO KEY")
    sys.exit(1)

genai.configure(api_key=key)
for m in genai.list_models():
    if "generateContent" in m.supported_generation_methods:
        print(m.name)
