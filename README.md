# PulseChat ⚡

**Post-Quantum-Ready, End-to-End Encrypted Real-Time Messaging and Calling Web Application**

PulseChat is a modern, production-oriented communication platform featuring NIST-standardized Post-Quantum Cryptography (**ML-KEM-768** / Kyber for key encapsulation and **ML-DSA-65** / Dilithium for digital signatures), authenticated **AES-256-GCM** symmetric message encryption, real-time WebRTC audio calling (**PulseCall**), real-time WebRTC video calling (**VisualPulse**), presence tracking, and an animated glassmorphic dark interface.

---

## 1. Project Directory Structure

```
secure-chat/
├── backend/
│   ├── src/
│   │   ├── config/             # Environment, Database, and Security configuration
│   │   ├── middleware/         # Argon2id auth, rate limiting, Zod validation, uploads, error handling
│   │   ├── models/             # Mongoose schemas: User, PublicKey, Contact, Conversation, Message, Call, Session, BlockedUser, SecurityEvent
│   │   ├── modules/
│   │   │   ├── auth/           # Registration, login, logout, password recovery
│   │   │   ├── users/          # Profile search, profile update, photo uploads
│   │   │   ├── contacts/       # Friend requests, accepts, deletes, blocking
│   │   │   ├── conversations/  # Conversation management and indexing
│   │   │   ├── messages/       # Encrypted envelope routing (no server decryption)
│   │   │   ├── crypto/         # Public key directory, ML-DSA self-signatures, fingerprints
│   │   │   └── calls/          # WebRTC call history and logging
│   │   ├── sockets/            # Authenticated Socket.IO: presence, E2EE message routing, WebRTC signaling
│   │   ├── scripts/            # Database seed script for development test accounts
│   │   ├── tests/              # Cryptographic verification & REST API integration tests
│   │   ├── app.ts              # Express application setup with Helmet & CORS
│   │   └── server.ts           # HTTP & Socket.IO server entrypoint
│   ├── Dockerfile              # Production container build
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── public/
│   │   └── assets/
│   │       ├── pulse-network.png   # Interconnected node visual reference
│   │       └── pulse-texture.jpg   # Charcoal granular surface reference
│   ├── src/
│   │   ├── components/         # AnimatedBackground (5-layer canvas), Navbar, GlassPanel, UserAvatar,
│   │   │                       # OnlineIndicator, EncryptionBadge, IncomingCallDialog, CallScreen, ToastNotifications
│   │   ├── crypto/             # Standardized PQC: ML-KEM-768, ML-DSA-65, HKDF-SHA384, AES-256-GCM,
│   │   │                       # canonical envelope serialization, IndexedDB secure keystore
│   │   ├── pages/              # LandingPage, LoginPage, RegisterPage, ForgotPasswordPage,
│   │   │                       # ChatPage, ContactsPage, CallsPage, SecurityPage, ProfilePage, SettingsPage, VerifyUserPage, AboutPage
│   │   ├── services/           # REST API client, Socket.IO client, WebRTCManager
│   │   ├── store/              # Zustand state stores: authStore, cryptoStore, chatStore, callStore
│   │   ├── tests/              # Vitest post-quantum cryptographic tests
│   │   ├── types/              # Full TypeScript interfaces and domain types
│   │   ├── App.tsx             # React Router v6 routing & global call overlays
│   │   ├── index.css           # Tailwind CSS dark glassmorphism system
│   │   └── main.tsx            # React application entrypoint
│   ├── Dockerfile              # Multi-stage production Nginx container
│   ├── nginx.conf              # SPA fallback routing and reverse proxy
│   ├── package.json
│   └── vite.config.ts
├── docker-compose.yml          # Containerized deployment (MongoDB, Backend, Frontend)
├── .env.example                # Sample environment variables
└── README.md                   # Full documentation & security analysis
```

---

## 2. Installation Commands

Ensure Node.js 20+ and MongoDB 7.0+ are installed.

```bash
# Clone the repository
git clone <repository-url>
cd secure-chat

# Install Backend dependencies
cd backend
npm install

# Install Frontend dependencies
cd ../frontend
npm install
```

