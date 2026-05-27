import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp
} from 'firebase/firestore'
import { db } from './firebase.js'
import {
  TEMP_COMPANY_ID,
  SCHEMA_VERSION,
  auditCreateFields,
  auditUpdateFields,
  softDeleteFields,
  isNotDeleted,
  userId,
  userName
} from './audit.js'

const fieldNotesCollection = collection(db, 'fieldNotes')

function mapNote(snapshot) {
  const data = snapshot.data()
  return {
    id: snapshot.id,
    companyId: data.companyId,
    jobId: data.jobId,
    dailyEntryId: data.dailyEntryId,
    timestamp: data.timestamp,
    text: typeof data.text === 'string' ? data.text : '',
    photoUrls: Array.isArray(data.photoUrls) ? data.photoUrls : [],
    createdBy: data.createdBy || null,
    createdByName: data.createdByName || '',
    updatedBy: data.updatedBy || null,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    schemaVersion: data.schemaVersion ?? 0,
    deleted: data.deleted === true
  }
}

// Build a Firestore Timestamp from "HH:MM" string, using baseDate for the
// calendar date (defaults to today). Keeps Firebase-specific code isolated.
export function timeStringToTimestamp(timeString, baseDate = new Date()) {
  const [hh, mm] = timeString.split(':').map(Number)
  const d = new Date(baseDate)
  d.setHours(hh, mm, 0, 0)
  return Timestamp.fromDate(d)
}

export async function listFieldNotes(dailyEntryId) {
  const q = query(
    fieldNotesCollection,
    where('dailyEntryId', '==', dailyEntryId),
    orderBy('timestamp', 'asc')
  )
  const result = await getDocs(q)
  // Hide soft-deleted notes (legacy notes without the field stay visible).
  return result.docs.filter((d) => isNotDeleted(d.data())).map(mapNote)
}

// noteTime: optional "HH:MM" string; when provided, overrides the
// automatic current-time timestamp so inspectors can backfill notes.
export async function createFieldNote(jobId, dailyEntryId, text, user, noteTime = null) {
  if (!jobId || !dailyEntryId) {
    throw new Error('A job and daily entry are required to add a note.')
  }
  const trimmed = (text || '').trim()
  if (!trimmed) throw new Error('Note text is required.')

  const clientTimestamp = noteTime
    ? timeStringToTimestamp(noteTime)
    : Timestamp.fromDate(new Date())

  const docRef = await addDoc(fieldNotesCollection, {
    jobId,
    dailyEntryId,
    timestamp: clientTimestamp,
    text: trimmed,
    ...auditCreateFields(user)
  })

  // Return an optimistic local shape. createdAt/updatedAt resolve server-side,
  // so they stay null here until the next read.
  return {
    id: docRef.id,
    companyId: TEMP_COMPANY_ID,
    jobId,
    dailyEntryId,
    timestamp: clientTimestamp,
    text: trimmed,
    photoUrls: [],
    createdBy: userId(user),
    createdByName: userName(user),
    updatedBy: userId(user),
    createdAt: null,
    updatedAt: null,
    schemaVersion: SCHEMA_VERSION,
    deleted: false
  }
}

// nextTimestamp: optional Firestore Timestamp; when provided, updates the
// displayed note time (supports manual time correction during edit).
export async function updateFieldNote(noteId, text, nextTimestamp = null, user = null) {
  const trimmed = (text || '').trim()
  if (!trimmed) throw new Error('Note text is required.')
  const ref = doc(db, 'fieldNotes', noteId)
  const updates = {
    text: trimmed,
    ...auditUpdateFields(user)
  }
  if (nextTimestamp) {
    updates.timestamp = nextTimestamp
  }
  await updateDoc(ref, updates)
}

// Soft delete — hidden from the note timeline but recoverable. Any attached
// photos remain in Storage and stay referenced on the (hidden) document.
export async function deleteFieldNote(noteId, user) {
  const ref = doc(db, 'fieldNotes', noteId)
  await updateDoc(ref, softDeleteFields(user))
}
