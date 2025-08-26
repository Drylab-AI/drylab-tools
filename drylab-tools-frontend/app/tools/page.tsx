"use client";

import React, { useEffect } from "react";
import { Trash2 } from "lucide-react";
import { useSidebarStore } from "../../lib/store/sidebarStore";
import Sidebar from "../components/Sidebar";
import dynamic from 'next/dynamic'
const MolStarViewer = dynamic(() => import('../components/MolStarViewer'), { ssr: false })

export default function Page() {
  const { setActiveItem } = useSidebarStore();
  useEffect(() => { setActiveItem('Tools') }, [setActiveItem])
  const [RFconfiguration, setRFconfiguration] = React.useState({
    job_name: '',
    job_type: 'RFdiffusion2',
    ligand: '',
    pdbData: '',
    contigs: '',
    active_site_atoms: [],
  })
  
  
  const [pdbCode, setPdbCode] = React.useState('')
  const [backendUrl, setBackendUrl] = React.useState<string>(((typeof window !== 'undefined' && localStorage.getItem('backend_url')) || ''))
  const [jobId, setJobId] = React.useState<string|undefined>()
  const router = require('next/navigation').useRouter?.() || null
  const [viewingPdb, setViewingPdb] = React.useState<boolean>(false)
  const fileInputRef = React.useRef<HTMLInputElement | null>(null)

  const addBlock = () => setRFconfiguration({ ...RFconfiguration, active_site_atoms: [...RFconfiguration.active_site_atoms, { residue: '', atoms: '' }] })
  const deleteBlock = (idx: number) => setRFconfiguration({ ...RFconfiguration, active_site_atoms: RFconfiguration.active_site_atoms.filter((_, i) => i !== idx) })
  
  const updateBlock = (idx: number, field: 'residue'|'atoms', value: string) =>
    setRFconfiguration({ ...RFconfiguration, active_site_atoms: RFconfiguration.active_site_atoms.map((x, i) => (i === idx ? { ...x, [field]: value } : x)) })

  const fetchPdb = async () => {
    setRFconfiguration({ ...RFconfiguration, pdbData: '' })
    setViewingPdb(true)
  }

  const onDropPdb: React.DragEventHandler<HTMLDivElement> = async (e) => {
    e.preventDefault()
    const f = e.dataTransfer.files && e.dataTransfer.files[0]
    if (!f) return
    const text = await f.text()
    setRFconfiguration({ ...RFconfiguration, pdbData: text })
    setPdbCode('')
    setViewingPdb(true)
  }

  const clearPdb = () => {
    setRFconfiguration({ ...RFconfiguration, pdbData: '' })
    setPdbCode('')
    setViewingPdb(false)
  }

  const submitJob = async () => {
    const payload = {
      job_name: RFconfiguration.job_name,
      job_type: 'RFdiffusion2',
      ligand: RFconfiguration.ligand,
      pdb_data: RFconfiguration.pdbData,
      contigs: RFconfiguration.contigs,
      active_site_atoms: RFconfiguration.active_site_atoms,
    }
    console.log(payload)
    const u = new URL('/api/jobs', window.location.origin)
    if (backendUrl) u.searchParams.set('backend', backendUrl)
    const resp = await fetch(u.toString(), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) })
    const data = await resp.json()
    setJobId(data.id)
    if (router && data?.id) {
      const url = new URL(`/results/${data.id}`, window.location.origin)
      if (backendUrl) url.searchParams.set('backend', backendUrl)
      router.push(url.pathname + url.search)
    }
  }
  return (
    <div className="flex h-screen overflow-hidden bg-[#FBFBFB]">
    <Sidebar />
    <div className="box-border flex flex-col gap-8 items-center px-2.5 py-5 w-full h-full overflow-auto">
      {/* Header */}
      <div className="flex flex-col gap-2 w-[910px]">
        <h1 className="text-[24px] font-medium text-black">RFdiffusion2</h1>
        <p className="text-[16px] text-[#484646] tracking-[0.5px]">
          In in-silico Motif Enzyme benchmarking spannign EC 1-5, produced at least one success for 41/41 cases vs 16/41 for prior RFdiffusion
        </p>
      </div>

      {/* Backend URL + Job name */}
      <div className="flex flex-col gap-2 w-[910px]">
        <div className="text-[12px] text-black font-medium tracking-[0.4px]">Backend URL (optional)</div>
        <input value={backendUrl} onChange={(e) => { setBackendUrl(e.target.value); if (typeof window !== 'undefined') localStorage.setItem('backend_url', e.target.value) }} placeholder="http://127.0.0.1:8001" className="h-[38px] rounded-[4px] border border-[#acacac] px-3 text-[14px] text-[#777779]" />
      </div>
      <div className="flex flex-col gap-2 w-[910px]">
        <div className="text-[12px] text-black font-medium tracking-[0.4px]">Job name</div>
        <input value={RFconfiguration.job_name} onChange={(e) => setRFconfiguration({ ...RFconfiguration, job_name: e.target.value })} placeholder="Enter Job Name" className="h-[38px] rounded-[4px] border border-[#acacac] px-3 text-[14px] text-[#777779]" />
      </div>

      {/* Protein structure row */}
      <div className="flex flex-col gap-2 w-[910px]">
        <div className="text-[12px] text-black font-medium tracking-[0.4px]">Protein structure</div>
        <div className="flex gap-2 w-full">
          <div className="w-[203px] h-[60px] rounded-[8px] border border-[#acacac] flex items-center justify-between px-3 text-[14px] text-[#777779]">
            PDB
          </div>
          <div
            className="h-[60px] rounded-[8px] border border-[#acacac] flex items-center justify-between grow pl-3 pr-1 py-1 gap-2"
            onDragOver={(e) => { e.preventDefault() }}
            onDrop={onDropPdb}
            title="Drop a .pdb file here or use PDB code"
          >
            <input value={pdbCode} onChange={(e) => setPdbCode(e.target.value)} placeholder="Enter PDB Code" className="text-[14px] text-[#171c1f] bg-transparent outline-none w-full pr-24" />
            <button onClick={fetchPdb} className="h-full rounded-[4px] border border-[#dedede] bg-white px-4 text-[14px] font-medium text-[#28282a]">Fetch PDB</button>
            <input ref={fileInputRef} type="file" accept=".pdb,.ent,.txt,.cif,.mmcif" className="hidden" onChange={async (e) => {
              const f = e.target.files && e.target.files[0]
              if (!f) return
              const text = await f.text()
              setRFconfiguration({ ...RFconfiguration, pdbData: text })
              setPdbCode('')
              setViewingPdb(true)
              // reset input so selecting same file again triggers change
              // e.currentTarget.value = ''
            }} />
            <button type="button" onClick={() => fileInputRef.current?.click()} className="h-full rounded-[4px] border border-[#dedede] bg-white px-4 text-[14px] font-medium text-[#28282a]">Upload PDB</button>
          </div>
        </div>
      </div>

      {/* Figure */}
      <div className="w-[910px]">
        {
          viewingPdb && (
            <>
              <div className="bg-neutral-100 rounded-t-[8px] w-full px-4 py-1 flex items-center justify-between">
                <div className="text-[14px] font-medium text-[#28282a]">PDB loaded</div>
                <button onClick={clearPdb} className="h-7 px-3 rounded-[6px] border border-[#dedede] bg-white text-[12px] font-medium text-[#28282a]">Remove</button>
              </div>
              <div className="border border-[#c2cddc] rounded-b-[8px]">
                <MolStarViewer setPDBdata={setRFconfiguration} pdbUrl={RFconfiguration.pdbData ? null : (pdbCode ? `https://files.rcsb.org/download/${pdbCode}.pdb` : null)} pdbText={RFconfiguration.pdbData || undefined} RFconfiguration={RFconfiguration} />
              </div>
            </>
          )
        }
      </div>

      {/* Frame 6702-50581: Ligand Code + Contigs */}
      <div className="flex flex-col gap-8 w-[910px]">
        <div className="flex flex-col gap-2">
          <div className="text-[12px] text-black font-medium tracking-[0.4px]">Ligand Code</div>
          <input value={RFconfiguration.ligand} onChange={(e) => setRFconfiguration({ ...RFconfiguration, ligand: e.target.value })} className="h-[38px] rounded-[8px] border border-[#acacac] px-3 text-[14px] text-[#171c1f] bg-transparent outline-none" placeholder="Enter ligand code (e.g., NAD)" />
        </div>
        <div className="flex flex-col gap-2">
          <div className="text-[12px] text-black font-medium tracking-[0.4px]">Contigs</div>
          <div className="text-[12px] text-[#777779]">
            Specify residues in your active site with chain and number (ex. A106-106), and desired scaffold length between each residue (ex. 46)
          </div>
          <input value={RFconfiguration.contigs} onChange={(e) => setRFconfiguration({ ...RFconfiguration, contigs: e.target.value })} className="h-[38px] rounded-[4px] border border-[#e7e7e7] px-3 text-[14px] text-[#171c1f]" />
        </div>
      </div>

      {/* Frame 6702-50594: Active Site Atoms blocks */}
      <div className="flex flex-col gap-6 w-[910px]">
        <div className="text-[16px] font-medium tracking-[0.5px] text-black">Active Site Atoms</div>

        {RFconfiguration.active_site_atoms.map((blk, idx) => (
          <div key={idx} className="p-5 rounded-[12px] border border-[#dedede] flex flex-row">
            <div className="flex flex-row w-[910px]">
              <div className="flex flex-col gap-6 w-[840px]">
                <div className="flex gap-5 w-full">
                  <div className="w-[195px] text-[12px]">
                    <div className="text-black font-medium">Residue of active site</div>
                    <div className="text-[#777779]">Residue to select active site atoms on (chain and number ex. A106)</div>
                  </div>
                  <input value={blk.residue} onChange={(e) => updateBlock(idx, 'residue', e.target.value)} className="grow h-[38px] rounded-[4px] border border-[#e7e7e7] px-3 bg-transparent outline-none text-[14px] text-[#171c1f]" />
                </div>
                <div className="flex gap-5 w-full">
                  <div className="w-[195px] text-[12px]">
                    <div className="text-black font-medium">Active Site Atoms</div>
                    <div className="text-[#777779]">Comma separated atoms (ex. 'NE2,CD2,CE1')</div>
                  </div>
                  <input value={blk.atoms} onChange={(e) => updateBlock(idx, 'atoms', e.target.value)} className="grow h-[38px] rounded-[4px] border border-[#e7e7e7] px-3 bg-transparent outline-none text-[14px] text-[#171c1f]" />
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => deleteBlock(idx)}
              className="inline-flex items-center gap-1 text-red-600 hover:text-red-700 text-sm"
              aria-label="Delete block"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Frame 6702-50656: Footer controls */}
      <div className="flex items-start justify-between w-[910px]">
        <div className="flex gap-3 w-[418px]">
          <button onClick={addBlock} className="h-8 rounded-full border border-[#dedede] bg-white px-4 text-[14px] font-medium text-[#28282a]">Add</button>
          <button onClick={() => {
            setRFconfiguration({
              job_name: `Example Run ${crypto.randomUUID()}`,
              job_type: 'RFdiffusion2',
              ligand: 'NAD',
              pdbData: '',
              contigs: '46,A106-106,59,A166-166,2,A169-169,23,A193-193,46',
              active_site_atoms: [{ residue: 'A106', atoms: 'NE,CD,CZ' }, { residue: 'A166', atoms: 'OD1,CG'}, { residue: 'A169', atoms: 'NH2,CZ'}, { residue: 'A193', atoms: 'NE2,CD2,CE1' }],
            })
            setPdbCode('3PTB')
            setViewingPdb(true)
          }} className="h-8 rounded-full border border-[#dedede] bg-white px-4 text-[14px] font-medium text-[#28282a]">Load example</button>
          <button onClick={async () => { await submitJob(); setRFconfiguration({
              job_name: '',
              job_type: 'RFdiffusion2',
              ligand: '',
              pdbData: '',
              contigs: '',
              active_site_atoms: [],
            }); setPdbCode(''); setViewingPdb(false); }} className="h-8 rounded-full border border-[#009d51] bg-[#009d51] px-4 text-[14px] font-medium text-white">Submit job</button>
        </div>
        <div className="text-[12px] text-[#777779]">{jobId ? `Submitted: ${jobId}` : 'Submit 1 job'}</div>
        </div>
      </div>
    </div>
  );
}

