"use client";

import React, { useEffect } from "react";
import Sidebar from "../../components/Sidebar";
import { useSidebarStore } from "../../../lib/store/sidebarStore";
import dynamic from "next/dynamic";
import { Loader2, RefreshCcw, Download } from "lucide-react";

const MolStarViewer = dynamic(() => import("../../components/MolStarViewer"), { ssr: false })

export default function JobPage({ params }: { params: { id: string } }) {
  const { setActiveItem } = useSidebarStore()
  useEffect(() => { setActiveItem('Results') }, [setActiveItem])

  const [job, setJob] = React.useState<any | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [tree, setTree] = React.useState<any[]>([])
  const [treeLoading, setTreeLoading] = React.useState(false)
  const [selectedFile, setSelectedFile] = React.useState<{ path: string, content: string, size: number } | null>(null)
  const [showRaw, setShowRaw] = React.useState(false)
  const [backendUrl, setBackendUrl] = React.useState<string>(((typeof window !== 'undefined' && localStorage.getItem('backend_url')) || ''))
  const onDownloadAll = () => {
    const u = new URL(`/api/jobs/${params.id}/download`, window.location.origin)
    if (backendUrl) u.searchParams.set('backend', backendUrl)
    window.location.href = u.toString()
  }

  const load = async () => {
    try {
      setLoading(true)
      setError(null)
      const r = await fetch(`/api/jobs/${params.id}`, { method: 'GET', cache: 'no-store' })
      if (!r.ok) throw new Error()
      const d = await r.json()
      setJob(d)
    } catch {
      setError('Failed to load job.')
      setJob(null)
    } finally {
      setLoading(false)
      // Always refresh the tree along with job reloads and on initial mount
      loadTree()
    }
  }

  useEffect(() => { load() }, [params.id])

  const loadTree = async () => {
    try {
      setTreeLoading(true)
      const u = new URL(`/api/jobs/${params.id}/tree`, window.location.origin)
      if (backendUrl) u.searchParams.set('backend', backendUrl)
      const r = await fetch(u.toString(), { cache: 'no-store' })
      if (!r.ok) throw new Error()
      const d = await r.json()
      setTree(d.tree || [])
    } catch {
      setTree([])
    } finally {
      setTreeLoading(false)
    }
  }

  const statusBadge = (status?: string) => {
    if (!status) return null
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
    <div className="flex h-screen overflow-auto bg-[#FBFBFB]">
      <Sidebar />
      <main className="flex-1 m-2 overflow-auto rounded-2xl border border-neutral-200 bg-white">
        <div className="p-6 text-[#28282A]">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl font-semibold">Job Details</h1>
              <p className="text-sm text-[#777779] mt-1">ID: {params.id}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={load}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-sm font-medium text-[#28282A] hover:bg-neutral-50 active:bg-neutral-100 disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCcw className="h-4 w-4" />
                )}
                <span>Reload</span>
              </button>
            </div>
          </div>

          <div className="mt-4">
            {loading && <div className="text-sm text-[#777779]">Loading…</div>}
            {error && <div className="text-sm text-red-600">{error}</div>}
            {!loading && !error && job && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-base font-medium">{job.name || job.id}</div>
                  {statusBadge(job.status)}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="border rounded p-3">
                    <div className="text-xs text-[#777779]">Job Type</div>
                    <div className="text-sm font-medium">{job.job_type || '-'}</div>
                  </div>
                  <div className="border rounded p-3">
                    <div className="text-xs text-[#777779]">Created At</div>
                    <div className="text-sm font-medium">
                      {job.created_at ? new Date(job.created_at * 1000).toLocaleString() : '-'}
                    </div>
                  </div>
                  <div className="border rounded p-3">
                    <div className="text-xs text-[#777779]">Ligand</div>
                    <div className="text-sm font-medium break-all">{job.ligand || '-'}</div>
                  </div>
                  <div className="border rounded p-3">
                    <div className="text-xs text-[#777779]">Contigs</div>
                    <div className="text-sm font-medium break-all">{job.contigs || '-'}</div>
                  </div>
                </div>

                {job.pdb_data && (
                  <div className="border rounded p-3">
                    <div className="text-xs text-[#777779] mb-2">Input Structure</div>
                    <MolStarViewer pdbUrl={null} pdbText={job.pdb_data} setPDBdata={() => {}} RFconfiguration={{}} />
                  </div>
                )}

                {Array.isArray(job.active_site_atoms) && job.active_site_atoms.length > 0 && (
                  <div className="border rounded p-3">
                    <div className="text-xs text-[#777779] mb-2">Active Site Atoms</div>
                    <div className="space-y-1">
                      {job.active_site_atoms.map((b: any, i: number) => (
                        <div key={i} className="text-sm">
                          <span className="text-[#777779] mr-1">{b.residue}:</span>
                          <span className="font-medium">{b.atoms}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="border rounded p-3">
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-[#777779]">Log</div>
                        <button onClick={load} disabled={loading} className="text-xs px-2 py-1 border rounded hover:bg-neutral-50 disabled:opacity-50">Refresh</button>
                    </div>
                    <pre className="mt-2 rounded bg-neutral-50 p-3 text-xs overflow-auto max-h-72 whitespace-pre-wrap break-words">{job?.results?.log}</pre>
                  </div>

                  <div className="border rounded p-3">
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-[#777779]">Output Files</div>
                      <div className="flex items-center gap-2">
                        <button onClick={loadTree} disabled={treeLoading} className="text-xs px-2 py-1 border rounded hover:bg-neutral-50 disabled:opacity-50">Refresh</button>
                        <button onClick={onDownloadAll} className="p-1.5 border rounded hover:bg-neutral-50" aria-label="Download all" title="Download all"><Download className="h-4 w-4" /></button>
                      </div>
                    </div>
                    <div className="mt-2 max-h-72 overflow-auto text-sm">
                      {tree.length === 0 ? (
                        <div className="text-[#777779] text-xs">No files</div>
                      ) : (
                        <ul className="space-y-1">
                          {tree.map((n, idx) => (
                            <TreeNode key={idx} node={n} jobId={params.id} onOpenFile={setSelectedFile} backendUrl={backendUrl} />
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>

                {selectedFile && (
                  <div className="border rounded p-3">
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-[#777779]">Preview: {selectedFile.path}</div>
                      <button onClick={() => setSelectedFile(null)} className="text-xs px-2 py-1 border rounded hover:bg-neutral-50">Close</button>
                    </div>
                    {selectedFile.path.toLowerCase().endsWith('.pdb') ? (
                      <div className="mt-2"><MolStarViewer pdbUrl={null} pdbText={selectedFile.content} setPDBdata={() => {}} RFconfiguration={{}} /></div>
                    ) : (
                      <pre className="mt-2 rounded bg-neutral-50 p-3 text-xs overflow-auto max-h-96 whitespace-pre-wrap break-words">{selectedFile.content}</pre>
                    )}
                  </div>
                )}

                <div className="border rounded p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-[#777779]">Raw JSON</div>
                    <button
                      onClick={() => setShowRaw(v => !v)}
                      className="text-xs px-2 py-1 border rounded hover:bg-neutral-50"
                    >
                      {showRaw ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  {showRaw && (
                    <pre className="mt-2 rounded bg-neutral-50 p-3 text-xs overflow-auto">
{JSON.stringify(job, null, 2)}
                    </pre>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function TreeNode({ node, jobId, onOpenFile, backendUrl }: { node: any, jobId: string, onOpenFile: (f: { path: string, content: string, size: number }) => void, backendUrl?: string }) {
  const [expanded, setExpanded] = React.useState(false)
  const isDir = node.type === 'dir'
  const toggle = () => setExpanded(v => !v)

  const openFile = async () => {
    const u = new URL(`/api/jobs/${jobId}/file`, window.location.origin)
    u.searchParams.set('path', node.path)
    if (backendUrl) u.searchParams.set('backend', backendUrl)
    const r = await fetch(u.toString(), { cache: 'no-store' })
    if (!r.ok) return
    const d = await r.json()
    onOpenFile({ path: d.path, content: d.content, size: d.size })
  }

  const downloadItem = () => {
    const u = new URL(`/api/jobs/${jobId}/download`, window.location.origin)
    u.searchParams.set('path', node.path)
    if (backendUrl) u.searchParams.set('backend', backendUrl)
    window.location.href = u.toString()
  }

  return (
    <li>
      <div className={`flex items-center gap-2 ${isDir ? 'font-medium' : ''}`}>
        {isDir ? (
          <button onClick={toggle} className="text-left flex-1 hover:underline">
            {expanded ? '📂' : '📁'} {node.name}
          </button>
        ) : (
          <button onClick={openFile} className="text-left flex-1 hover:underline">
            📄 {node.name}
          </button>
        )}
        <button onClick={downloadItem} className="p-1.5 border rounded hover:bg-neutral-50" aria-label="Download" title="Download"><Download className="h-3.5 w-3.5" /></button>
      </div>
      {isDir && expanded && Array.isArray(node.children) && node.children.length > 0 && (
        <ul className="pl-4 mt-1 space-y-1">
          {node.children.map((c: any, i: number) => (
            <TreeNode key={i} node={c} jobId={jobId} onOpenFile={onOpenFile} backendUrl={backendUrl} />
          ))}
        </ul>
      )}
    </li>
  )
}


