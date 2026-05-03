#!/usr/bin/env python3
"""
Voice Sell Agent using Google ADK + SpeechRecognition.
Listens for Spanish voice commands like: "registra una venta de servicio completo por 50 pesos en efectivo"

Workflow:
1. STT (mic) -> text
2. ADK Agent parses intent (product, qty=1, amount, method=cash)
3. Call backend APIs: POST /products (search), POST /orders (cart), POST /income or /vending (record)
"""
import os
import speech_recognition as sr
import requests
import re
from dotenv import load_dotenv
from google.adk import Agent
from google.adk.tools import google_search  # optional

load_dotenv()

# Backend API
API_BASE = "https://smartloansbackend.azurewebsites.net"
COMPANY_ID = int(os.getenv(&#x27;COMPANY_ID&#x27;, &#x27;1&#x27;))  # set in .env

# Agent
agent = Agent(
    name="POS Sell Agent",
    model="gemini-flash-latest",
    instruction="""
You are POS sell operator agent. Parse Spanish voice: "registra una venta de [product] [qty opc] por [amount] [method: efectivo/cash]"
Output JSON: {&#x27;product_name&#x27;:str, &#x27;qty&#x27;:int=1, &#x27;amount&#x27;:float, &#x27;method&#x27;:str=&#x27;cash&#x27;}
Ej: "registra una venta de servicio completo por 50 pesos en efectivo" -> {&#x27;product_name&#x27;:&#x27;servicio completo&#x27;, &#x27;qty&#x27;:1, &#x27;amount&#x27;:50.0, &#x27;method&#x27;:&#x27;efectivo&#x27;}
    """,
    tools=[google_search]  # for product lookup if needed
)

r = sr.Recognizer()
mic = sr.Microphone()

def get_products(product_name):
    """Search products by name"""
    resp = requests.post(f&#x27;{API_BASE}/products&#x27;, json={&#x27;products&#x27;: [{&#x27;action&#x27;:&#x27;search&#x27;, &#x27;name&#x27;:product_name, &#x27;companyId&#x27;:COMPANY_ID}]})
    if resp.ok:
        data = resp.json()
        return data.get(&#x27;result&#x27;, [{}])[0].get(&#x27;products&#x27;, [])
    return []

def record_sale(intent):
    products = get_products(intent[&#x27;product_name&#x27;])
    if not products:
        return "Producto no encontrado"
    
    product = products[0]  # take first match
    order_data = {
        &#x27;orders&#x27;: [{
            &#x27;productId&#x27;: product[&#x27;productId&#x27;],
            &#x27;quantity&#x27;: intent[&#x27;qty&#x27;],
            &#x27;companyId&#x27;: COMPANY_ID,
            &#x27;total&#x27;: intent[&#x27;amount&#x27;]
        }]
    }
    # Record as income/vending
    if intent[&#x27;method&#x27;] == &#x27;efectivo&#x27;:
        resp = requests.post(f&#x27;{API_BASE}/vending&#x27;, json={&#x27;vending&#x27;: [{&#x27;ingreso&#x27;:intent[&#x27;amount&#x27;], &#x27;action&#x27;:1}]})
    else:
        resp = requests.post(f&#x27;{API_BASE}/income&#x27;, json={&#x27;income&#x27;: order_data})
    
    if resp.ok:
        return f"Venta registrada: {intent[&#x27;qty&#x27;]}x {product.get(&#x27;name&#x27;, &#x27;?&#x27;)} por ${intent[&#x27;amount&#x27;]}"
    return "Error en venta"

print("Sell Agent listening... Di &#x27;registra una venta...&#x27;")
with mic as source:
    r.adjust_for_ambient_noise(source)
    while True:
        try:
            audio = r.listen(source, timeout=1, phrase_time_limit=5)
            text = r.recognize_google(audio, language=&#x27;es-ES&#x27;)
            print(f"Heard: {text}")
            
            intent_str = agent.run(text)
            # Parse JSON from agent output
            match = re.search(r&#x27;\{.*\}&#x27;, intent_str, re.DOTALL)
            if match:
                intent = eval(match.group())  # dangerous, improve with json.loads
                result = record_sale(intent)
                print(result)
            else:
                print("Intent no parseado")
        except sr.WaitTimeoutError:
            pass
        except Exception as e:
            print(f"Error: {e}")