---

## 3. Environment Variable Instructions

Create `.env` files in both `backend/` and `frontend/` (or copy from `.env.example`):

### Backend (`backend/.env`):
```env
PORT=5001
NODE_ENV=development
MONGO_URI=mongodb://127.0.0.1:27017/pulsechat
JWT_SECRET=pulsechat_development_jwt_secret_change_me_in_production_384bit
CLIENT_ORIGIN=http://localhost:5173
COOKIE_SECURE=false
```

### Frontend (`frontend/.env`):
```env
VITE_API_URL=http://localhost:5001
VITE_SOCKET_URL=http://localhost:5001
```

### Production deployment URLs
Configure these environment variables for the Vercel frontend build and Render backend service:

```env
# Vercel
VITE_API_URL=https://pulsechat-api-r7v2.onrender.com
VITE_SOCKET_URL=https://pulsechat-api-r7v2.onrender.com

# Render
CLIENT_ORIGIN=https://pulse-chat-pearl.vercel.app
COOKIE_SECURE=true
NODE_ENV=production
```

---

## 4. MongoDB Setup Instructions

1. **Local MongoDB**:
   ```bash
   # Start MongoDB daemon
   mongod --dbpath /var/lib/mongodb
   ```
2. **Seed Initial Demo Accounts** (Optional):
   ```bash
   cd backend
   node dist/scripts/seed.js
   ```
   *Creates two test users:*
   * `alice` / `PulseChat#2026`
   * `bob` / `PulseChat#2026`

---

## 5. Development Run Commands

### Start Backend Server:
```bash
cd backend
npm run dev
# Or build and start:
npm run build && npm start
# Server listens on http://localhost:5001
```

### Start Frontend Client:
```bash
cd frontend
npm run dev
# Vite dev server runs at http://localhost:5173
```

---

## 6. Testing Commands

### Run Backend Unit & Integration Tests:
```bash
cd backend
npm test
```
*Executes:*
- ML-KEM-768 shared-secret agreement test
- ML-DSA-65 digital signature verification & invalid signature rejection
- HKDF-SHA384 key derivation test
- AES-256-GCM authenticated encryption & tamper detection test
- SHA-256 public key fingerprint generation test
- Health endpoint (`/api/health`) check
- User registration, duplicate rejection, Argon2id authentication tests

### Run Frontend Cryptographic Tests:
```bash
cd frontend
npm test
```
*Executes client-side post-quantum cryptographic tests:*
- Client-side ML-KEM-768 (FIPS 203) and ML-DSA-65 (FIPS 204) key generation and binding
- End-to-end message envelope encryption and decapsulation
- Cryptographic digital signature forgery rejection
- AES-256-GCM ciphertext tampering detection
- Collision-resistant public key fingerprint formatting

---

## 7. Production Build & Deployment

### Manual Production Build:
```bash
# Build Backend
cd backend
npm run build

# Build Frontend
cd ../frontend
npm run build
```

### Containerized Deployment (Docker Compose):
```bash
docker-compose up --build -d
```
*Services:*
- `mongodb`: `localhost:27017`
- `backend`: `localhost:5001`
- `frontend`: `localhost:3000`

---

## 8. Implemented Feature Checklist

