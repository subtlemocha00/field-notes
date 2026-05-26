import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
  deleteObject
} from 'firebase/storage'
import {
  collection,
  doc,
  addDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp
} from 'firebase/firestore'
import { storage, db } from './firebase.js'
import { TEMP_COMPANY_ID } from './jobs.js'

export const DOCUMENT_TYPES = ['drawing', 'tender', 'specifications']

export const DOCUMENT_TYPE_LABELS = {
  drawing: 'Drawing',
  tender: 'Tender Document',
  specifications: 'Specifications'
}

export const DOCUMENT_TYPE_GROUP_LABELS = {
  drawing: 'Drawings',
  tender: 'Tender Documents',
  specifications: 'Specifications'
}

export const MAX_DOCUMENT_BYTES = 50 * 1024 * 1024 // 50 MB

const documentsCollection = collection(db, 'documents')

function safeFileName(name) {
  const lastDot = name.lastIndexOf('.')
  const base = lastDot > 0 ? name.slice(0, lastDot) : name
  const ext = lastDot > 0 ? name.slice(lastDot) : '.pdf'
  const sanitized = base.replace(/[^a-zA-Z0-9-_]/g, '_').slice(0, 64) || 'document'
  const stamp = Date.now()
  const rand = Math.random().toString(36).slice(2, 8)
  return `${stamp}-${rand}-${sanitized}${ext}`
}

function buildStoragePath({ jobId, fileName }) {
  return [
    'companies',
    TEMP_COMPANY_ID,
    'jobs',
    jobId,
    'documents',
    fileName
  ].join('/')
}

function mapDocument(snapshot) {
  const data = snapshot.data()
  return {
    id: snapshot.id,
    companyId: data.companyId,
    jobId: data.jobId,
    fileName: data.fileName || '',
    documentType: data.documentType || 'drawing',
    storagePath: data.storagePath || '',
    downloadURL: data.downloadURL || '',
    fileSize: typeof data.fileSize === 'number' ? data.fileSize : 0,
    uploadedBy: data.uploadedBy || null,
    uploadedByName: data.uploadedByName || '',
    uploadedAt: data.uploadedAt || null
  }
}

export async function listJobDocuments(jobId) {
  const q = query(
    documentsCollection,
    where('jobId', '==', jobId),
    orderBy('uploadedAt', 'desc')
  )
  const result = await getDocs(q)
  return result.docs.map(mapDocument)
}

export async function uploadJobDocument({ file, jobId, documentType, user }) {
  if (!file) throw new Error('No file selected.')
  if (!DOCUMENT_TYPES.includes(documentType)) {
    throw new Error('Invalid document type.')
  }

  const originalName = file.name || 'document.pdf'
  const storageFileName = safeFileName(originalName)
  const path = buildStoragePath({ jobId, fileName: storageFileName })
  const fileRef = storageRef(storage, path)

  // Step 1: upload to Storage.
  await uploadBytes(fileRef, file, { contentType: 'application/pdf' })
  const downloadURL = await getDownloadURL(fileRef)

  // Step 2: write Firestore metadata. If this fails, clean up the orphan.
  try {
    const docRef = await addDoc(documentsCollection, {
      companyId: TEMP_COMPANY_ID,
      jobId,
      fileName: originalName,
      documentType,
      storagePath: path,
      downloadURL,
      fileSize: file.size || 0,
      uploadedBy: user?.uid || null,
      uploadedByName: user?.displayName || user?.email || '',
      uploadedAt: serverTimestamp()
    })
    return {
      id: docRef.id,
      companyId: TEMP_COMPANY_ID,
      jobId,
      fileName: originalName,
      documentType,
      storagePath: path,
      downloadURL,
      fileSize: file.size || 0,
      uploadedBy: user?.uid || null,
      uploadedByName: user?.displayName || user?.email || '',
      uploadedAt: null
    }
  } catch (err) {
    try {
      await deleteObject(fileRef)
    } catch (cleanupErr) {
      console.error(
        'Failed to clean up Storage file after Firestore write error:',
        cleanupErr
      )
    }
    throw err
  }
}

export async function deleteJobDocument(document) {
  // Storage first → if it fails, metadata stays so the user can retry.
  // Firestore-first ordering would risk an orphan file.
  if (document.storagePath) {
    const fileRef = storageRef(storage, document.storagePath)
    try {
      await deleteObject(fileRef)
    } catch (err) {
      // If the storage object is already gone, continue to remove metadata
      // so the listing doesn't keep showing a phantom row.
      if (err?.code !== 'storage/object-not-found') {
        throw err
      }
    }
  }
  await deleteDoc(doc(db, 'documents', document.id))
}
