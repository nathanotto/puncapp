'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { normalizeJoin } from '@/lib/supabase/utils'
import { formatDistanceToNow } from 'date-fns'

interface User {
  id: string
  name: string | null
  username: string | null
}

interface Message {
  id: string
  message_text: string
  created_at: string
  updated_at: string
  edited: boolean
  user_id: string
  users: User | null
}

interface ChapterMessagesClientProps {
  chapterId: string
  chapterName: string
  currentUserId: string
  isLeader: boolean
  initialMessages: Message[]
}

export function ChapterMessagesClient({
  chapterId,
  chapterName,
  currentUserId,
  isLeader,
  initialMessages,
}: ChapterMessagesClientProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [newMessage, setNewMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [showLoadMore, setShowLoadMore] = useState(initialMessages.length === 20)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  // Set up real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel(`chapter_messages:${chapterId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chapter_messages',
          filter: `chapter_id=eq.${chapterId}`,
        },
        async (payload) => {
          console.log('[Realtime] Received event:', payload.eventType, payload)

          if (payload.eventType === 'INSERT') {
            // Fetch the new message with user data
            const { data } = await supabase
              .from('chapter_messages')
              .select(`
                id,
                message_text,
                created_at,
                updated_at,
                edited,
                user_id,
                users!chapter_messages_user_id_fkey(id, name, username)
              `)
              .eq('id', payload.new.id)
              .single()

            if (data) {
              // Normalize the joined users field
              const normalizedData = {
                ...data,
                users: normalizeJoin(data.users)
              }
              setMessages((prev) => {
                // Avoid duplicates
                if (prev.some(msg => msg.id === normalizedData.id)) {
                  return prev
                }
                return [normalizedData, ...prev]
              })
            }
          } else if (payload.eventType === 'UPDATE') {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === payload.new.id
                  ? { ...msg, message_text: payload.new.message_text, updated_at: payload.new.updated_at, edited: payload.new.edited }
                  : msg
              )
            )
          } else if (payload.eventType === 'DELETE') {
            setMessages((prev) => prev.filter((msg) => msg.id !== payload.old.id))
          }
        }
      )
      .subscribe((status) => {
        console.log('[Realtime] Subscription status:', status)
      })

    return () => {
      console.log('[Realtime] Unsubscribing')
      supabase.removeChannel(channel)
    }
  }, [chapterId, supabase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || isSubmitting) return

    setIsSubmitting(true)
    try {
      const { error } = await supabase
        .from('chapter_messages')
        .insert({
          chapter_id: chapterId,
          user_id: currentUserId,
          message_text: newMessage.trim(),
        })

      if (error) throw error

      setNewMessage('')
    } catch (error) {
      console.error('Error sending message:', error)
      alert('Failed to send message')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = async (messageId: string) => {
    if (!editText.trim()) return

    try {
      const { error } = await supabase
        .from('chapter_messages')
        .update({
          message_text: editText.trim(),
          edited: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', messageId)

      if (error) throw error

      setEditingId(null)
      setEditText('')
    } catch (error) {
      console.error('Error editing message:', error)
      alert('Failed to edit message')
    }
  }

  const handleDelete = async (messageId: string) => {
    if (!confirm('Are you sure you want to delete this message?')) return

    try {
      const { error } = await supabase
        .from('chapter_messages')
        .delete()
        .eq('id', messageId)

      if (error) throw error
    } catch (error) {
      console.error('Error deleting message:', error)
      alert('Failed to delete message')
    }
  }

  const startEdit = (message: Message) => {
    setEditingId(message.id)
    setEditText(message.message_text)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditText('')
  }

  const canEditOrDelete = (message: Message) => {
    if (isLeader) return true
    if (message.user_id !== currentUserId) return false
    const messageAge = Date.now() - new Date(message.created_at).getTime()
    return messageAge < 24 * 60 * 60 * 1000 // 24 hours in milliseconds
  }

  const canEdit = (message: Message) => {
    if (message.user_id !== currentUserId) return false
    const messageAge = Date.now() - new Date(message.created_at).getTime()
    return messageAge < 24 * 60 * 60 * 1000
  }

  const loadMoreMessages = async () => {
    setIsLoadingMore(true)
    try {
      const oldestMessage = messages[messages.length - 1]
      const { data } = await supabase
        .from('chapter_messages')
        .select(`
          id,
          message_text,
          created_at,
          updated_at,
          edited,
          user_id,
          users!chapter_messages_user_id_fkey(id, name, username)
        `)
        .eq('chapter_id', chapterId)
        .lt('created_at', oldestMessage.created_at)
        .order('created_at', { ascending: false })
        .limit(20)

      if (data) {
        // Normalize the joined users field for each message
        const normalizedData = data.map(msg => ({
          ...msg,
          users: normalizeJoin(msg.users)
        }))
        setMessages((prev) => [...prev, ...normalizedData])
        setShowLoadMore(data.length === 20)
      }
    } catch (error) {
      console.error('Error loading more messages:', error)
    } finally {
      setIsLoadingMore(false)
    }
  }

  const formatRelativeTime = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true })
    } catch {
      return 'recently'
    }
  }

  const getUserDisplayName = (message: Message) => {
    return message.users?.name || message.users?.username || 'Anonymous'
  }

  const charCount = newMessage.length
  const charLimit = 500
  const isOverLimit = charCount > charLimit

  return (
    <div className="min-h-screen bg-warm-cream p-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-earth-brown">
            {chapterName} - Messages
          </h1>
        </div>

        {/* New Message Form */}
        <div className="bg-white rounded-lg shadow p-3 mb-4">
          <form onSubmit={handleSubmit}>
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Write a message..."
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-burnt-orange resize-none text-sm"
              disabled={isSubmitting}
            />
            <div className="flex items-center justify-between mt-2">
              <span className={`text-xs ${isOverLimit ? 'text-red-600 font-semibold' : 'text-stone-gray'}`}>
                {charCount} / {charLimit}
              </span>
              <button
                type="submit"
                disabled={isSubmitting || !newMessage.trim() || isOverLimit}
                className="px-4 py-1.5 bg-burnt-orange text-white rounded-lg text-sm font-semibold hover:bg-deep-charcoal disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Sending...' : 'Send'}
              </button>
            </div>
          </form>
        </div>

        {/* Messages List */}
        <div className="space-y-2">
          {messages.length === 0 && (
            <div className="bg-white rounded-lg shadow p-6 text-center text-stone-gray text-sm">
              No messages yet. Be the first to post!
            </div>
          )}

          {messages.map((message) => {
            const isOwnMessage = message.user_id === currentUserId
            return (
              <div
                key={message.id}
                className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`${isOwnMessage ? 'ml-12' : 'mr-12'} max-w-[80%]`}>
                  {/* Message Bubble */}
                  <div
                    className={`rounded-2xl px-3 py-2 ${
                      isOwnMessage
                        ? 'bg-blue-100 rounded-br-sm'
                        : 'bg-gray-100 rounded-bl-sm'
                    }`}
                  >
                    {/* Header - Name, Time, Actions */}
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-semibold text-earth-brown">
                          {isOwnMessage ? 'You' : getUserDisplayName(message)}
                        </span>
                        <span className="text-stone-gray">
                          {formatRelativeTime(message.created_at)}
                        </span>
                        {message.edited && (
                          <span className="text-stone-gray italic">
                            (edited)
                          </span>
                        )}
                      </div>

                      {/* Action Links */}
                      {canEditOrDelete(message) && (
                        <div className="flex gap-2 text-xs">
                          {canEdit(message) && (
                            <button
                              onClick={() => startEdit(message)}
                              className="text-blue-600 hover:text-blue-800 hover:underline"
                            >
                              edit
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(message.id)}
                            className="text-red-600 hover:text-red-800 hover:underline"
                          >
                            delete
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Message Content */}
                    <p className="text-sm text-earth-brown whitespace-pre-wrap break-words">
                      {message.message_text}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}

          {/* Load More Button */}
          {showLoadMore && (
            <div className="text-center pt-2">
              <button
                onClick={loadMoreMessages}
                disabled={isLoadingMore}
                className="text-sm text-burnt-orange hover:text-deep-charcoal font-semibold disabled:opacity-50"
              >
                {isLoadingMore ? 'Loading...' : 'Load More Messages'}
              </button>
            </div>
          )}
        </div>

        <div ref={messagesEndRef} />
      </div>

      {/* Edit Modal */}
      {editingId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-4">
            <h3 className="text-lg font-bold text-earth-brown mb-3">Edit Message</h3>
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-burnt-orange resize-none mb-2"
              rows={4}
              autoFocus
            />
            <div className="flex items-center justify-between mb-3">
              <span className={`text-xs ${editText.length > 500 ? 'text-red-600 font-semibold' : 'text-stone-gray'}`}>
                {editText.length} / 500
              </span>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={cancelEdit}
                className="px-4 py-2 text-sm text-stone-gray hover:text-earth-brown"
              >
                Cancel
              </button>
              <button
                onClick={() => handleEdit(editingId)}
                disabled={!editText.trim() || editText.length > 500}
                className="px-4 py-2 text-sm bg-burnt-orange text-white rounded-lg hover:bg-deep-charcoal disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
