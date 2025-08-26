"use client";

import React, { useEffect } from "react";
import Sidebar from "../components/Sidebar";
import { useSidebarStore } from "../../lib/store/sidebarStore";
import { Loader2, RefreshCcw } from "lucide-react";
import { useRouter } from "next/navigation";

export default function ResultsPage() {
  const router = useRouter()
  const { setActiveItem } = useSidebarStore()
  useEffect(() => { setActiveItem('Results') }, [setActiveItem])
  const [jobs, setJobs] = React.useState<any[]>([])
  const [backendUrl, setBackendUrl] = React.useState<string>(((typeof window !== 'undefined' && localStorage.getItem('backend_url')) || ''))
  const [loadingList, setLoadingList] = React.useState(false)

  const load = async () => {
    try {
      setLoadingList(true)
      const u = new URL('/api/jobs/list', window.location.origin)
      if (backendUrl) u.searchParams.set('backend', backendUrl)
      const r = await fetch(u.toString(), { method: 'GET', cache: 'no-store' })
      if (!r.ok) throw new Error()
      const d = await r.json()
      const arr = Array.isArray(d.jobs) ? d.jobs.slice() : []
      arr.sort((a: any, b: any) => (b.created_at || 0) - (a.created_at || 0))
      setJobs(arr)
    } catch {
      setJobs([])
    } finally {
      setLoadingList(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const openDetails = (job: any) => {
    const url = new URL(`/results/${job.id}`, window.location.origin)
    if (backendUrl) url.searchParams.set('backend', backendUrl)
    router.push(url.pathname + url.search)
  }

  const statusBadge = (status: string) => {
    const isFinished = status === 'finished' || status === 'completed' || status === 'success'
    const isRunning = status === 'running' || status === 'in_progress' || status === 'queued'
    const cls = isFinished
      ? 'bg-green-50 text-green-700 border-green-200'
      : isRunning
        ? 'bg-amber-50 text-amber-700 border-amber-200'
        : 'bg-neutral-100 text-neutral-700 border-neutral-200'
    return (
      <span className={`inline-flex items-center rounded-full border px-2 py-1 text-xs font-medium ${cls}`}>
        {status}
      </span>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#FBFBFB]">
      <Sidebar />
      <main className="flex-1 m-2 overflow-hidden rounded-2xl border border-neutral-200 bg-white">
        <div className="p-6 text-[#28282A]">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl font-semibold">Results</h1>
              <p className="text-sm text-[#777779] mt-1">Running and finished jobs</p>
            </div>
            <div className="flex items-center gap-2">
              <input value={backendUrl} onChange={(e) => { setBackendUrl(e.target.value); if (typeof window !== 'undefined') localStorage.setItem('backend_url', e.target.value) }} placeholder="Backend URL" className="h-[32px] rounded-md border border-neutral-200 px-2 text-[12px] text-[#777779]" />
            <button
              onClick={load}
              disabled={loadingList}
              className="inline-flex items-center gap-2 rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-sm font-medium text-[#28282A] hover:bg-neutral-50 active:bg-neutral-100 disabled:opacity-50"
              aria-label="Reload jobs"
            >
              {loadingList ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCcw className="h-4 w-4" />
              )}
              <span>Reload</span>
            </button>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {jobs.length === 0 ? (
              <div className="text-sm text-[#777779]">No jobs yet</div>
            ) : (
              jobs.map(j => (
                <div
                  key={j.id}
                  className="border rounded p-3 flex items-center justify-between hover:bg-neutral-50 cursor-pointer"
                  onClick={() => openDetails(j)}
                >
                  <div>
                    <div className="text-sm font-medium">{j.name || j.id}</div>
                  </div>
                  <div>
                    {statusBadge(j.status)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}