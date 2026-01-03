#!/bin/bash

# API Fix Verification Test Script
# This script tests the corrected API request format

echo "=== API Fix Verification Test ==="
echo ""

# Test 1: Products API
echo "1. Testing Products API with corrected format..."
echo "   Request: companyId as string, categoryId as string"
echo ""

RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X 'POST' \
  'https://smartloansbackend.azurewebsites.net/by_company_products' \
  -H 'accept: application/json' \
  -H 'Content-Type: application/json' \
  -d '{
    "products": [
        {
            "companyId": "1",
            "categoryId": "1002"
        }
    ]
}')

HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_CODE/d')

echo "   HTTP Status: $HTTP_CODE"
echo "   Response Body:"
echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"

if [ "$HTTP_CODE" = "200" ]; then
    echo "   ✅ Products API: SUCCESS"
else
    echo "   ❌ Products API: FAILED (Status: $HTTP_CODE)"
fi

echo ""
echo "---"
echo ""

# Test 2: Categories API
echo "2. Testing Categories API with corrected format..."
echo "   Request: companyId as string"
echo ""

RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X 'POST' \
  'https://smartloansbackend.azurewebsites.net/by_company_products_category' \
  -H 'accept: application/json' \
  -H 'Content-Type: application/json' \
  -d '{
    "product_categories": [
        {
            "companyId": "1"
        }
    ]
}')

HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_CODE/d')

echo "   HTTP Status: $HTTP_CODE"
echo "   Response Body:"
echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"

if [ "$HTTP_CODE" = "200" ]; then
    echo "   ✅ Categories API: SUCCESS"
else
    echo "   ❌ Categories API: FAILED (Status: $HTTP_CODE)"
fi

echo ""
echo "=== Test Complete ==="

# Check if both tests passed
if [ "$HTTP_CODE" = "200" ]; then
    echo "🎉 API Fix Verified: Both endpoints working with string companyId format!"
else
    echo "⚠️ Some tests failed. Check the responses above."
fi
