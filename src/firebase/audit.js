import { serverTimestamp } from 'firebase/firestore'

// ── Foundation: audit metadata, schema versioning, soft delete ──
//
// Centralizes the fields stamped on every important record so jobs,
// daily entries, field notes, and survey setups stay consistent. Keeping
// this in one module means future changes (e.g. real company resolution)
// happen in a single place instead of being copy-pasted per collection.

// TEMPORARY: every record is stamped with this companyId until real
// company management is built. Future work — replace with a value
// resolved from the authenticated user's profile / company membership.
// Re-exported from jobs.js for backward compatibility with existing imports.
export const TEMP_COMPANY_ID = 'demo-company'

// Bumped only when a record's shape changes in a way future code must
// branch on. New writes carry it; legacy records without it are treated
// as version 0 by any future migration. DO NOT build migrations yet.
export const SCHEMA_VERSION = 1

export function userId(user) {
  return user?.uid || null
}

export function userName(user) {
  return user?.displayName || user?.email || ''
}

// Fields stamped on every create. serverTimestamp() is called fresh each
// time so createdAt/updatedAt resolve to the same server write time.
export function auditCreateFields(user) {
  const now = serverTimestamp()
  return {
    companyId: TEMP_COMPANY_ID,
    schemaVersion: SCHEMA_VERSION,
    createdBy: userId(user),
    createdByName: userName(user),
    updatedBy: userId(user),
    createdAt: now,
    updatedAt: now,
    deleted: false
  }
}

// Fields merged into every update. Records who last touched the record.
export function auditUpdateFields(user) {
  return {
    updatedBy: userId(user),
    updatedAt: serverTimestamp()
  }
}

// Soft-delete marker. Replaces deleteDoc() for important entities so the
// record is hidden from normal queries but remains recoverable.
export function softDeleteFields(user) {
  return {
    deleted: true,
    deletedBy: userId(user),
    deletedAt: serverTimestamp()
  }
}

// True for records that have not been soft-deleted. Legacy records have
// no `deleted` field (undefined), so `!== true` correctly keeps them
// visible — this is why we filter in code rather than with a Firestore
// `where('deleted','==',false)` clause that would exclude legacy docs
// and force a new composite index.
export function isNotDeleted(data) {
  return data?.deleted !== true
}
