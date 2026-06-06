import { useEffect, useState } from 'react'
import { supabase } from '../config/supabaseClient'
import './Dashboard.css'

const ORE_TYPES = [
  { type: 'Diamond', points: 50, icon: '💎' },
  { type: 'Gold', points: 20, icon: '⭐' },
  { type: 'Bronze', points: 10, icon: '🥉' },
  { type: 'Stone', points: 5, icon: '🪨' },
]

export default function Dashboard({ session, onLogout }) {
  const [user, setUser] = useState(null)
  const [partnership, setPartnership] = useState(null)
  const [partnerUser, setPartnerUser] = useState(null)
  const [myTasks, setMyTasks] = useState([])
  const [partnerTasks, setPartnerTasks] = useState([])
  const [loading, setLoading] = useState(true)
  
  // Modals
  const [showPairingModal, setShowPairingModal] = useState(false)
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [showPendingRequest, setShowPendingRequest] = useState(false)
  const [pendingPartner, setPendingPartner] = useState(null)
  const [pendingPartnershipId, setPendingPartnershipId] = useState(null)
  
  // Forms
  const [partnerUsername, setPartnerUsername] = useState('')
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [selectedOre, setSelectedOre] = useState(ORE_TYPES[3])
  const [error, setError] = useState('')
  const [pairingLoading, setPairingLoading] = useState(false)

  useEffect(() => {
    loadData()

    // Real-time subscription for tasks
    const channel = supabase
      .channel('tasks-updates')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'tasks' }, 
        () => { if (partnership?.id) fetchTasks(partnership.id) }
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [session, partnership?.id])

  async function loadData() {
    try {
      // 1. Get current user
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle()

      if (!userData) {
        // User doesn't exist (shouldn't happen with new code)
        setLoading(false)
        return
      }

      setUser(userData)

      // 2. Check for ACTIVE partnership
      const { data: activePartnership } = await supabase
        .from('partnerships')
        .select('*')
        .or(`user_1_id.eq.${session.user.id},user_2_id.eq.${session.user.id}`)
        .eq('status', 'active')
        .maybeSingle()

      if (activePartnership) {
        setPartnership(activePartnership)
        
        // Get partner info
        const partnerId = activePartnership.user_1_id === session.user.id 
          ? activePartnership.user_2_id 
          : activePartnership.user_1_id

        const { data: pUser } = await supabase
          .from('users')
          .select('*')
          .eq('id', partnerId)
          .maybeSingle()

        setPartnerUser(pUser)
        fetchTasks(activePartnership.id)
      } else {
        // 3. Check for PENDING requests (incoming only)
        const { data: pendingPartnership } = await supabase
          .from('partnerships')
          .select('*')
          .eq('user_2_id', session.user.id)
          .eq('status', 'pending')
          .maybeSingle()

        if (pendingPartnership) {
          // Show pending request UI
          const { data: sender } = await supabase
            .from('users')
            .select('*')
            .eq('id', pendingPartnership.user_1_id)
            .maybeSingle()

          setPendingPartner(sender)
          setPendingPartnershipId(pendingPartnership.id)
          setShowPendingRequest(true)
        }
      }
    } catch (err) {
      console.error('Load error:', err)
    } finally {
      setLoading(false)
    }
  }

  async function fetchTasks(partnershipId) {
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('partnership_id', partnershipId)
      .order('created_at', { ascending: false })

    if (data) {
      setMyTasks(data.filter(t => t.user_id === session.user.id))
      setPartnerTasks(data.filter(t => t.user_id !== session.user.id))
    }
  }

  // Accept partnership request
  async function acceptPartnership() {
    const { error } = await supabase
      .from('partnerships')
      .update({ status: 'active' })
      .eq('id', pendingPartnershipId)

    if (!error) {
      setShowPendingRequest(false)
      loadData()
    }
  }

  // Reject partnership request
  async function rejectPartnership() {
    const { error } = await supabase
      .from('partnerships')
      .delete()
      .eq('id', pendingPartnershipId)

    if (!error) {
      setShowPendingRequest(false)
      setPendingPartner(null)
      setPendingPartnershipId(null)
    }
  }

  // Send partnership request
  async function handlePairWithUsername() {
    setError('')
    setPairingLoading(true)

    if (!partnerUsername.trim()) {
      setError('Enter a username')
      setPairingLoading(false)
      return
    }

    try {
      // Find partner
      const { data: partner } = await supabase
        .from('users')
        .select('*')
        .eq('username', partnerUsername.trim().toLowerCase())
        .maybeSingle()

      if (!partner) {
        setError('Username not found')
        setPairingLoading(false)
        return
      }

      if (partner.id === session.user.id) {
        setError("Can't pair with yourself")
        setPairingLoading(false)
        return
      }

      // Check if user already has active partnership
      const { data: userActive } = await supabase
        .from('partnerships')
        .select('*')
        .or(`user_1_id.eq.${session.user.id},user_2_id.eq.${session.user.id}`)
        .eq('status', 'active')
        .maybeSingle()

      if (userActive) {
        setError('You already have an active partnership. End it to connect with someone else.')
        setPairingLoading(false)
        return
      }

      // Check if partner already has active partnership
      const { data: partnerActive } = await supabase
        .from('partnerships')
        .select('*')
        .or(`user_1_id.eq.${partner.id},user_2_id.eq.${partner.id}`)
        .eq('status', 'active')
        .maybeSingle()

      if (partnerActive) {
        setError(`@${partner.username} already has an active partnership`)
        setPairingLoading(false)
        return
      }

      // Check if request already exists
      const { data: existing } = await supabase
        .from('partnerships')
        .select('*')
        .or(
          `and(user_1_id.eq.${session.user.id},user_2_id.eq.${partner.id}),and(user_1_id.eq.${partner.id},user_2_id.eq.${session.user.id})`
        )
        .maybeSingle()

      if (existing) {
        if (existing.status === 'pending') {
          setError('Request already pending. Waiting for partner to accept.')
        } else {
          setError('You are already connected')
        }
        setPairingLoading(false)
        return
      }

      // Create partnership request
      const { error: createError } = await supabase
        .from('partnerships')
        .insert([
          {
            user_1_id: session.user.id,
            user_2_id: partner.id,
            status: 'pending',
          },
        ])

      if (createError) throw createError

      setError('') // Clear error
      setPartnerUsername('')
      setShowPairingModal(false)
      // Show success message by setting a temporary success state
      alert(`Partnership request sent to @${partner.username}!`)
    } catch (err) {
      console.error('Pairing error:', err)
      setError('Failed to send request')
    } finally {
      setPairingLoading(false)
    }
  }

  async function handleAddTask(e) {
    e.preventDefault()
    if (!newTaskTitle.trim() || !partnership) return

    const { error: addError } = await supabase.from('tasks').insert([
      {
        user_id: session.user.id,
        partnership_id: partnership.id,
        title: newTaskTitle.trim(),
        priority: selectedOre.type,
        priority_points: selectedOre.points,
        completed: false,
      },
    ])

    if (addError) {
      console.error('Add task error:', addError)
      setError('Failed to add task')
    } else {
      setNewTaskTitle('')
      setShowTaskModal(false)
      fetchTasks(partnership.id)
    }
  }

  async function toggleTask(task) {
    await supabase.from('tasks')
      .update({ 
        completed: !task.completed, 
        completed_at: !task.completed ? new Date().toISOString() : null 
      })
      .eq('id', task.id)
    fetchTasks(partnership.id)
  }

  async function deleteTask(taskId) {
    await supabase.from('tasks').delete().eq('id', taskId)
    fetchTasks(partnership.id)
  }

  async function disconnectPartnership() {
    const confirmed = window.confirm('Are you sure you want to disconnect from your partner?')
    if (!confirmed) return

    const { error } = await supabase
      .from('partnerships')
      .delete()
      .eq('id', partnership.id)

    if (!error) {
      setPartnership(null)
      setPartnerUser(null)
      setMyTasks([])
      setPartnerTasks([])
    }
  }

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loader">⛏️ Loading mine...</div>
      </div>
    )
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="logo">⚒️ Accountability Hub</div>
        <div className="user-info">
          <span className="username">@{user?.username}</span>
          <button onClick={onLogout} className="logout-btn">Logout</button>
        </div>
      </header>

      <main className="dashboard-content">
        {showPendingRequest && pendingPartner ? (
          // PENDING REQUEST UI
          <div className="pending-request-view">
            <div className="pending-card">
              <h2>Partnership Request</h2>
              <p>@{pendingPartner.username} wants to pair with you!</p>
              <div className="pending-actions">
                <button className="accept-btn" onClick={acceptPartnership}>
                  ✓ Accept
                </button>
                <button className="reject-btn" onClick={rejectPartnership}>
                  ✗ Reject
                </button>
              </div>
            </div>
          </div>
        ) : !partnership ? (
          // NO PARTNERSHIP VIEW
          <div className="no-partnership">
            <div className="empty-icon">⛏️</div>
            <h2>No Mining Partner Yet</h2>
            <p>Connect with a friend to start your accountability journey</p>
            <button className="primary-btn" onClick={() => setShowPairingModal(true)}>
              Find Partner
            </button>
          </div>
        ) : (
          // ACTIVE PARTNERSHIP VIEW
          <div className="mines-container">
            {/* My Mine */}
            <section className="mine-column">
              <div className="column-header">
                <h3>My Mine</h3>
                <button className="add-task-btn" onClick={() => setShowTaskModal(true)}>
                  + Add Ore
                </button>
              </div>
              <div className="task-list">
                {myTasks.length === 0 ? (
                  <div className="empty-state">No ore yet. Add your first task!</div>
                ) : (
                  myTasks.map(task => (
                    <div key={task.id} 
                         className={`task-card ${task.priority.toLowerCase()} ${task.completed ? 'completed' : ''}`}
                         onClick={() => toggleTask(task)}>
                      <div className="task-left">
                        <span className="ore-icon">
                          {ORE_TYPES.find(o => o.type === task.priority)?.icon}
                        </span>
                        <span className="task-title">{task.title}</span>
                      </div>
                      <button className="delete-btn" onClick={(e) => { e.stopPropagation(); deleteTask(task.id) }}>
                        ×
                      </button>
                    </div>
                  ))
                )}
              </div>
            </section>

            {/* Partner's Mine */}
            <section className="mine-column partner">
              <div className="column-header">
                <div>
                  <h3>@{partnerUser?.username}'s Mine</h3>
                </div>
                <button className="disconnect-btn" onClick={disconnectPartnership} title="Disconnect from partner">
                  🔌
                </button>
              </div>
              <div className="task-list">
                {partnerTasks.length === 0 ? (
                  <div className="empty-state">Partner hasn't added any ore yet</div>
                ) : (
                  partnerTasks.map(task => (
                    <div key={task.id} 
                         className={`task-card ${task.priority.toLowerCase()} ${task.completed ? 'completed' : ''} readonly`}>
                      <div className="task-left">
                        <span className="ore-icon">
                          {ORE_TYPES.find(o => o.type === task.priority)?.icon}
                        </span>
                        <span className="task-title">{task.title}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        )}
      </main>

      {/* Task Modal */}
      {showTaskModal && (
        <div className="modal-overlay" onClick={() => setShowTaskModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Add Task Ore</h3>
            <form onSubmit={handleAddTask}>
              <input type="text" 
                     placeholder="What needs to be done?" 
                     value={newTaskTitle} 
                     onChange={e => setNewTaskTitle(e.target.value)} 
                     autoFocus 
                     required />
              <div className="ore-selector">
                {ORE_TYPES.map(ore => (
                  <div key={ore.type} 
                       className={`ore-option ${selectedOre.type === ore.type ? 'selected' : ''}`}
                       onClick={() => setSelectedOre(ore)}>
                    <span className="ore-emoji">{ore.icon}</span>
                    <span className="ore-name">{ore.type}</span>
                    <span className="ore-points">{ore.points}pt</span>
                  </div>
                ))}
              </div>
              <div className="modal-actions">
                <button type="submit" className="confirm-btn">Drop in Mine</button>
                <button type="button" className="cancel-btn" onClick={() => setShowTaskModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pairing Modal */}
      {showPairingModal && (
        <div className="modal-overlay" onClick={() => setShowPairingModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Find Your Mining Partner</h3>
            <p>Enter your friend's username to send a partnership request</p>
            <input type="text" 
                   placeholder="username" 
                   value={partnerUsername} 
                   onChange={e => setPartnerUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))} 
                   autoFocus />
            {error && <div className="error-message">{error}</div>}
            <div className="modal-actions">
              <button className="confirm-btn" onClick={handlePairWithUsername} disabled={pairingLoading}>
                {pairingLoading ? 'Sending...' : 'Send Request'}
              </button>
              <button className="cancel-btn" onClick={() => { setShowPairingModal(false); setError(''); setPartnerUsername('') }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}