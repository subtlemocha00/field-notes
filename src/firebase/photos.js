import {
  ref as storageRef,
  uploadBytesResumable,
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

// 90 seconds is generous for construction-site LTE but still bounded.
// On timeout the task is cancelled so it does not linger in the background.
const UPLOAD_TIMEOUT_MS = 90_000

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

// Wraps an UploadTask in a Promise with progress callbacks and a hard timeout.
// If the timeout fires the task is cancelled so it does not linger.
function promisifyUploadTask(task, onProgress) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      task.cancel()
      const err = new Error('Upload timed out. Check your connection and try again.')
      err.code = 'storage/upload-timeout'
      reject(err)
    }, UPLOAD_TIMEOUT_MS)

    task.on(
      'state_changed',
      (snapshot) => {
        const { bytesTransferred, totalBytes } = snapshot
        if (totalBytes > 0 && typeof onProgress === 'function') {
          onProgress(Math.round((bytesTransferred / totalBytes) * 100))
        }
      },
      (err) => { clearTimeout(timer); reject(err) },
      () => { clearTimeout(timer); resolve(task.snapshot) }
    )
  })
}

export async function uploadFieldNotePhoto({
  file,
  jobId,
  dailyEntryId,
  fieldNoteId,
  onProgress,
}) {
  if (!file) throw new Error('No file selected.')

  const path = buildStoragePath({
    jobId,
    dailyEntryId,
    fieldNoteId,
    fileName: safeFileName(file.name || 'photo'),
  })
  const fileRef = storageRef(storage, path)

  console.log(`[photos] Upload start: "${file.name}" ${file.size} bytes → ${path}`)

  // Step 1: Upload to Storage with progress reporting and a hard timeout.
  // uploadBytesResumable (vs uploadBytes) supports cancellation and progress
  // events, both of which are needed for mobile reliability.
  // Android camera captures often return empty file.type; fall back to jpeg
  // so Storage serves the correct Content-Type header to the browser.
  const task = uploadBytesResumable(fileRef, file, {
    contentType: file.type || 'image/jpeg',
  })

  try {
    await promisifyUploadTask(task, onProgress)
  } catch (err) {
    console.error('[photos] Storage upload failed:', err?.code, err?.message)
    throw err
  }

  console.log('[photos] Upload complete, fetching download URL')
  const url = await getDownloadURL(fileRef)

  // Step 2: Link from Firestore. On failure, delete the orphan upload.
  const noteRef = doc(db, 'fieldNotes', fieldNoteId)
  try {
    await updateDoc(noteRef, {
      photoUrls: arrayUnion(url),
      updatedAt: serverTimestamp(),
    })
    console.log('[photos] Firestore updated with new photo URL')
  } catch (err) {
    console.error('[photos] Firestore update failed; cleaning up orphan storage file:', err)
    try {
      await deleteObject(fileRef)
    } catch (cleanupErr) {
      console.error('[photos] Orphan cleanup failed:', cleanupErr)
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
