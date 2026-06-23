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
COMPANY_ID = int(os.getenv('COMPANY_ID', '1'))  # set in .env

# Agent
agent = Agent(
    name="POS Sell Agent",
    model="gemini-flash-latest",
    instruction="""
You are POS sell operator agent. Parse Spanish voice: "registra una venta de [product] [qty opc] por [amount] [method: efectivo/cash]"
Output JSON: {'product_name':str, 'qty':int=1, 'amount':float, 'method':str='cash'}
Ej: "registra una venta de servicio completo por 50 pesos en efectivo" -> {'product_name':'servicio completo', 'qty':1, 'amount':50.0, 'method':'efectivo'}
    """,
    tools=[google_search]  # for product lookup if needed
)

r = sr.Recognizer()
mic = sr.Microphone()

def get_products(product_name):
    """Search products by name"""
    resp = requests.post(f'{API_BASE}/products', json={'products': [{'action':'search', 'name':product_name, 'companyId':COMPANY_ID}]})
    if resp.ok:
        data = resp.json()
        return data.get('result', [{}])[0].get('products', [])
    return []

def record_sale(intent):
    products = get_products(intent['product_name'])
    if not products:
        return "Producto no encontrado"
    
    product = products[0]  # take first match
    order_data = {
        'orders': [{
            'productId': product['productId'],
            'quantity': intent['qty'],
            'companyId': COMPANY_ID,
            'total': intent['amount']
        }]
    }
    # Record as income/vending
    if intent['method'] == 'efectivo':
        resp = requests.post(f'{API_BASE}/vending', json={'vending': [{'ingreso':intent['amount'], 'action':1}]})
    else:
        resp = requests.post(f'{API_BASE}/income', json={'income': order_data})
    
    if resp.ok:
        return f"Venta registrada: {intent['qty']}x {product.get('name', '?')} por ${intent['amount']}"
    return "Error en venta"

print("Sell Agent listening... Di 'registra una venta...'")
with mic as source:
    r.adjust_for_ambient_noise(source)
    while True:
        try:
            audio = r.listen(source, timeout=1, phrase_time_limit=5)
            text = r.recognize_google(audio, language='es-ES')
            print(f"Heard: {text}")
            
            intent_str = agent.run(text)
            # Parse JSON from agent output
            match = re.search(r'\{.*\}', intent_str, re.DOTALL)
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

