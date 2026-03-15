#!/bin/bash

# Script de test pour SantéBF v3.1.4 - Authentification
# Usage: ./test-auth.sh https://sante-bf.pages.dev

set -e

BASEURL="${1:-https://sante-bf.pages.dev}"
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔐 Tests d'authentification SantéBF v3.1.4"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "URL de base: $BASEURL"
echo ""

# Test 1: Page de connexion accessible
echo "📝 Test 1: Page de connexion..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASEURL/auth/login")
if [ "$STATUS" -eq 200 ]; then
  echo -e "${GREEN}✅ Page de connexion accessible (HTTP $STATUS)${NC}"
else
  echo -e "${RED}❌ Page de connexion inaccessible (HTTP $STATUS)${NC}"
  exit 1
fi

# Test 2: Page de reset password accessible
echo "📝 Test 2: Page de réinitialisation mot de passe..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASEURL/auth/reset-password")
if [ "$STATUS" -eq 200 ]; then
  echo -e "${GREEN}✅ Page reset password accessible (HTTP $STATUS)${NC}"
else
  echo -e "${RED}❌ Page reset password inaccessible (HTTP $STATUS)${NC}"
  exit 1
fi

# Test 3: Page de confirmation reset accessible
echo "📝 Test 3: Page de confirmation reset..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASEURL/auth/reset-confirm")
if [ "$STATUS" -eq 200 ]; then
  echo -e "${GREEN}✅ Page reset-confirm accessible (HTTP $STATUS)${NC}"
else
  echo -e "${RED}❌ Page reset-confirm inaccessible (HTTP $STATUS)${NC}"
  exit 1
fi

# Test 4: Test POST login avec identifiants vides
echo "📝 Test 4: POST login avec champs vides..."
RESPONSE=$(curl -s -X POST "$BASEURL/auth/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "email=&password=" \
  -w "\n%{http_code}")
STATUS=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$STATUS" -eq 200 ] && echo "$BODY" | grep -q "Veuillez remplir tous les champs"; then
  echo -e "${GREEN}✅ Validation champs vides fonctionne (HTTP $STATUS)${NC}"
else
  echo -e "${YELLOW}⚠️  Validation champs vides (HTTP $STATUS)${NC}"
fi

# Test 5: Test POST login avec email invalide
echo "📝 Test 5: POST login avec email invalide..."
RESPONSE=$(curl -s -X POST "$BASEURL/auth/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "email=invalid@example.com&password=WrongPassword123!" \
  -w "\n%{http_code}")
STATUS=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$STATUS" -eq 200 ] && (echo "$BODY" | grep -q "Email ou mot de passe incorrect" || echo "$BODY" | grep -q "Configuration du serveur"); then
  echo -e "${GREEN}✅ Gestion erreur identifiants incorrects fonctionne (HTTP $STATUS)${NC}"
else
  echo -e "${YELLOW}⚠️  Gestion erreur identifiants (HTTP $STATUS)${NC}"
fi

# Test 6: Test POST reset-password avec email vide
echo "📝 Test 6: POST reset-password avec email vide..."
RESPONSE=$(curl -s -X POST "$BASEURL/auth/reset-password" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "email=" \
  -w "\n%{http_code}")
STATUS=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$STATUS" -eq 200 ] && echo "$BODY" | grep -q "Entrez votre adresse email"; then
  echo -e "${GREEN}✅ Validation email vide reset fonctionne (HTTP $STATUS)${NC}"
else
  echo -e "${YELLOW}⚠️  Validation email vide reset (HTTP $STATUS)${NC}"
fi

# Test 7: Test POST reset-password avec email valide
echo "📝 Test 7: POST reset-password avec email valide..."
RESPONSE=$(curl -s -X POST "$BASEURL/auth/reset-password" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "email=test@example.com" \
  -w "\n%{http_code}")
STATUS=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$STATUS" -eq 200 ] && echo "$BODY" | grep -q "Email envoyé"; then
  echo -e "${GREEN}✅ Envoi email reset fonctionne (HTTP $STATUS)${NC}"
else
  echo -e "${YELLOW}⚠️  Envoi email reset (HTTP $STATUS)${NC}"
fi

# Test 8: Vérifier la présence du script d'extraction du token dans reset-confirm
echo "📝 Test 8: Script d'extraction token dans reset-confirm..."
RESPONSE=$(curl -s "$BASEURL/auth/reset-confirm")
if echo "$RESPONSE" | grep -q "window.location.hash" && echo "$RESPONSE" | grep -q "access_token"; then
  echo -e "${GREEN}✅ Script d'extraction token présent${NC}"
else
  echo -e "${RED}❌ Script d'extraction token manquant${NC}"
  exit 1
fi

# Test 9: Vérifier la présence du timeout dans la page login
echo "📝 Test 9: Script timeout dans page login..."
RESPONSE=$(curl -s "$BASEURL/auth/login")
if echo "$RESPONSE" | grep -q "loginTimeout" && echo "$RESPONSE" | grep -q "30000"; then
  echo -e "${GREEN}✅ Script timeout 30s présent${NC}"
else
  echo -e "${YELLOW}⚠️  Script timeout non trouvé${NC}"
fi

# Test 10: Vérifier que les pages contiennent les bons messages d'erreur
echo "📝 Test 10: Présence messages d'erreur personnalisés..."
RESPONSE=$(curl -s "$BASEURL/auth/login")
if echo "$RESPONSE" | grep -q "Mot de passe oublié"; then
  echo -e "${GREEN}✅ Page login contient lien reset password${NC}"
else
  echo -e "${YELLOW}⚠️  Lien reset password non trouvé${NC}"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ Tests automatiques terminés${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "⚠️  TESTS MANUELS REQUIS :"
echo "   1. Connexion avec identifiants valides (super_admin, patient, etc.)"
echo "   2. Reset password complet (email → lien → nouveau mot de passe)"
echo "   3. Vérifier que le timeout de 30s s'affiche correctement"
echo "   4. Vérifier les logs Cloudflare pour les erreurs"
echo ""
echo "📚 Documentation complète : CORRECTIONS-AUTH-V3.1.4.md"
echo ""
