import './ParticleEffect.css'

export default function XPParticle({ particles }) {
  return (
    <>
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="xp-particle"
          style={{
            '--start-x': `${particle.x}px`,
            '--start-y': `${particle.y}px`,
            '--delay': `${particle.delay}ms`,
          }}
        >
          <span className="xp-text">+{particle.points}</span>
        </div>
      ))}
    </>
  )
}