import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

type Message = {
	id: string
	room_id: string
	sender_id: string
	content: string
	created_at: string
	is_deleted: boolean
	users?: {
		username: string
		email: string
  	}
}

type RoomInfo = {
	id: string
	name: string
	type: string
}

export function ChatRoom() {
	const { roomId } = useParams<{ roomId: string }>()
	const navigate = useNavigate()
	const [room, setRoom] = useState<RoomInfo | null>(null)
	const [messages, setMessages] = useState<Message[]>([])
	const [newMessage, setNewMessage] = useState('')
	const [loading, setLoading] = useState(true)
	const [sending, setSending] = useState(false)
	const [currentUserId, setCurrentUserId] = useState<string>('')

  	const fetchRoom = useCallback(async () => {
		try {
			const { data, error } = await supabase
			.from('chat_rooms')
			.select('id, name, type')
			.eq('id', roomId)
			.single()

			if (error) throw error
			setRoom(data)
		} catch (error) {
			console.error('ルーム取得エラー:', error)
			navigate('/')
		} finally {
			setLoading(false)
		}
	}, [roomId, navigate])

	const fetchMessages = useCallback(async () => {
		try {
			const { data, error } = await supabase
				.from('messages')
				.select(`
					*,
					users (
						username,
						email
					)
				`)
				.eq('room_id', roomId)
				.eq('is_deleted', false)
				.order('created_at', { ascending: true })

			if (error) throw error
			setMessages(data || [])
		} catch (error) {
			console.error('メッセージ取得エラー:', error)
		}
	}, [roomId])

    useEffect(() => {
		if (roomId) {
			const getCurrentUser = async () => {
				const { data: { user } } = await supabase.auth.getUser()
				if (user) setCurrentUserId(user.id)
			}
			getCurrentUser()
			fetchRoom()
			fetchMessages()
			// リアルタイム購読
			const channel = supabase
				.channel(`room-${roomId}`)
				.on(
					'postgres_changes',
					{
						event: 'INSERT',
						schema: 'public',
						table: 'messages',
						filter: `room_id=eq.${roomId}`
					},
					(payload) => {
						// 新しいメッセージが追加されたら
						setMessages((current) => [...current, payload.new as Message])
					}
				)
				.subscribe()

			// クリーンアップ
			return () => {
				supabase.removeChannel(channel)
			}
    	}
  	}, [roomId, fetchRoom, fetchMessages])

	const handleSend = async (e: React.FormEvent) => {
    	e.preventDefault()
    	if (!newMessage.trim()) return

    	setSending(true)
    	try {
      		const { data: { user } } = await supabase.auth.getUser()
      		if (!user) throw new Error('ログインが必要です')

      		const { error } = await supabase
        		.from('messages')
        		.insert({
          			room_id: roomId,
          			sender_id: user.id,
          			content: newMessage.trim()
        		})

      		if (error) throw error

			setNewMessage('')
    	} catch (error) {
      		console.error('送信エラー:', error)
    	} finally {
      		setSending(false)
    	}
  	}

  	if (loading) {
    	return <div className="min-h-screen flex items-center justify-center">読み込み中...</div>
  	}

  	if (!room) {
    	return <div className="min-h-screen flex items-center justify-center">ルームが見つかりません</div>
  	}

  	return (
    	<div className="min-h-screen bg-gray-100 flex flex-col">
      		{/* ヘッダー */}
      		<header className="bg-white shadow px-4 py-4">
        		<div className="max-w-4xl mx-auto flex items-center gap-4">
          			<button
            			onClick={() => navigate('/')}
            			className="text-blue-500 hover:text-blue-700"
          			>
            			← 戻る
          			</button>
          			<h1 className="text-xl font-bold">{room.name}</h1>
        		</div>
      		</header>

			{/* メッセージエリア */}
			<div className="flex-1 overflow-y-auto p-4">
				<div className="max-w-4xl mx-auto space-y-4">
					{messages.length === 0 ? (
						<div className="text-center text-gray-500 py-12">
							メッセージがありません。最初のメッセージを送信しましょう！
						</div>
					) : (
						messages.map((message) => {
							const isMyMessage = message.sender_id === currentUserId
							return (
								<div
									key={message.id}
									className={`flex ${isMyMessage ? 'justify-end' : 'justify-start'}`}
								>
									<div
										className={`max-w-xs lg:max-w-md px-4 py-3 rounded-lg shadow ${
											isMyMessage
											? 'bg-blue-500 text-white'
											: 'bg-white text-gray-800'
										}`}
									>
										{!isMyMessage && message.users && (
											<p className="text-sm font-semibold mb-1 text-gray-600">
											{message.users.username}
											</p>
										)}
										<p>{message.content}</p>
										<p className={`text-xs mt-1 ${
											isMyMessage ? 'text-blue-100' : 'text-gray-500'
										}`}>
											{new Date(message.created_at).toLocaleString('ja-JP')}
										</p>
									</div>
								</div>
							)
						})
					)}
				</div>
			</div>

			{/* 入力エリア */}
			<div className="bg-white border-t p-4">
				<form onSubmit={handleSend} className="max-w-4xl mx-auto flex gap-2">
					<input
						type="text"
						value={newMessage}
						onChange={(e) => setNewMessage(e.target.value)}
						placeholder="メッセージを入力..."
						className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
						disabled={sending}
					/>
					<button
						type="submit"
						disabled={sending || !newMessage.trim()}
						className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50"
					>
						送信
					</button>
				</form>
			</div>
		</div>
	)
}