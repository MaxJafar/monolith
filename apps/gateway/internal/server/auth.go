package server

import (
	"context"
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"fmt"
	"net"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/pquerna/otp"
	"github.com/pquerna/otp/totp"
	"golang.org/x/crypto/argon2"
	"golang.org/x/crypto/bcrypt"
)

type claims struct {
	Device string `json:"dsid,omitempty"`
	jwt.RegisteredClaims
}
type tokens struct {
	AccessToken  string `json:"accessToken"`
	RefreshToken string `json:"refreshToken"`
	AccountID    string `json:"accountId"`
	SessionID    string `json:"sessionId"`
	ExpiresIn    int    `json:"expiresIn"`
}

func randomToken() string {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		panic(err)
	}
	return base64.RawURLEncoding.EncodeToString(b)
}
func digest(value string) string {
	sum := sha256.Sum256([]byte(value))
	return hex.EncodeToString(sum[:])
}

func (s *Server) authenticate(r *http.Request) (string, string, error) {
	raw := strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer ")
	parsed, err := jwt.ParseWithClaims(raw, &claims{}, func(token *jwt.Token) (any, error) { return []byte(s.cfg.JWTKey), nil }, jwt.WithValidMethods([]string{"HS512"}), jwt.WithExpirationRequired())
	if err != nil || !parsed.Valid {
		return "", "", fail(401, "authentication_expired", "Sign in again to continue")
	}
	value := parsed.Claims.(*claims)
	if !validID(value.Subject) {
		return "", "", fail(401, "authentication_expired", "Invalid account identity")
	}
	if value.Device != "" {
		if !validID(value.Device) || value.Issuer != s.serverID || len(value.Audience) != 1 || value.Audience[0] != s.serverID {
			return "", "", fail(401, "authentication_expired", "Invalid device identity")
		}
		tx, err := s.pool.Begin(r.Context())
		if err != nil {
			return "", "", err
		}
		defer tx.Rollback(r.Context())
		if err = setIdentity(r.Context(), tx, value.Subject, "", value.Device); err != nil {
			return "", "", err
		}
		var active bool
		err = tx.QueryRow(r.Context(), "select exists(select 1 from monolith_device_sessions where id=$1 and user_id=$2 and revoked_at is null and expires_at>now() and idle_expires_at>now())", value.Device, value.Subject).Scan(&active)
		if err != nil {
			return "", "", err
		}
		if !active {
			return "", "", fail(401, "authentication_expired", "This device session has expired or was revoked")
		}
	}
	return value.Subject, value.Device, nil
}
func (s *Server) signed(user, session string) (string, error) {
	return jwt.NewWithClaims(jwt.SigningMethodHS512, claims{session, jwt.RegisteredClaims{Subject: user, Issuer: s.serverID, Audience: jwt.ClaimStrings{s.serverID}, IssuedAt: jwt.NewNumericDate(time.Now()), ExpiresAt: jwt.NewNumericDate(time.Now().Add(15 * time.Minute))}}).SignedString([]byte(s.cfg.JWTKey))
}
func (s *Server) issue(ctx context.Context, tx pgx.Tx, user, session, deviceName string) (tokens, error) {
	if session == "" {
		session = uuid.NewString()
		if _, err := tx.Exec(ctx, "insert into monolith_device_sessions(id,user_id,device_name,expires_at,idle_expires_at)values($1,$2,$3,now()+interval '60 days',now()+interval '7 days')", session, user, deviceName); err != nil {
			return tokens{}, err
		}
	}
	refresh := session + "." + randomToken()
	if _, err := tx.Exec(ctx, "insert into monolith_device_refresh(token_hash,session_id)values($1,$2)", digest(refresh), session); err != nil {
		return tokens{}, err
	}
	access, err := s.signed(user, session)
	return tokens{access, refresh, user, session, 900}, err
}
func (s *Server) rateLimit(r *http.Request, subject string) error {
	ip, _, _ := net.SplitHostPort(r.RemoteAddr)
	for _, item := range []struct {
		key   string
		limit int
	}{{"ip:" + ip, 120}, {"account:" + strings.ToLower(subject), 12}} {
		var attempts int
		err := s.pool.QueryRow(r.Context(), `insert into monolith_login_limits(key,attempts,expires_at) values($1,1,now()+interval '10 minutes')
   on conflict(key) do update set attempts=case when monolith_login_limits.expires_at<now() then 1 else monolith_login_limits.attempts+1 end,
   expires_at=case when monolith_login_limits.expires_at<now() then now()+interval '10 minutes' else monolith_login_limits.expires_at end returning attempts`, digest(item.key)).Scan(&attempts)
		if err != nil {
			return err
		}
		if attempts > item.limit {
			return fail(429, "rate_limited", "Too many attempts. Try again in ten minutes")
		}
	}
	return nil
}
func (s *Server) login(w http.ResponseWriter, r *http.Request) error {
	var body struct {
		Email      string `json:"email"`
		Password   string `json:"password"`
		DeviceName string `json:"deviceName"`
	}
	if err := decode(w, r, &body, 16384); err != nil {
		return err
	}
	if len(body.Email) > 255 || len(body.Password) > 4096 || body.Password == "" || len(body.DeviceName) > 120 {
		return fail(400, "invalid_request", "Invalid sign-in details")
	}
	if body.DeviceName == "" {
		body.DeviceName = "Desktop"
	}
	if err := s.rateLimit(r, body.Email); err != nil {
		return err
	}
	var user, hash, secret string
	err := s.pool.QueryRow(r.Context(), "select id::text,coalesce(auth_password_hash,''),coalesce(two_fa_secret,'') from users where lower(email)=lower($1)", body.Email).Scan(&user, &hash, &secret)
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return err
	}
	if err != nil || !verifyPassword(hash, body.Password) {
		return fail(401, "invalid_credentials", "Email or password is incorrect")
	}
	tx, err := s.pool.Begin(r.Context())
	if err != nil {
		return err
	}
	defer tx.Rollback(r.Context())
	if err = setIdentity(r.Context(), tx, user, "", ""); err != nil {
		return err
	}
	if secret != "" {
		challenge := randomToken()
		if _, err = tx.Exec(r.Context(), "insert into monolith_login_challenges(token_hash,user_id,device_name,expires_at)values($1,$2,$3,now()+interval '5 minutes')", digest(challenge), user, body.DeviceName); err != nil {
			return err
		}
		if err = tx.Commit(r.Context()); err != nil {
			return err
		}
		respond(w, 200, map[string]string{"state": "totp_required", "challenge": challenge})
		return nil
	}
	result, err := s.issue(r.Context(), tx, user, "", body.DeviceName)
	if err != nil {
		return err
	}
	if err = tx.Commit(r.Context()); err != nil {
		return err
	}
	respond(w, 201, result)
	return nil
}
func verifyPassword(hash, password string) bool {
	if strings.HasPrefix(hash, "$2a$") || strings.HasPrefix(hash, "$2b$") || strings.HasPrefix(hash, "$2y$") {
		return bcrypt.CompareHashAndPassword([]byte(hash), []byte(password)) == nil
	}
	parts := strings.Split(hash, "$")
	if len(parts) != 6 || (parts[1] != "argon2id" && parts[1] != "argon2i") || parts[2] != "v=19" {
		return false
	}
	var memory, iterations, threads uint32
	if _, err := fmt.Sscanf(parts[3], "m=%d,t=%d,p=%d", &memory, &iterations, &threads); err != nil || memory < 8 || memory > 262144 || iterations < 1 || iterations > 12 || threads < 1 || threads > 16 {
		return false
	}
	salt, err := base64.RawStdEncoding.DecodeString(parts[4])
	if err != nil || len(salt) < 8 {
		return false
	}
	expected, err := base64.RawStdEncoding.DecodeString(parts[5])
	if err != nil || len(expected) < 16 || len(expected) > 64 {
		return false
	}
	var actual []byte
	if parts[1] == "argon2id" {
		actual = argon2.IDKey([]byte(password), salt, iterations, memory, uint8(threads), uint32(len(expected)))
	} else {
		actual = argon2.Key([]byte(password), salt, iterations, memory, uint8(threads), uint32(len(expected)))
	}
	return subtle.ConstantTimeCompare(actual, expected) == 1
}
func hashPassword(password string) (string, error) {
	salt := make([]byte, 16)
	if _, err := rand.Read(salt); err != nil {
		return "", err
	}
	hash := argon2.IDKey([]byte(password), salt, 3, 65536, 4, 32)
	return fmt.Sprintf("$argon2id$v=19$m=65536,t=3,p=4$%s$%s", base64.RawStdEncoding.EncodeToString(salt), base64.RawStdEncoding.EncodeToString(hash)), nil
}
func legacyTOTPSecret(encrypted, key string) (string, error) {
	raw, err := base64.StdEncoding.DecodeString(encrypted)
	if err != nil || len(raw) <= 16 {
		return "", errors.New("invalid TOTP secret")
	}
	sum := sha256.Sum256([]byte(key))
	aesKey := []byte(base64.StdEncoding.EncodeToString(sum[:])[:32])
	block, err := aes.NewCipher(aesKey)
	if err != nil {
		return "", err
	}
	plaintext := make([]byte, len(raw)-16)
	cipher.NewCTR(block, raw[:16]).XORKeyStream(plaintext, raw[16:])
	return string(plaintext), nil
}
func (s *Server) verifyTOTP(w http.ResponseWriter, r *http.Request) error {
	var body struct {
		Challenge string `json:"challenge"`
		Code      string `json:"code"`
	}
	if err := decode(w, r, &body, 4096); err != nil {
		return err
	}
	if len(body.Challenge) > 100 {
		return fail(400, "invalid_request", "Invalid challenge")
	}
	if err := s.rateLimit(r, "totp:"+body.Challenge); err != nil {
		return err
	}
	tx, err := s.pool.Begin(r.Context())
	if err != nil {
		return err
	}
	defer tx.Rollback(r.Context())
	var user, device, encrypted string
	var attempts int
	err = tx.QueryRow(r.Context(), "select c.user_id::text,c.device_name,coalesce(u.two_fa_secret,''),c.attempts from monolith_login_challenges c join users u on u.id=c.user_id where token_hash=$1 and expires_at>now() for update of c", digest(body.Challenge)).Scan(&user, &device, &encrypted, &attempts)
	if errors.Is(err, pgx.ErrNoRows) {
		return fail(401, "challenge_expired", "Start sign-in again")
	}
	if err != nil {
		return err
	}
	secret, secretErr := legacyTOTPSecret(encrypted, s.cfg.MasterKey)
	valid, verifyErr := totp.ValidateCustom(body.Code, secret, time.Now(), totp.ValidateOpts{Period: 30, Skew: 1, Digits: otp.DigitsSix, Algorithm: otp.AlgorithmSHA1})
	if attempts >= 5 || secretErr != nil || verifyErr != nil || !valid {
		if _, err = tx.Exec(r.Context(), "update monolith_login_challenges set attempts=attempts+1 where token_hash=$1", digest(body.Challenge)); err != nil {
			return err
		}
		if err = tx.Commit(r.Context()); err != nil {
			return err
		}
		return fail(401, "invalid_code", "Authenticator code is invalid or expired")
	}
	if _, err = tx.Exec(r.Context(), "delete from monolith_login_challenges where token_hash=$1", digest(body.Challenge)); err != nil {
		return err
	}
	if err = setIdentity(r.Context(), tx, user, "", ""); err != nil {
		return err
	}
	result, err := s.issue(r.Context(), tx, user, "", device)
	if err != nil {
		return err
	}
	if err = tx.Commit(r.Context()); err != nil {
		return err
	}
	respond(w, 201, result)
	return nil
}
func (s *Server) refresh(w http.ResponseWriter, r *http.Request) error {
	var body struct {
		RefreshToken string `json:"refreshToken"`
	}
	if err := decode(w, r, &body, 4096); err != nil {
		return err
	}
	parts := strings.Split(body.RefreshToken, ".")
	if len(parts) != 2 || !validID(parts[0]) || len(parts[1]) != 43 {
		return fail(401, "authentication_expired", "Sign in again")
	}
	tx, err := s.pool.Begin(r.Context())
	if err != nil {
		return err
	}
	defer tx.Rollback(r.Context())
	if err = setIdentity(r.Context(), tx, "", "", parts[0]); err != nil {
		return err
	}
	var user string
	var active bool
	err = tx.QueryRow(r.Context(), "select user_id::text,revoked_at is null and expires_at>now() and idle_expires_at>now() from monolith_device_sessions where id=$1 for update", parts[0]).Scan(&user, &active)
	if errors.Is(err, pgx.ErrNoRows) || err == nil && !active {
		return fail(401, "authentication_expired", "Session expired or revoked")
	}
	if err != nil {
		return err
	}
	var consumed bool
	err = tx.QueryRow(r.Context(), "select consumed_at is not null from monolith_device_refresh where token_hash=$1 and session_id=$2", digest(body.RefreshToken), parts[0]).Scan(&consumed)
	if errors.Is(err, pgx.ErrNoRows) {
		return fail(401, "authentication_expired", "Sign in again")
	}
	if err != nil {
		return err
	}
	if consumed {
		if _, err = tx.Exec(r.Context(), "update monolith_device_sessions set revoked_at=now() where id=$1", parts[0]); err != nil {
			return err
		}
		if err = tx.Commit(r.Context()); err != nil {
			return err
		}
		return fail(401, "refresh_reused", "This device session was revoked because a refresh token was reused")
	}
	if _, err = tx.Exec(r.Context(), "update monolith_device_refresh set consumed_at=now() where token_hash=$1", digest(body.RefreshToken)); err != nil {
		return err
	}
	if _, err = tx.Exec(r.Context(), "update monolith_device_sessions set last_seen_at=now(),idle_expires_at=least(expires_at,now()+interval '7 days') where id=$1", parts[0]); err != nil {
		return err
	}
	result, err := s.issue(r.Context(), tx, user, parts[0], "")
	if err != nil {
		return err
	}
	if err = tx.Commit(r.Context()); err != nil {
		return err
	}
	respond(w, 200, result)
	return nil
}
func (s *Server) sessions(w http.ResponseWriter, r *http.Request) error {
	user, device, err := s.authenticate(r)
	if err != nil {
		return err
	}
	tx, err := s.pool.Begin(r.Context())
	if err != nil {
		return err
	}
	defer tx.Rollback(r.Context())
	if err = setIdentity(r.Context(), tx, user, "", device); err != nil {
		return err
	}
	rows, err := tx.Query(r.Context(), "select id::text,device_name,created_at,last_seen_at,expires_at,revoked_at from monolith_device_sessions where user_id=$1 order by created_at desc", user)
	if err != nil {
		return err
	}
	defer rows.Close()
	result := []map[string]any{}
	for rows.Next() {
		var id, name string
		var created, last, expires time.Time
		var revoked *time.Time
		if err = rows.Scan(&id, &name, &created, &last, &expires, &revoked); err != nil {
			return err
		}
		result = append(result, map[string]any{"id": id, "name": name, "createdAt": created, "lastSeenAt": last, "expiresAt": expires, "revokedAt": revoked, "current": id == device})
	}
	if err = rows.Err(); err != nil {
		return err
	}
	respond(w, 200, result)
	return nil
}
func (s *Server) revoke(w http.ResponseWriter, r *http.Request) error {
	user, device, err := s.authenticate(r)
	if err != nil {
		return err
	}
	id := r.PathValue("id")
	if !validID(id) {
		return fail(400, "invalid_request", "Invalid session identity")
	}
	tx, err := s.pool.Begin(r.Context())
	if err != nil {
		return err
	}
	defer tx.Rollback(r.Context())
	if err = setIdentity(r.Context(), tx, user, "", device); err != nil {
		return err
	}
	result, err := tx.Exec(r.Context(), "update monolith_device_sessions set revoked_at=coalesce(revoked_at,now()) where id=$1 and user_id=$2", id, user)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return pgx.ErrNoRows
	}
	if err = tx.Commit(r.Context()); err != nil {
		return err
	}
	w.WriteHeader(204)
	return nil
}
func (s *Server) bootstrap(w http.ResponseWriter, r *http.Request) error {
	token := strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer ")
	if s.cfg.BootstrapToken == "" || subtle.ConstantTimeCompare([]byte(digest(token)), []byte(digest(s.cfg.BootstrapToken))) != 1 {
		return fail(403, "bootstrap_unavailable", "Bootstrap is unavailable")
	}
	var body struct {
		Email    string `json:"email"`
		Password string `json:"password"`
		Name     string `json:"name"`
	}
	if err := decode(w, r, &body, 8192); err != nil {
		return err
	}
	if len(body.Password) < 12 || len(body.Password) > 1024 || !strings.Contains(body.Email, "@") || len(body.Email) > 255 || len(body.Name) > 150 {
		return fail(400, "invalid_request", "Provide a valid email, name and password of at least twelve characters")
	}
	tx, err := s.pool.Begin(r.Context())
	if err != nil {
		return err
	}
	defer tx.Rollback(r.Context())
	if _, err = tx.Exec(r.Context(), "select pg_advisory_xact_lock(718305433)"); err != nil {
		return err
	}
	var populated bool
	if err = tx.QueryRow(r.Context(), "select exists(select 1 from users) or exists(select 1 from monolith_login_limits where key='bootstrap-completed')").Scan(&populated); err != nil {
		return err
	}
	if populated {
		return fail(403, "bootstrap_unavailable", "The first account already exists")
	}
	hash, err := hashPassword(body.Password)
	if err != nil {
		return err
	}
	user := uuid.NewString()
	if _, err = tx.Exec(r.Context(), "insert into users(id,email,username,name,verified,auth_password_hash)values($1,$2,$3,$4,true,$5)", user, body.Email, "admin-"+strconv.FormatInt(time.Now().Unix(), 36), body.Name, hash); err != nil {
		return err
	}
	if err = setIdentity(r.Context(), tx, user, "", ""); err != nil {
		return err
	}
	if _, err = tx.Exec(r.Context(), "insert into zillion_databases__workspaces(owner_id,name,is_default)values($1,'Personal',true)", user); err != nil {
		return err
	}
	if _, err = tx.Exec(r.Context(), "insert into monolith_login_limits(key,attempts,expires_at)values('bootstrap-completed',1,'infinity')"); err != nil {
		return err
	}
	if err = tx.Commit(r.Context()); err != nil {
		return err
	}
	respond(w, 201, map[string]string{"accountId": user})
	return nil
}
