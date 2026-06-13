import { useState } from 'react'
import { ROCK_ASSETS, ROCK_CONFIG } from '../../config/rockAssets'
import './TaskRock.css'

export default function TaskRock({ task, onComplete, onDelete, isReadonly = false }) {
  const [isBreaking, setIsBreaking] = useState(false)
  const [isHovering, setIsHovering] = useState(false)
  
  const config = ROCK_CONFIG[task.priority] || ROCK_CONFIG.Stone
  const rockAsset = ROCK_ASSETS[task.priority] || ROCK_ASSETS.Stone
  const isImage = typeof rockAsset === 'string' && (rockAsset.includes('.png') || rockAsset.includes('.jpg'))

  async function handleRockClick() {
    if (task.completed || isBreaking || isReadonly) return

    setIsBreaking(true)
    await new Promise(resolve => setTimeout(resolve, 400))
    onComplete(task.id)
  }

  function handleDeleteClick(e) {
    e.stopPropagation()
    const confirmed = window.confirm(`Delete "${task.title}"?`)
    if (confirmed) {
      onDelete(task.id)
    }
  }

  return (
    <div 
      className={`task-rock-card ${task.completed ? 'completed-task' : ''} ${isBreaking ? 'breaking-task' : ''}`}
      onClick={handleRockClick}
      onMouseEnter={() => !isReadonly && setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <div className="task-content-wrapper">
        {/* Rock Icon */}
        <div className="rock-icon-container">
          {isImage ? (
            <img 
              src={rockAsset} 
              alt={task.priority}
              className="rock-icon-image"
            />
          ) : (
            <div className="rock-icon-emoji">
              {rockAsset}
            </div>
          )}
          
          {/* Completion Badge */}
          {task.completed && (
            <div className="completion-checkmark">✓</div>
          )}

          {/* Breaking Animation */}
          {isBreaking && (
            <div className="break-effect">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="shard" style={{
                  '--angle': `${i * 60}deg`,
                }}></div>
              ))}
            </div>
          )}
        </div>

        {/* Task Details */}
        <div className="task-details">
          <h4 className="task-title">{task.title}</h4>
          <div className="task-meta">
            <span className="task-type">{config.name}</span>
            <span className="task-points">{config.points}pt</span>
          </div>
        </div>

        {/* Delete Button - Always visible for own tasks */}
        {!isReadonly && (
          <button 
            className="task-delete-btn" 
            onClick={handleDeleteClick}
            title="Delete task"
          >
            🗑️
          </button>
        )}
      </div>

      {/* Hover Prompt */}
      {!task.completed && isHovering && !isReadonly && (
        <div className="completion-prompt">Click to complete!</div>
      )}
    </div>
  )
}