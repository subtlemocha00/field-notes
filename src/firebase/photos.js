import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
  deleteObject
} from 'firebase/storage'
import {
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  serverTimestamp
} from 'firebase/firestore'
import { storage, db } from './firebase.js'
import { TEMP_COMPANY_ID } from './jobs.js'

function safeFileName(name) {
  const lastDot = name.lastIndexOf('.')
  const base = lastDot > 0 ? name.slice(0, lastDot) : name
  const ext = lastDot > 0 ? name.slice(lastDot) : ''
  const sanitized = base.replace(/[^a-zA-Z0-9-_]/g, '_').slice(0, 64) || 'photo'
  const stamp = Date.now()
  const rand = Math.random().toString(36).slice(2, 8)
  return `${stamp}-${rand}-${sanitized}${ext}`
}

function buildStoragePath({ jobId, dailyEntryId, fieldNoteId, fileName }) {
  return [
    'companies',
    TEMP_COMPANY_ID,
    'jobs',
    jobId,
    'dailyEntries',
    dailyEntryId,
    'fieldNotes',
    fieldNoteId,
    fileName
  ].join('/')
}

export async function uploadFieldNotePhoto({
  file,
  jobId,
  dailyEntryId,
  fieldNoteId
}) {
  if (!file) throw new Error('No file selected.')

  const path = buildStoragePath({
    jobId,
    dailyEntryId,
    fieldNoteId,
    fileName: safeFileName(file.name || 'photo')
  })
  const fileRef = storageRef(storage, path)

  // Step 1: upload to Storage.
  await uploadBytes(fileRef, file, {
    contentType: file.type || 'application/octet-stream'
  })
  const url = await getDownloadURL(fileRef)

  // Step 2: link from Firestore. If this fails, clean up the orphan upload.
  const noteRef = doc(db, 'fieldNotes', fieldNoteId)
  try {
    await updateDoc(noteRef, {
      photoUrls: arrayUnion(url),
      updatedAt: serverTimestamp()
    })
  } catch (err) {
    try {
      await deleteObject(fileRef)
    } catch (cleanupErr) {
      console.error(
        'Failed to clean up Storage file after Firestore update error:',
        cleanupErr
      )
    }
    throw err
  }

  return url
}

export async function deleteFieldNotePhoto({ url, fieldNoteId }) {
  // Storage first → if it fails, the URL stays in Firestore so the user
  // can retry. Firestore-first ordering would risk an orphan file.
  const fileRef = storageRef(storage, url)
  await deleteObject(fileRef)

  const noteRef = doc(db, 'fieldNotes', fieldNoteId)
  await updateDoc(noteRef, {
    photoUrls: arrayRemove(url),
    updatedAt: serverTimestamp()
  })
}
