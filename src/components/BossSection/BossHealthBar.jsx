import './BossHealthBar.css'

export default function BossHealthBar({ current, max, healthPercent }) {
  return (
    <div className="boss-health-bar-container">
      <div className="health-info-row">
        <span className="health-label">CRYSTAL TITAN</span>
        <span className="health-stats">{current} / {max} HP</span>
      </div>

      <div className="health-bar-wrapper">
        <div className="health-bar-track">
          <div 
            className="health-bar-fill"
            style={{
              width: `${healthPercent}%`,
            }}
          >
            <div className="health-bar-shine"></div>
          </div>
        </div>
      </div>

      <div className="health-percentage-display">{Math.round(healthPercent)}%</div>
    </div>
  )
}