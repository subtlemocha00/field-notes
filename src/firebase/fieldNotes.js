import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore'
import { db } from './firebase.js'
import { TEMP_COMPANY_ID } from './jobs.js'

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
    createdAt: data.createdAt,
    updatedAt: data.updatedAt
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
  return result.docs.map(mapNote)
}

// noteTime: optional "HH:MM" string; when provided, overrides the
// automatic current-time timestamp so inspectors can backfill notes.
export async function createFieldNote(jobId, dailyEntryId, text, user, noteTime = null) {
  const trimmed = (text || '').trim()
  if (!trimmed) throw new Error('Note text is required.')

  const clientTimestamp = noteTime
    ? timeStringToTimestamp(noteTime)
    : Timestamp.fromDate(new Date())

  const docRef = await addDoc(fieldNotesCollection, {
    companyId: TEMP_COMPANY_ID,
    jobId,
    dailyEntryId,
    timestamp: clientTimestamp,
    text: trimmed,
    createdBy: user?.uid || null,
    createdByName: user?.displayName || user?.email || '',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  })

  return {
    id: docRef.id,
    companyId: TEMP_COMPANY_ID,
    jobId,
    dailyEntryId,
    timestamp: clientTimestamp,
    text: trimmed,
    photoUrls: [],
    createdBy: user?.uid || null,
    createdByName: user?.displayName || user?.email || '',
    createdAt: null,
    updatedAt: null
  }
}

// nextTimestamp: optional Firestore Timestamp; when provided, updates the
// displayed note time (supports manual time correction during edit).
export async function updateFieldNote(noteId, text, nextTimestamp = null) {
  const trimmed = (text || '').trim()
  if (!trimmed) throw new Error('Note text is required.')
  const ref = doc(db, 'fieldNotes', noteId)
  const updates = {
    text: trimmed,
    updatedAt: serverTimestamp()
  }
  if (nextTimestamp) {
    updates.timestamp = nextTimestamp
  }
  await updateDoc(ref, updates)
}

export async function deleteFieldNote(noteId) {
  const ref = doc(db, 'fieldNotes', noteId)
  await deleteDoc(ref)
}
