# Privacy at FaceVerse

_Plain-language summary. Updated as features ship; the full consent and data-control screens land
in Phase 6._

## What runs where

- **Face and voice models run in your browser.** Your camera and microphone streams are processed
  on your device and are not uploaded.
- What gets sent to our database is an **embedding**: a list of numbers that describes a face or
  voice for comparison. It is not a photo or a recording.

## What we store

| Data                          | Why                                                                         | When                    |
| ----------------------------- | --------------------------------------------------------------------------- | ----------------------- |
| Account (email, name, avatar) | To sign you in                                                              | On sign-up              |
| Face embeddings (3–5 each)    | To recognise enrolled people                                                | When you enroll someone |
| Voice embeddings (3 each)     | For optional voice verification                                             | When you enroll a voice |
| Recognition events            | Dashboard stats and history                                                 | During live scans       |
| Login attempts                | Rate-limiting and security                                                  | On biometric login      |
| Photos                        | Only where a feature needs them (albums, optional visitor snapshot, avatar) | When you upload         |

Photos are compressed in your browser before upload and stored in private buckets.

## Who can see it

Every table uses Postgres **Row Level Security**: you can only read and change the data you own.
Workspace admins can read data for support and moderation. The server-only service key is never
sent to your browser.

## Your controls

- **Consent first:** before your first enrollment you'll see exactly what is stored and why.
- **Export:** download your profile, people and events as JSON (embeddings optional).
- **Delete:** one action removes all your face and voice embeddings and linked photos. The deletion
  itself is recorded in the audit log.
- Biometric login is **opt-in**; password and Google sign-in always remain available.

## Honest limits

FaceVerse is a learning and demo project. Browser-based biometrics are a convenience factor and
**not** production-grade biometric security. Don't rely on it to protect anything critical.
