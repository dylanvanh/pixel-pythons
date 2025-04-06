'use client'

import { useEffect } from "react"

export const ConnectButton = () => {
  useEffect(() => {
    // This empty effect helps ensure the component is fully mounted
    // before AppKit tries to render its custom elements
  }, [])

  return (
    <div className="inline-block">
      {/* Custom element from AppKit web component */}
      <appkit-button />
    </div>
  )
}
