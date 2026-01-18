import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { CreateRoomModal } from '../components/CreateRoomModal'
import { useNavigate } from 'react-router-dom'

type ChatRoom = {
  id: string
  name: string
  type: string
  creator_id: string
  max_participants: number
  category: string | null
  created_at: string
}

export function ChatRoomList() {
  const navigate = useNavigate()
  const [rooms, setRooms] = useState<ChatRoom[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)

  useEffect(() => {
    fetchRooms()
  }, [])

  const fetchRooms = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_rooms')
        .select('*')
        .eq('type', 'public')
        .order('created_at', { ascending: false })

      if (error) throw error
      setRooms(data || [])
    } catch (error) {
      console.error('ルーム取得エラー:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">読み込み中...</div>
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">チャットルーム</h1>
          <button
            onClick={handleLogout}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
          >
            ログアウト
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 font-semibold"
            >
            ＋ 新規ルーム作成
            </button>
        </div>

        {rooms.length === 0 ? (
          <div className="text-center text-gray-500 py-12">
            チャットルームがありません
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rooms.map((room) => (
              <div
                key={room.id}
                onClick={() => navigate(`/room/${room.id}`)}
                className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition cursor-pointer"
                >
                <h3 className="text-xl font-semibold mb-2">{room.name}</h3>
                {room.category && (
                    <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                    {room.category}
                    </span>
                )}
                <p className="text-sm text-gray-500 mt-2">
                    最大 {room.max_participants} 人
                </p>
                </div>
            ))}
          </div>
        )}

        {showCreateModal && (
            <CreateRoomModal
                onClose={() => setShowCreateModal(false)}
                onCreated={() => {
                fetchRooms()
                }}
            />
        )}
      </main>
    </div>
  )
}