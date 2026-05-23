'use client'

import { Check, MoreVertical, Plus, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Sheet } from '@/components/ui/Sheet'
import { useActiveList } from '@/hooks/useActiveList'
import { useListCrud, LIST_NAME_MAX_LENGTH } from '@/hooks/useListCrud'
import { useSession } from '@/hooks/useSession'
import { useHousehold } from '@/hooks/useHousehold'
import type { ListSummary } from '@/store/householdStore'

interface ListSwitcherSheetProps {
  open: boolean
  onClose: () => void
  onError: (message: string) => void
}

type RowMode = { kind: 'rename' } | { kind: 'confirm-delete' } | null

export function ListSwitcherSheet({ open, onClose, onError }: ListSwitcherSheetProps) {
  const { lists, activeListId, setActiveList } = useActiveList()
  const { createList, renameList, deleteList, isPending } = useListCrud()
  const { userId } = useSession()
  const { members } = useHousehold()

  const [openRow, setOpenRow] = useState<{ id: string; mode: RowMode } | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [newListName, setNewListName] = useState('')
  const [creating, setCreating] = useState(false)

  // No reset-on-open effect — the parent (ListSwitcherTrigger) mounts this
  // component only while `open` is true, so closing tears down state for free
  // and the next open starts fresh.

  const isOwner = userId ? members.find((m) => m.userId === userId)?.role === 'owner' : false

  function canDelete(list: ListSummary): boolean {
    if (lists.length <= 1) return false
    if (isOwner) return true
    return list.createdBy !== null && list.createdBy === userId
  }

  function handleSwitch(id: string) {
    if (id !== activeListId) {
      setActiveList(id)
    }
    onClose()
  }

  function startRename(list: ListSummary) {
    setRenameValue(list.name)
    setOpenRow({ id: list.id, mode: { kind: 'rename' } })
  }

  function startDelete(list: ListSummary) {
    setOpenRow({ id: list.id, mode: { kind: 'confirm-delete' } })
  }

  function dismissRow() {
    setOpenRow(null)
    setRenameValue('')
  }

  async function submitRename(list: ListSummary) {
    const result = await renameList(list.id, renameValue)
    if (!result.ok) {
      onError(result.error)
      return
    }
    dismissRow()
  }

  async function submitDelete(list: ListSummary) {
    const result = await deleteList(list.id)
    if (!result.ok) {
      onError(result.error)
      return
    }
    dismissRow()
  }

  async function submitCreate() {
    if (creating) return
    setCreating(true)
    const result = await createList(newListName)
    setCreating(false)
    if (!result.ok) {
      onError(result.error)
      return
    }
    setNewListName('')
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title="Lists">
      <ul className="-mx-1 mb-4 flex flex-col gap-1" role="list">
        {lists.map((list) => {
          const isActive = list.id === activeListId
          const row = openRow?.id === list.id ? openRow.mode : null
          const deletable = canDelete(list)

          if (row?.kind === 'rename') {
            return (
              <li key={list.id} className="px-1">
                <div className="border-border-default flex flex-col gap-2 rounded-xl border p-3">
                  <Input
                    aria-label="List name"
                    autoFocus
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    maxLength={LIST_NAME_MAX_LENGTH}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        void submitRename(list)
                      }
                    }}
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={() => void submitRename(list)}
                      disabled={isPending || renameValue.trim().length === 0}
                      variant="primary"
                    >
                      Save
                    </Button>
                    <Button onClick={dismissRow} variant="ghost" disabled={isPending}>
                      Cancel
                    </Button>
                  </div>
                </div>
              </li>
            )
          }

          if (row?.kind === 'confirm-delete') {
            return (
              <li key={list.id} className="px-1">
                <div className="border-destructive/40 flex flex-col gap-2 rounded-xl border p-3">
                  <p className="text-text-primary text-[14px] leading-relaxed">
                    Delete <span className="font-semibold">{list.name}</span>? All items in this
                    list will be removed.
                  </p>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => void submitDelete(list)}
                      disabled={isPending}
                      variant="destructive"
                    >
                      Delete
                    </Button>
                    <Button onClick={dismissRow} variant="ghost" disabled={isPending}>
                      Cancel
                    </Button>
                  </div>
                </div>
              </li>
            )
          }

          return (
            <li key={list.id} className="px-1">
              <div className="flex items-stretch gap-1">
                <button
                  type="button"
                  onClick={() => handleSwitch(list.id)}
                  className={`flex min-h-[48px] flex-1 items-center gap-3 rounded-xl px-3 text-left transition-colors duration-150 ${
                    isActive
                      ? 'bg-accent/10 text-text-primary'
                      : 'text-text-primary hover:bg-[#EEEDE8] dark:hover:bg-[#2E2E30]'
                  }`}
                  aria-current={isActive ? 'true' : undefined}
                >
                  <span
                    aria-hidden
                    className={`flex h-5 w-5 shrink-0 items-center justify-center ${
                      isActive ? 'text-accent' : 'text-transparent'
                    }`}
                  >
                    <Check size={18} strokeWidth={1.5} />
                  </span>
                  <span className="truncate text-[16px] leading-relaxed">{list.name}</span>
                </button>
                <RowMenu
                  list={list}
                  deletable={deletable}
                  onRename={() => startRename(list)}
                  onDelete={() => startDelete(list)}
                />
              </div>
            </li>
          )
        })}
      </ul>

      <div className="border-border-default/60 flex flex-col gap-2 border-t pt-4">
        <label
          htmlFor="new-list-name"
          className="text-text-primary text-[13px] leading-snug font-medium"
        >
          New list
        </label>
        <div className="flex gap-2">
          <Input
            id="new-list-name"
            value={newListName}
            onChange={(e) => setNewListName(e.target.value)}
            placeholder="e.g. Costco Run"
            maxLength={LIST_NAME_MAX_LENGTH}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newListName.trim().length > 0) {
                e.preventDefault()
                void submitCreate()
              }
            }}
          />
          <Button
            onClick={() => void submitCreate()}
            disabled={creating || newListName.trim().length === 0}
            variant="primary"
            aria-label="Create list"
          >
            <Plus size={18} strokeWidth={1.5} aria-hidden />
          </Button>
        </div>
      </div>
    </Sheet>
  )
}

