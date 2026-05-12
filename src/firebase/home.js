import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs
} from 'firebase/firestore'
import { db } from './firebase.js'
import { listJobs } from './jobs.js'

const dailyEntriesCollection = collection(db, 'dailyEntries')

// Cap on how many recent daily entries the home page pulls in a single
// query. Large enough to surface the most recent active jobs and any
// recent un-summarized days, small enough to avoid loading the full
// history every time the user opens the app.
const RECENT_ENTRIES_LIMIT = 100

// One global query for the company's most recently updated daily entries.
// Drives both "Continue Working" and "Missing Daily Summaries", so we
// only hit Firestore once per home-page load.
async function listRecentCompanyEntries(companyId) {
  const q = query(
    dailyEntriesCollection,
    where('companyId', '==', companyId),
    orderBy('updatedAt', 'desc'),
    limit(RECENT_ENTRIES_LIMIT)
  )
  const result = await getDocs(q)
  return result.docs.map((snap) => {
    const data = snap.data()
    return {
      id: snap.id,
      jobId: data.jobId,
      date: data.date,
      notes: typeof data.notes === 'string' ? data.notes : '',
      updatedAt: data.updatedAt,
      createdAt: data.createdAt
    }
  })
}

export async function loadHomeSummary(companyId) {
  const [jobs, entries] = await Promise.all([
    listJobs(companyId),
    listRecentCompanyEntries(companyId)
  ])

  const jobById = new Map(jobs.map((j) => [j.id, j]))

  // Recent jobs: entries are already ordered by updatedAt desc, so the
  // first occurrence of each jobId is its most-recent activity.
  const seen = new Set()
  const recentJobs = []
  for (const entry of entries) {
    if (!entry.jobId || seen.has(entry.jobId)) continue
    const job = jobById.get(entry.jobId)
    if (!job) continue
    seen.add(entry.jobId)
    recentJobs.push({ job, lastActivity: entry.updatedAt })
    if (recentJobs.length >= 3) break
  }

  // Missing summaries: a daily entry whose notes field is empty/whitespace.
  // Group by job and remember the most-recent missing entry so the card
  // can deep-link directly into its edit page.
  const missingMap = new Map()
  for (const entry of entries) {
    if (entry.notes && entry.notes.trim()) continue
    const prior = missingMap.get(entry.jobId)
    if (prior) {
      prior.count += 1
    } else {
      missingMap.set(entry.jobId, {
        count: 1,
        firstEntryId: entry.id,
        firstEntryDate: entry.date
      })
    }
  }

  const missingByJob = []
  for (const [jobId, info] of missingMap) {
    const job = jobById.get(jobId)
    if (!job) continue
    missingByJob.push({
      job,
      count: info.count,
      firstEntryId: info.firstEntryId,
      firstEntryDate: info.firstEntryDate
    })
  }

  missingByJob.sort(
    (a, b) =>
      b.count - a.count ||
      (a.job.jobName || '').localeCompare(b.job.jobName || '')
  )

  return { recentJobs, missingByJob }
}
