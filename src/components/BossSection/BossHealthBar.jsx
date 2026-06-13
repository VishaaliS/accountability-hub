import './BossHealthBar.css'

export default function BossHealthBar({ current, max, healthPercent }) {
  return (
    <div className="boss-health-container">
      <div className="health-info">
        <span className="health-label">Crystal Titan HP</span>
        <span className="health-stats">{current} / {max}</span>
      </div>

      <div className="health-bar-wrapper">
        <div className="health-bar-background">
          <div 
            className="health-bar-fill"
            style={{
              width: `${healthPercent}%`,
              transition: 'width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
          >
            <div className="health-bar-shimmer"></div>
          </div>
        </div>
      </div>

      <div className="health-percentage">{Math.round(healthPercent)}%</div>
    </div>
  )
}