interface RowMenuProps {
  list: ListSummary
  deletable: boolean
  onRename: () => void
  onDelete: () => void
}

function RowMenu({ list, deletable, onRename, onDelete }: RowMenuProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Close on outside click — keeps the menu simple without needing a full
  // popover primitive. Sheet already handles Escape via the parent dialog.
  useEffect(() => {
    if (!open) return
    function onDocClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Options for ${list.name}`}
        aria-haspopup="menu"
        aria-expanded={open}
        className="text-text-secondary hover:bg-bg-base flex h-12 w-12 items-center justify-center rounded-xl transition-colors duration-150"
      >
        <MoreVertical size={20} strokeWidth={1.5} aria-hidden />
      </button>
      {open ? (
        <div
          role="menu"
          className="bg-bg-surface border-border-default absolute top-12 right-0 z-10 flex w-40 flex-col rounded-xl border p-1 shadow-lg"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false)
              onRename()
            }}
            className="text-text-primary flex min-h-[40px] items-center gap-2 rounded-lg px-3 text-left text-[14px] leading-relaxed hover:bg-[#EEEDE8] dark:hover:bg-[#2E2E30]"
          >
            Rename
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false)
              onDelete()
            }}
            disabled={!deletable}
            className="text-destructive flex min-h-[40px] items-center gap-2 rounded-lg px-3 text-left text-[14px] leading-relaxed hover:bg-[#EEEDE8] disabled:opacity-40 dark:hover:bg-[#2E2E30]"
          >
            <Trash2 size={16} strokeWidth={1.5} aria-hidden />
            Delete
          </button>
        </div>
      ) : null}
    </div>
  )
}

export default ListSwitcherSheet
