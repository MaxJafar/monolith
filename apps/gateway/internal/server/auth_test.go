package server

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/sha256"
	"encoding/base64"
	"testing"

	"golang.org/x/crypto/bcrypt"
)

func TestPasswordCompatibility(t *testing.T) {
	password := "correct horse battery staple"
	argon, err := hashPassword(password)
	if err != nil {
		t.Fatal(err)
	}
	bcryptHash, err := bcrypt.GenerateFromPassword([]byte(password), 10)
	if err != nil {
		t.Fatal(err)
	}
	for _, hash := range []string{argon, string(bcryptHash)} {
		if !verifyPassword(hash, password) || verifyPassword(hash, "wrong") {
			t.Fatal("password compatibility failed")
		}
	}
	if verifyPassword("$argon2id$v=19$m=4294967295,t=3,p=4$invalid$invalid", password) {
		t.Fatal("unsafe parameters accepted")
	}
}
func TestExistingTOTPEncryptionCompatibility(t *testing.T) {
	key, secret := "existing-master-key", "JBSWY3DPEHPK3PXP"
	sum := sha256.Sum256([]byte(key))
	block, _ := aes.NewCipher([]byte(base64.StdEncoding.EncodeToString(sum[:])[:32]))
	raw := make([]byte, 16+len(secret))
	for i := range 16 {
		raw[i] = byte(i)
	}
	cipher.NewCTR(block, raw[:16]).XORKeyStream(raw[16:], []byte(secret))
	restored, err := legacyTOTPSecret(base64.StdEncoding.EncodeToString(raw), key)
	if err != nil || restored != secret {
		t.Fatal("existing encrypted TOTP secret changed")
	}
}
