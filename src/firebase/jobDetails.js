import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { db } from './firebase.js'
import { auditUpdateFields } from './audit.js'

// Road makeup defaults for jobs that have never had details set.
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

// Returns { roadMakeup } or null if the job document doesn't exist.
export async function getJobDetails(jobId) {
  const ref = doc(db, 'jobs', jobId)
  const snapshot = await getDoc(ref)
  if (!snapshot.exists()) return null
  const data = snapshot.data()
  return {
    roadMakeup: mapRoadMakeup(data?.details?.roadMakeup),
  }
}

// Writes only the roadMakeup section so future detail sections on the same
// job document are never overwritten by this call.
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
