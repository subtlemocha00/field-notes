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

export async function listFieldNotes(dailyEntryId) {
  const q = query(
    fieldNotesCollection,
    where('dailyEntryId', '==', dailyEntryId),
    orderBy('timestamp', 'asc')
  )
  const result = await getDocs(q)
  return result.docs.map(mapNote)
}

export async function createFieldNote(jobId, dailyEntryId, text, user) {
  const trimmed = (text || '').trim()
  if (!trimmed) throw new Error('Note text is required.')

  // Client-side timestamp keeps the UI immediately consistent without
  // waiting for the server roundtrip; createdAt/updatedAt use server time.
  const clientTimestamp = Timestamp.fromDate(new Date())

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

export async function updateFieldNote(noteId, text) {
  const trimmed = (text || '').trim()
  if (!trimmed) throw new Error('Note text is required.')
  const ref = doc(db, 'fieldNotes', noteId)
  await updateDoc(ref, {
    text: trimmed,
    updatedAt: serverTimestamp()
  })
}

export async function deleteFieldNote(noteId) {
  const ref = doc(db, 'fieldNotes', noteId)
  await deleteDoc(ref)
}
