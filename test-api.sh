#!/bin/bash

echo "=== Testing Knock API ==="
echo ""

# Test 1: Health Check
echo "1. Health Check"
curl -s http://localhost:3001/health | jq
echo ""

# Test 2: Register User
echo "2. Register User"
REGISTER_RESPONSE=$(curl -s -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"TestUser","age":25}')
echo $REGISTER_RESPONSE | jq
TOKEN=$(echo $REGISTER_RESPONSE | jq -r '.data.token')
echo "Token: $TOKEN"
echo ""

# Test 3: Get Roommates
echo "3. Get Roommates"
curl -s http://localhost:3001/api/v1/roommate \
  -H "Authorization: Bearer $TOKEN" | jq
echo ""

# Test 4: Get Knock Status
echo "4. Get Knock Status"
curl -s http://localhost:3001/api/v1/knock/status \
  -H "Authorization: Bearer $TOKEN" | jq
echo ""

# Test 5: Execute Knock
echo "5. Execute Knock"
curl -s -X POST http://localhost:3001/api/v1/knock/execute \
  -H "Authorization: Bearer $TOKEN" | jq
echo ""

echo "=== API Tests Complete ==="
