import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { db } from './firebase.js'
import { auditUpdateFields } from './audit.js'

// ── Road Makeup ────────────────────────────────────────────────

function emptyRoadMakeup() {
  return {
    topAsphaltType: '',
    topAsphaltThickness: '',
    baseAsphaltType: '',
    baseAsphaltThickness: '',
    granularAThickness: '',
    granularBThickness: '',
  }
}

function mapRoadMakeup(raw) {
  if (!raw) return emptyRoadMakeup()
  return {
    topAsphaltType: raw.topAsphaltType ?? '',
    topAsphaltThickness: raw.topAsphaltThickness ?? '',
    baseAsphaltType: raw.baseAsphaltType ?? '',
    baseAsphaltThickness: raw.baseAsphaltThickness ?? '',
    granularAThickness: raw.granularAThickness ?? '',
    granularBThickness: raw.granularBThickness ?? '',
  }
}

// ── Sewer Sections (Sanitary & Storm) ─────────────────────────

export function emptySewer() {
  return {
    pipeEntries: [],
    bedding: '',
    beddingCustom: '',
    cover: '',
    coverCustom: '',
  }
}

function mapPipeEntry(raw) {
  return {
    size: raw?.size ?? '',
    material: raw?.material ?? '',
    customMaterial: raw?.customMaterial ?? '',
  }
}

function mapSewer(raw) {
  if (!raw) return emptySewer()
  return {
    pipeEntries: Array.isArray(raw.pipeEntries)
      ? raw.pipeEntries.map(mapPipeEntry)
      : [],
    bedding: raw.bedding ?? '',
    beddingCustom: raw.beddingCustom ?? '',
    cover: raw.cover ?? '',
    coverCustom: raw.coverCustom ?? '',
  }
}

// ── Firestore reads ────────────────────────────────────────────

// Returns { roadMakeup, sanitarySewers, stormSewers } or null if
// the job document doesn't exist.
export async function getJobDetails(jobId) {
  const ref = doc(db, 'jobs', jobId)
  const snapshot = await getDoc(ref)
  if (!snapshot.exists()) return null
  const data = snapshot.data()
  return {
    roadMakeup: mapRoadMakeup(data?.details?.roadMakeup),
    sanitarySewers: mapSewer(data?.details?.sanitarySewers),
    stormSewers: mapSewer(data?.details?.stormSewers),
    watermain: mapSewer(data?.details?.watermain),
  }
}

// ── Firestore writes ───────────────────────────────────────────

// Writes only the roadMakeup section so other detail sections on
// the same job document are never overwritten by this call.
export async function saveRoadMakeup(jobId, roadMakeup, user) {
  const ref = doc(db, 'jobs', jobId)
  await updateDoc(ref, {
    'details.roadMakeup': {
      topAsphaltType: (roadMakeup.topAsphaltType || '').trim(),
      topAsphaltThickness: (roadMakeup.topAsphaltThickness || '').trim(),
      baseAsphaltType: (roadMakeup.baseAsphaltType || '').trim(),
      baseAsphaltThickness: (roadMakeup.baseAsphaltThickness || '').trim(),
      granularAThickness: (roadMakeup.granularAThickness || '').trim(),
      granularBThickness: (roadMakeup.granularBThickness || '').trim(),
    },
    ...auditUpdateFields(user),
  })
}

// sectionKey is 'sanitarySewers' or 'stormSewers'. Uses a
// computed property key so each section writes independently.
export async function saveSewer(jobId, sectionKey, sewerData, user) {
  const ref = doc(db, 'jobs', jobId)
  await updateDoc(ref, {
    [`details.${sectionKey}`]: {
      pipeEntries: sewerData.pipeEntries.map((e) => ({
        size: (e.size || '').trim(),
        material: (e.material || '').trim(),
        customMaterial: (e.customMaterial || '').trim(),
      })),
      bedding: (sewerData.bedding || '').trim(),
      beddingCustom: (sewerData.beddingCustom || '').trim(),
      cover: (sewerData.cover || '').trim(),
      coverCustom: (sewerData.coverCustom || '').trim(),
    },
    ...auditUpdateFields(user),
  })
}
