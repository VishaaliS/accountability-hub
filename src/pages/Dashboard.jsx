import { useEffect, useState } from 'react'
import { supabase } from '../config/supabaseClient'
import CrystalTitan from '../components/BossSection/CrystalTitan'
import BossHealthBar from '../components/BossSection/BossHealthBar'
import TaskRock from '../components/TaskRock/TaskRock'
import XPParticle from '../components/ParticleEffect/XPParticle'
import './Dashboard.css'

const ROCK_CONFIG = {
  Diamond: { name: 'Diamond', points: 50 },
  Gold: { name: 'Gold', points: 20 },
  Bronze: { name: 'Bronze', points: 10 },
  Stone: { name: 'Stone', points: 5 },
}

export default function Dashboard({ session, onLogout }) {
  const [user, setUser] = useState(null)
  const [partnership, setPartnership] = useState(null)
  const [partnerUser, setPartnerUser] = useState(null)
  const [myTasks, setMyTasks] = useState([])
  const [partnerTasks, setPartnerTasks] = useState([])
  const [loading, setLoading] = useState(true)
  
  const [bossHealth, setBossHealth] = useState({ current: 0, max: 0 })
  const [isDefeated, setIsDefeated] = useState(false)
  const [showVictory, setShowVictory] = useState(false)
  
  const [showPairingModal, setShowPairingModal] = useState(false)
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [showPendingRequest, setShowPendingRequest] = useState(false)
  
  const [partnerUsername, setPartnerUsername] = useState('')
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [selectedOre, setSelectedOre] = useState('Stone')
  const [error, setError] = useState('')
  const [pairingLoading, setPairingLoading] = useState(false)
  
  const [pendingPartner, setPendingPartner] = useState(null)
  const [pendingPartnershipId, setPendingPartnershipId] = useState(null)
  
  const [particles, setParticles] = useState([])

  useEffect(() => {
    loadData()

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
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle()

      if (!userData) {
        setLoading(false)
        return
      }

      setUser(userData)

      const { data: pData } = await supabase
        .from('partnerships')
        .select('*')
        .or(`user_1_id.eq.${session.user.id},user_2_id.eq.${session.user.id}`)
        .eq('status', 'active')
        .maybeSingle()

      if (pData) {
        setPartnership(pData)
        
        const partnerId = pData.user_1_id === session.user.id ? pData.user_2_id : pData.user_1_id
        const { data: pUser } = await supabase
          .from('users')
          .select('*')
          .eq('id', partnerId)
          .maybeSingle()

        setPartnerUser(pUser)
        fetchTasks(pData.id)
      } else {
        const { data: pendingPartnership } = await supabase
          .from('partnerships')
          .select('*')
          .eq('user_2_id', session.user.id)
          .eq('status', 'pending')
          .maybeSingle()

        if (pendingPartnership) {
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
      
      const totalTasks = data.length
      const completedTasks = data.filter(t => t.completed).length
      setBossHealth({
        current: totalTasks - completedTasks,
        max: totalTasks,
      })

      if (totalTasks > 0 && completedTasks === totalTasks) {
        setIsDefeated(true)
      } else {
        setIsDefeated(false)
        setShowVictory(false)
      }
    }
  }

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

  async function handlePairWithUsername() {
    setError('')
    setPairingLoading(true)

    if (!partnerUsername.trim()) {
      setError('Enter a username')
      setPairingLoading(false)
      return
    }

    try {
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

      const { data: userActive } = await supabase
        .from('partnerships')
        .select('*')
        .or(`user_1_id.eq.${session.user.id},user_2_id.eq.${session.user.id}`)
        .eq('status', 'active')
        .maybeSingle()

      if (userActive) {
        setError('You already have an active partnership')
        setPairingLoading(false)
        return
      }

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

      const { data: existing } = await supabase
        .from('partnerships')
        .select('*')
        .or(
          `and(user_1_id.eq.${session.user.id},user_2_id.eq.${partner.id}),and(user_1_id.eq.${partner.id},user_2_id.eq.${session.user.id})`
        )
        .maybeSingle()

      if (existing) {
        setError('Request already pending or you are already connected')
        setPairingLoading(false)
        return
      }

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

      setPartnerUsername('')
      setShowPairingModal(false)
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
        priority: selectedOre,
        priority_points: ROCK_CONFIG[selectedOre].points,
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

  async function handleTaskComplete(taskId) {
    const task = [...myTasks, ...partnerTasks].find(t => t.id === taskId)
    if (!task) return

    // Create particle effect
    const rockElement = document.querySelector(`[data-task-id="${taskId}"]`)
    if (rockElement) {
      const rect = rockElement.getBoundingClientRect()
      setParticles(prev => [...prev, {
        id: Date.now(),
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
        points: ROCK_CONFIG[task.priority].points,
        delay: 0,
      }])
    }

    // Scroll to boss to see damage
    window.scrollTo({ top: 0, behavior: 'smooth' })

    await supabase.from('tasks')
      .update({ completed: true, completed_at: new Date().toISOString() })
      .eq('id', taskId)

    await fetchTasks(partnership.id)
  }

  async function handleDeleteTask(taskId) {
    await supabase.from('tasks').delete().eq('id', taskId)
    await fetchTasks(partnership.id)
  }

  async function disconnectPartnership() {
    const confirmed = window.confirm('Are you sure you want to disconnect?')
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
      setIsDefeated(false)
      setShowVictory(false)
    }
  }

  async function handleStartNewBattle() {
    // Delete ALL completed tasks
    const allTaskIds = [...myTasks, ...partnerTasks].map(t => t.id)
    
    if (allTaskIds.length > 0) {
      await supabase
        .from('tasks')
        .delete()
        .in('id', allTaskIds)
    }

    // Reset UI state
    setIsDefeated(false)
    setShowVictory(false)
    setMyTasks([])
    setPartnerTasks([])
    setBossHealth({ current: 0, max: 0 })

    // Reload fresh data
    await fetchTasks(partnership.id)

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleDefeatAnimationEnd() {
    setShowVictory(true)
  }

  const healthPercent = bossHealth.max > 0 
    ? (bossHealth.current / bossHealth.max) * 100 
    : 0

  const damageProgress = bossHealth.max > 0 
    ? ((bossHealth.max - bossHealth.current) / bossHealth.max) * 100 
    : 0

  const myProgress = myTasks.length > 0 
    ? (myTasks.filter(t => t.completed).length / myTasks.length) * 100 
    : 0

  const partnerProgress = partnerTasks.length > 0 
    ? (partnerTasks.filter(t => t.completed).length / partnerTasks.length) * 100 
    : 0

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner">⛏️ Awakening the Crystal Titan...</div>
      </div>
    )
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
  <div className="header-left">
    <h1 className="header-title">⚒️ Boss Break</h1>
    <p className="header-subtitle">Defeat the Crystal Titan</p>
  </div>
  <div className="header-right">
    {partnership && (
      <button 
        className="new-battle-btn" 
        onClick={() => {
          const confirmed = window.confirm('Start a new battle? This will clear all current tasks.')
          if (confirmed) handleStartNewBattle()
        }}
        title="Start fresh battle"
      >
        ⚔️ New Battle
      </button>
    )}
    <span className="username">@{user?.username}</span>
    <button onClick={onLogout} className="logout-btn">Logout</button>
  </div>
</header>

      <main className="dashboard-content">
        {showPendingRequest && pendingPartner ? (
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
          <div className="no-partnership">
            <div className="empty-icon">💎</div>
            <h2>No Mining Partner Yet</h2>
            <p>Connect with a friend to summon the Crystal Titan</p>
            <button className="primary-btn" onClick={() => setShowPairingModal(true)}>
              Find Partner
            </button>
          </div>
        ) : (
          <>
            <div className="boss-and-health">
              <CrystalTitan 
                progress={damageProgress} 
                onDefeatAnimationEnd={handleDefeatAnimationEnd}
              />
              <BossHealthBar 
                current={bossHealth.current} 
                max={bossHealth.max}
                healthPercent={healthPercent}
              />
            </div>

            {showVictory && (
              <section className="victory-screen">
                <div className="victory-content">
                  <h2>CRYSTAL TITAN DEFEATED!</h2>
                  <p>You and your partner defeated the boss together!</p>
                  <div className="victory-stats">
                    <div className="stat">
                      <span className="stat-label">Your Tasks</span>
                      <span className="stat-value">{myTasks.filter(t => t.completed).length}/{myTasks.length}</span>
                    </div>
                    <div className="stat">
                      <span className="stat-label">Partner Tasks</span>
                      <span className="stat-value">{partnerTasks.filter(t => t.completed).length}/{partnerTasks.length}</span>
                    </div>
                  </div>
                  <button className="victory-button" onClick={handleStartNewBattle}>
                    Ready for Next Battle
                  </button>
                </div>
              </section>
            )}

            <div className="rocks-layout">
              <section className="rocks-section">
                <div className="section-header">
                  <h2 className="rocks-title">My Tasks</h2>
                  <button className="add-task-btn" onClick={() => setShowTaskModal(true)}>
                    + Add Task
                  </button>
                </div>
                <div className="rocks-grid">
                  {myTasks.length === 0 ? (
                    <p className="empty-message">No tasks yet. Add your first one!</p>
                  ) : (
                    myTasks.map(task => (
                      <div key={task.id} data-task-id={task.id}>
                        <TaskRock 
                          task={task}
                          onComplete={handleTaskComplete}
                          onDelete={handleDeleteTask}
                        />
                      </div>
                    ))
                  )}
                </div>
              </section>

              <section className="rocks-section partner-section">
                <div className="section-header">
  <h2 className="rocks-title">@{partnerUser?.username} Tasks</h2>
  <div className="partner-controls">
    <button 
      className="remove-partner-btn" 
      onClick={() => {
        const confirmed = window.confirm(`Remove @${partnerUser?.username} as your partner? This will end your partnership.`)
        if (confirmed) disconnectPartnership()
      }}
      title="Remove partner"
    >
      👤✖️ Remove Partner
    </button>
  </div>
</div>
                <div className="rocks-grid">
                  {partnerTasks.length === 0 ? (
                    <p className="empty-message">Partner has no tasks yet</p>
                  ) : (
                    partnerTasks.map(task => (
                      <div key={task.id} data-task-id={task.id}>
                        <TaskRock 
                          task={task}
                          onComplete={() => {}}
                          onDelete={() => {}}
                          isReadonly={true}
                        />
                      </div>
                    ))
                  )}
                </div>
              </section>
            </div>

            <div className="compact-progress">
              <div className="progress-mini">
                <span className="progress-label">Your Progress: {Math.round(myProgress)}%</span>
                <div className="progress-bar-mini">
                  <div className="progress-fill-mini" style={{ width: `${myProgress}%` }}></div>
                </div>
              </div>
              <div className="progress-mini">
                <span className="progress-label">@{partnerUser?.username}: {Math.round(partnerProgress)}%</span>
                <div className="progress-bar-mini partner">
                  <div className="progress-fill-mini partner" style={{ width: `${partnerProgress}%` }}></div>
                </div>
              </div>
            </div>
          </>
        )}
      </main>

      {showPairingModal && (
        <div className="modal-overlay" onClick={() => setShowPairingModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Find Your Mining Partner</h3>
            <p>Enter your friend username to send a partnership request</p>
            <input 
              type="text" 
              placeholder="username" 
              value={partnerUsername} 
              onChange={e => setPartnerUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))} 
              autoFocus 
            />
            {error && <div className="error-message">{error}</div>}
            <div className="modal-actions">
              <button className="confirm-btn" onClick={handlePairWithUsername} disabled={pairingLoading}>
                {pairingLoading ? 'Sending...' : 'Send Request'}
              </button>
              <button className="cancel-btn" onClick={() => {
                setShowPairingModal(false)
                setError('')
                setPartnerUsername('')
              }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showTaskModal && (
        <div className="modal-overlay" onClick={() => setShowTaskModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Add Task</h3>
            <form onSubmit={handleAddTask}>
              <input 
                type="text" 
                placeholder="What needs to be done?" 
                value={newTaskTitle} 
                onChange={e => setNewTaskTitle(e.target.value)} 
                autoFocus 
                required 
              />
              <div className="ore-selector">
                {Object.keys(ROCK_CONFIG).map(ore => (
                  <div 
                    key={ore}
                    className={`ore-option ${selectedOre === ore ? 'selected' : ''}`}
                    onClick={() => setSelectedOre(ore)}
                  >
                    <span className="ore-name">{ore}</span>
                    <span className="ore-points">{ROCK_CONFIG[ore].points}pt</span>
                  </div>
                ))}
              </div>
              <div className="modal-actions">
                <button type="submit" className="confirm-btn">Add Task</button>
                <button type="button" className="cancel-btn" onClick={() => setShowTaskModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <XPParticle particles={particles} />
    </div>
  )
}