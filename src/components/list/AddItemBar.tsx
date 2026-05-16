'use client'

import { Plus } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

interface AddItemBarProps {
  onAdd: (name: string) => void | Promise<void>
}

export function AddItemBar({ onAdd }: AddItemBarProps) {
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [keyboardOffset, setKeyboardOffset] = useState(0)

  // Visual Viewport API: lift the add bar above the on-screen keyboard on iOS.
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    function update() {
      if (!vv) return
      const offset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop)
      setKeyboardOffset(offset)
    }
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    update()
    return () => {
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
    }
  }, [])

  async function commit() {
    const trimmed = value.trim()
    if (!trimmed) return
    setValue('')
    // Optimistic clear keeps the input snappy for rapid-fire entry.
    try {
      await onAdd(trimmed)
    } finally {
      // Refocus so the user can keep typing the next item.
      inputRef.current?.focus()
    }
  }

  return (
    <div
      ref={wrapperRef}
      className="bg-bg-surface/95 border-border-default/60 sticky bottom-0 z-20 border-t backdrop-blur"
      style={{
        transform: keyboardOffset > 0 ? `translateY(-${keyboardOffset}px)` : undefined,
        transition: 'transform 150ms cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault()
          void commit()
        }}
        className="flex items-center gap-2 px-4 py-3"
      >
        <input
          ref={inputRef}
          type="text"
          inputMode="text"
          enterKeyHint="done"
          autoComplete="off"
          autoCorrect="on"
          autoCapitalize="sentences"
          maxLength={200}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Add an item…"
          aria-label="Add an item"
          className="bg-bg-base border-border-default text-text-primary placeholder:text-text-secondary focus-visible:outline-accent block min-h-[44px] w-full rounded-xl border px-4 text-[16px] leading-relaxed focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2"
        />
        <button
          type="submit"
          aria-label="Add item"
          disabled={!value.trim()}
          className="bg-accent flex h-11 min-w-11 items-center justify-center rounded-[14px] px-3 text-white transition-opacity duration-150 disabled:opacity-50"
        >
          <Plus size={20} strokeWidth={2} aria-hidden />
        </button>
      </form>
    </div>
  )
}

export default AddItemBar
