# Voice Sell Agent TODO

## Plan Steps:
1. [ ] Create useSpeechAgent hook with microsoft-cognitiveservices-speech-sdk for STT (speech to text), TTS (text to speech).
2. [ ] Implement intent parser: parse voice "registra venta [product name] [qty] [pay cash/method amount]".
3. [ ] Integrate product matching (fuzzy search from productsApi).
4. [ ] Chain workflow: getProductsByCompany -> addToCart -> postCashRegister or postIncome -> record order.
5. [ ] Update Sells.tsx with mic button, agent display, status feedback.
6. [ ] Add to App.tsx providers if needed.
7. [ ] Test with "registra una venta de servicio completo".

1. [x] Update requirements.txt with Python deps (google-adk, speechrecognition etc.)\n2. [x] Setup venv_agent and pip install\nProgress: Python env ready.\nNext: Create agent.py