| Category | Feature | Status | Specification Compliance |
| :--- | :--- | :---: | :--- |
| **Auth** | User Registration & Login | ✅ | Argon2id hashing, unique username/email normalization, rate limiting |
| **Auth** | Session Management | ✅ | HTTP-only cookies + JWT fallback, session revocation |
| **Profiles** | Pulse Profile & Uploads | ✅ | Profile pictures with magic-byte MIME validation, bio, display name |
| **Search** | Username Search | ✅ | Indexed partial search, rate-limited, no email leakage |
| **Contacts** | Contact Management | ✅ | Requests, accept/reject, delete, blocking enforcement on backend |
| **Messaging**| Real-Time Chat | ✅ | Socket.IO authenticated messaging, unread counts, typing indicators |
| **Messaging**| Encrypted Envelopes | ✅ | Ciphertext only stored on server; client-side decryption only |
| **Messaging**| Delivery Receipts | ✅ | Real-time `sent`, `delivered`, and `read` double-check indicators |
| **Crypto** | ML-KEM-768 (Kyber) | ✅ | NIST FIPS 203 standardized post-quantum key encapsulation |
| **Crypto** | ML-DSA-65 (Dilithium) | ✅ | NIST FIPS 204 standardized post-quantum digital signatures |
| **Crypto** | AES-256-GCM | ✅ | Authenticated symmetric encryption with unique CSPRNG nonces & AAD |
| **Crypto** | HKDF-SHA384 | ✅ | RFC 5869 key derivation with conversation salt domain separation |
| **Crypto** | Key Directory | ✅ | Backend public-key registry with ML-DSA self-signature verification |
| **Crypto** | Key Storage | ✅ | Client-side IndexedDB (`pulsechat_secure_keystore_v1`); never sent to backend |
| **Crypto** | Fingerprints & Rotation | ✅ | Formatted hex identity fingerprints, rotation with key version increment |
| **Calling** | PulseCall (Voice) | ✅ | Real-time WebRTC audio, mute toggle, duration timer, signaling via Socket.IO |
| **Calling** | VisualPulse (Video) | ✅ | Real-time WebRTC video, PiP preview, camera toggle, duration timer |
| **UI/UX** | 5-Layer Background | ✅ | Pure black base, `pulse-texture.jpg`, Canvas particle mesh, ambient glows, `pulse-network.png` |
| **UI/UX** | Performance Controls | ✅ | Tab visibility auto-pause (`visibilitychange`), `prefers-reduced-motion` compliance |

---

## 9. Known Limitations

1. **WebRTC Media Transport**: Standard WebRTC audio and video media streams use DTLS-SRTP with classical elliptic-curve Diffie-Hellman (e.g., X25519) and AES-128-GCM. While signaling is authenticated with ML-DSA-65, standard WebRTC media streams are **not** post-quantum secure against "harvest now, decrypt later" attacks on recorded media packets.
2. **Forward Secrecy**: The initial ML-KEM-768 exchange utilizes the recipient's long-term identity encapsulation key. Compromise of the recipient's long-term private key in the future would allow decryption of historical envelopes unless an ephemeral ratchet (such as an ML-KEM Double Ratchet) is added.
3. **Traffic Metadata**: The server facilitates routing and persistence of encrypted envelopes. While message plaintext is never exposed, conversation participants, timestamp patterns, IP addresses, and message sizes remain observable to the server.
4. **Browser Keystore Isolation**: Client private keys are persisted in browser IndexedDB. While private keys are never transmitted to the server or stored in `localStorage`, a compromised browser environment, malicious browser extension, or Cross-Site Scripting (XSS) vulnerability could access IndexedDB.

---

## 10. Cryptographic Security Assumptions

1. **Lattice Hardness**: The post-quantum security of ML-KEM-768 rests on the hardness of the Module Learning With Errors (M-LWE) problem; ML-DSA-65 rests on the hardness of Module Short Integer Solution (M-SIS) and M-LWE.
2. **Authenticated Key Binding**: Public ML-KEM keys published to the directory must carry a valid ML-DSA-65 self-signature proving possession of the identity key matching the username.
3. **Out-of-Band Fingerprint Verification**: Protection against malicious public-key substitution by an active man-in-the-middle or compromised directory server requires that users verify their respective ML-DSA identity fingerprints via an out-of-band channel (e.g. in person or verified video).

---

## 11. Features Requiring Further Security Review

1. **Post-Quantum Encoded Transforms for WebRTC**: Integrating the W3C WebRTC Insertable Streams (Encoded Transforms) API to perform client-side post-quantum key exchange and AES-256-GCM frame encryption over media frames before DTLS transmission.
2. **Post-Quantum Double Ratchet**: Implementing a continuous key-exchange ratchet combining ephemeral ML-KEM-768 key exchanges with a symmetric KDF chain to provide Forward Secrecy and Post-Compromise Security on a per-message granularity.
3. **Encrypted Keystore at Rest**: Deriving an encryption key from a user passphrase or WebAuthn PRF extension to encrypt private key material before writing to IndexedDB.
