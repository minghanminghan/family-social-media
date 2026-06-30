'use client'

import { useState } from 'react'

export default function TTSButton({ text }: { text: string }) {
  const [speaking, setSpeaking] = useState(false)

  function toggle() {
    if (!('speechSynthesis' in window)) return

    if (speaking) {
      window.speechSynthesis.cancel()
      setSpeaking(false)
      return
    }

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.onend = () => setSpeaking(false)
    utterance.onerror = () => setSpeaking(false)
    window.speechSynthesis.speak(utterance)
    setSpeaking(true)
  }

  if (!text.trim()) return null

  return (
    <button
      onClick={toggle}
      className="text-sm text-gray-400 hover:text-gray-700"
      title={speaking ? 'Stop' : 'Read aloud'}
    >
      {speaking ? '⏹' : '🔊'}
    </button>
  )
}
