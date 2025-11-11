package auth

import (
	"context"
	"crypto"
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rsa"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"math/big"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// LogtoVerifier verifies JWT tokens issued by Logto using OIDC JWKs
type LogtoVerifier struct {
	endpoint      string
	resource      string
	httpClient    *http.Client
	jwksURL       string
	keys          map[string]crypto.PublicKey // Changed to support both RSA and ECDSA
	keysMutex     sync.RWMutex
	lastFetch     time.Time
	cacheDuration time.Duration
}

// JWKSResponse represents the JWKS endpoint response
type JWKSResponse struct {
	Keys []JWK `json:"keys"`
}

// JWK represents a JSON Web Key (supports both RSA and EC)
type JWK struct {
	Kty string `json:"kty"` // Key type (RSA or EC)
	Use string `json:"use"` // Public key use
	Kid string `json:"kid"` // Key ID
	Alg string `json:"alg"` // Algorithm

	// RSA fields
	N   string `json:"n,omitempty"` // Modulus
	E   string `json:"e,omitempty"` // Exponent

	// EC fields
	Crv string `json:"crv,omitempty"` // Curve
	X   string `json:"x,omitempty"`   // X coordinate
	Y   string `json:"y,omitempty"`   // Y coordinate
}

// LogtoJWTClaims represents the claims in a Logto JWT token
type LogtoJWTClaims struct {
	jwt.RegisteredClaims
	Sub              string   `json:"sub"`               // User ID
	Scope            string   `json:"scope"`             // Space-separated scopes
	ClientID         string   `json:"client_id"`         // M2M App ID
	OrganizationID   string   `json:"organization_id"`   // Organization ID (optional)
	OrganizationRoles []string `json:"organization_roles"` // Organization roles (optional)
	Roles            []string `json:"roles"`             // User roles (optional)
}

// UserInfo contains the verified user information from JWT
type UserInfo struct {
	ID             string
	Email          string
	Username       string
	TenantID       string
	OrganizationID string
	Roles          []string
	Scopes         []string
}

// NewLogtoVerifier creates a new Logto JWT verifier
func NewLogtoVerifier(endpoint, resource string) (*LogtoVerifier, error) {
	if endpoint == "" {
		return nil, errors.New("logto endpoint is required")
	}
	if resource == "" {
		return nil, errors.New("api resource is required")
	}

	// Remove trailing slash from endpoint
	endpoint = strings.TrimRight(endpoint, "/")

	verifier := &LogtoVerifier{
		endpoint:      endpoint,
		resource:      resource,
		httpClient:    &http.Client{Timeout: 10 * time.Second},
		jwksURL:       endpoint + "/oidc/jwks",
		keys:          make(map[string]crypto.PublicKey),
		cacheDuration: time.Hour, // Cache JWKs for 1 hour
	}

	// Fetch initial JWKs
	if err := verifier.fetchJWKS(); err != nil {
		return nil, fmt.Errorf("failed to fetch initial JWKs: %w", err)
	}

	return verifier, nil
}

// VerifyToken verifies a JWT token and extracts user information
func (v *LogtoVerifier) VerifyToken(ctx context.Context, tokenString string) (*UserInfo, error) {
	// Refresh JWKs if cache expired
	if time.Since(v.lastFetch) > v.cacheDuration {
		if err := v.fetchJWKS(); err != nil {
			return nil, fmt.Errorf("failed to refresh JWKs: %w", err)
		}
	}

	// Parse token with custom key function
	token, err := jwt.ParseWithClaims(tokenString, &LogtoJWTClaims{}, func(token *jwt.Token) (interface{}, error) {
		// Get key ID from token header
		kid, ok := token.Header["kid"].(string)
		if !ok {
			return nil, errors.New("missing kid in token header")
		}

		// Validate algorithm
		alg, ok := token.Header["alg"].(string)
		if !ok {
			return nil, errors.New("missing alg in token header")
		}

		// Support both ES384 and RS256
		switch alg {
		case "ES384", "ES256", "ES512":
			if _, ok := token.Method.(*jwt.SigningMethodECDSA); !ok {
				return nil, fmt.Errorf("unexpected signing method: %v (expected ECDSA)", token.Header["alg"])
			}
		case "RS256", "RS384", "RS512":
			if _, ok := token.Method.(*jwt.SigningMethodRSA); !ok {
				return nil, fmt.Errorf("unexpected signing method: %v (expected RSA)", token.Header["alg"])
			}
		default:
			return nil, fmt.Errorf("unsupported signing method: %v", alg)
		}

		// Get public key
		v.keysMutex.RLock()
		key, exists := v.keys[kid]
		v.keysMutex.RUnlock()

		if !exists {
			// Try to refresh JWKs if key not found
			if err := v.fetchJWKS(); err != nil {
				return nil, fmt.Errorf("key not found and failed to refresh: %w", err)
			}

			v.keysMutex.RLock()
			key, exists = v.keys[kid]
			v.keysMutex.RUnlock()

			if !exists {
				return nil, fmt.Errorf("key with kid '%s' not found", kid)
			}
		}

		return key, nil
	})

	if err != nil {
		return nil, fmt.Errorf("failed to parse token: %w", err)
	}

	if !token.Valid {
		return nil, errors.New("token is invalid")
	}

	// Extract claims
	claims, ok := token.Claims.(*LogtoJWTClaims)
	if !ok {
		return nil, errors.New("failed to extract claims")
	}

	// Verify issuer (must end with /oidc)
	// Note: We use flexible matching to handle both localhost and docker service names
	if !strings.HasSuffix(claims.Issuer, "/oidc") {
		return nil, fmt.Errorf("invalid issuer: must end with /oidc, got %s", claims.Issuer)
	}

	// Extract host from issuer and endpoint to compare
	issuerHost := strings.TrimSuffix(claims.Issuer, "/oidc")
	endpointHost := v.endpoint

	// Accept if either matches exactly, or if they differ only by localhost vs logto-core
	if issuerHost != endpointHost {
		// Allow localhost <-> logto-core substitution
		if !(strings.Contains(issuerHost, "localhost") && strings.Contains(endpointHost, "logto-core")) &&
			!(strings.Contains(issuerHost, "logto-core") && strings.Contains(endpointHost, "localhost")) {
			return nil, fmt.Errorf("invalid issuer: expected %s/oidc, got %s", endpointHost, claims.Issuer)
		}
	}

	// Verify audience (should contain our API resource)
	audienceValid := false
	for _, aud := range claims.Audience {
		if aud == v.resource {
			audienceValid = true
			break
		}
	}
	if !audienceValid {
		return nil, fmt.Errorf("invalid audience: token does not contain resource %s", v.resource)
	}

	// Extract scopes
	scopes := []string{}
	if claims.Scope != "" {
		scopes = strings.Split(claims.Scope, " ")
	}

	// Determine tenant ID
	// Priority: OrganizationID > Sub (user ID)
	tenantID := claims.Sub
	if claims.OrganizationID != "" {
		tenantID = claims.OrganizationID
	}

	// Build user info
	userInfo := &UserInfo{
		ID:             claims.Sub,
		Email:          claims.Sub, // For M2M, this is the app ID
		Username:       claims.ClientID,
		TenantID:       tenantID,
		OrganizationID: claims.OrganizationID,
		Roles:          append(claims.Roles, claims.OrganizationRoles...),
		Scopes:         scopes,
	}

	return userInfo, nil
}

// fetchJWKS fetches and caches the public keys from Logto OIDC endpoint
func (v *LogtoVerifier) fetchJWKS() error {
	resp, err := v.httpClient.Get(v.jwksURL)
	if err != nil {
		return fmt.Errorf("failed to fetch JWKS: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("JWKS endpoint returned status %d: %s", resp.StatusCode, string(body))
	}

	var jwksResp JWKSResponse
	if err := json.NewDecoder(resp.Body).Decode(&jwksResp); err != nil {
		return fmt.Errorf("failed to decode JWKS response: %w", err)
	}

	// Convert JWKs to public keys
	newKeys := make(map[string]crypto.PublicKey)
	for _, jwk := range jwksResp.Keys {
		var pubKey crypto.PublicKey
		var err error

		switch jwk.Kty {
		case "RSA":
			pubKey, err = v.rsaPublicKeyFromJWK(jwk)
		case "EC":
			pubKey, err = v.ecPublicKeyFromJWK(jwk)
		default:
			continue // Skip unsupported key types
		}

		if err != nil {
			continue // Skip invalid keys
		}

		newKeys[jwk.Kid] = pubKey
	}

	if len(newKeys) == 0 {
		return errors.New("no valid keys found in JWKS")
	}

	// Update cache
	v.keysMutex.Lock()
	v.keys = newKeys
	v.lastFetch = time.Now()
	v.keysMutex.Unlock()

	return nil
}

// rsaPublicKeyFromJWK converts a JWK to RSA public key
func (v *LogtoVerifier) rsaPublicKeyFromJWK(jwk JWK) (*rsa.PublicKey, error) {
	// Decode modulus
	nBytes, err := base64.RawURLEncoding.DecodeString(jwk.N)
	if err != nil {
		return nil, fmt.Errorf("failed to decode modulus: %w", err)
	}

	// Decode exponent
	eBytes, err := base64.RawURLEncoding.DecodeString(jwk.E)
	if err != nil {
		return nil, fmt.Errorf("failed to decode exponent: %w", err)
	}

	// Build RSA public key
	pubKey := &rsa.PublicKey{
		N: new(big.Int).SetBytes(nBytes),
		E: int(new(big.Int).SetBytes(eBytes).Int64()),
	}

	return pubKey, nil
}

// ecPublicKeyFromJWK converts a JWK to ECDSA public key
func (v *LogtoVerifier) ecPublicKeyFromJWK(jwk JWK) (*ecdsa.PublicKey, error) {
	// Determine curve
	var curve elliptic.Curve
	switch jwk.Crv {
	case "P-256":
		curve = elliptic.P256()
	case "P-384":
		curve = elliptic.P384()
	case "P-521":
		curve = elliptic.P521()
	default:
		return nil, fmt.Errorf("unsupported curve: %s", jwk.Crv)
	}

	// Decode X coordinate
	xBytes, err := base64.RawURLEncoding.DecodeString(jwk.X)
	if err != nil {
		return nil, fmt.Errorf("failed to decode X coordinate: %w", err)
	}

	// Decode Y coordinate
	yBytes, err := base64.RawURLEncoding.DecodeString(jwk.Y)
	if err != nil {
		return nil, fmt.Errorf("failed to decode Y coordinate: %w", err)
	}

	// Build ECDSA public key
	pubKey := &ecdsa.PublicKey{
		Curve: curve,
		X:     new(big.Int).SetBytes(xBytes),
		Y:     new(big.Int).SetBytes(yBytes),
	}

	return pubKey, nil
}
