"use client";

import React, { useEffect, useRef } from 'react'
import { createPluginUI } from 'molstar/lib/mol-plugin-ui'
import { renderReact18 } from 'molstar/lib/mol-plugin-ui/react18'
import 'molstar/lib/mol-plugin-ui/skin/light.scss'

export default function MolStarViewer({ pdbUrl, pdbText, setPDBdata, RFconfiguration }: { pdbUrl: string | null, pdbText?: string | null, setPDBdata: any, RFconfiguration: any }) {
  const parent = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let disposed = false
    let plugin: any
    let objectUrl: string | null = null
    async function init() {
      plugin = await createPluginUI({ target: parent.current!, render: renderReact18 })
      let urlToLoad: string | null = null
      if (pdbText) {
        objectUrl = URL.createObjectURL(new Blob([pdbText], { type: 'chemical/x-pdb' }))
        urlToLoad = objectUrl
      } else if (pdbUrl) {
        try {
          const res = await fetch(pdbUrl)
          const text = await res.text()
          if (!disposed) {
            // attach downloaded pdb into RFconfiguration
            setPDBdata({ ...RFconfiguration, pdbData: text })
          }
          objectUrl = URL.createObjectURL(new Blob([text], { type: 'chemical/x-pdb' }))
          urlToLoad = objectUrl
        } catch (e) {
          // fallback to letting Mol* fetch directly
          urlToLoad = pdbUrl
        }
      }
      if (urlToLoad) {
        const data = await plugin.builders.data.download({ url: urlToLoad }, { state: { isGhost: true } })
        const traj = await plugin.builders.structure.parseTrajectory(data, 'pdb')
        await plugin.builders.structure.hierarchy.applyPreset(traj, 'default')
      }
    }
    init()
    return () => { try { disposed = true; plugin?.dispose?.() } catch {} finally { if (objectUrl) URL.revokeObjectURL(objectUrl) } }
  }, [pdbUrl, pdbText])

  return <div ref={parent} style={{ width: '100%', height: 500, position: 'relative', overflow: 'hidden' }} />
}


