import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp
} from 'firebase/firestore'
import { db } from './firebase.js'

// TEMPORARY: every job is stamped with this companyId until real
// company management is built. Future work — replace with a value
// resolved from the authenticated user's profile / company membership.
export const TEMP_COMPANY_ID = 'demo-company'

const jobsCollection = collection(db, 'jobs')

function mapJob(snapshot) {
  const data = snapshot.data()
  return {
    id: snapshot.id,
    companyId: data.companyId,
    jobNumber: data.jobNumber,
    jobName: data.jobName,
    location: data.location || '',
    description: data.description || '',
    createdBy: data.createdBy,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt
  }
}

export async function listJobs(companyId) {
  const q = query(
    jobsCollection,
    where('companyId', '==', companyId),
    orderBy('createdAt', 'desc')
  )
  const result = await getDocs(q)
  return result.docs.map(mapJob)
}

export async function getJob(jobId) {
  const ref = doc(db, 'jobs', jobId)
  const snapshot = await getDoc(ref)
  if (!snapshot.exists()) {
    return null
  }
  return mapJob(snapshot)
}

export async function createJob({ jobNumber, jobName, location, description }, user) {
  const now = serverTimestamp()
  const docRef = await addDoc(jobsCollection, {
    companyId: TEMP_COMPANY_ID,
    jobNumber: jobNumber.trim(),
    jobName: jobName.trim(),
    location: (location || '').trim(),
    description: (description || '').trim(),
    createdBy: user?.uid || null,
    createdAt: now,
    updatedAt: now
  })
  return docRef.id
}

export async function updateJob(jobId, { jobNumber, jobName, location, description }) {
  const ref = doc(db, 'jobs', jobId)
  await updateDoc(ref, {
    jobNumber: jobNumber.trim(),
    jobName: jobName.trim(),
    location: (location || '').trim(),
    description: (description || '').trim(),
    updatedAt: serverTimestamp()
  })
}

export async function deleteJob(jobId) {
  const ref = doc(db, 'jobs', jobId)
  await deleteDoc(ref)
}
