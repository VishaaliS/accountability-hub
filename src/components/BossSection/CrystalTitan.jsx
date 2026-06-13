import { useState, useEffect } from 'react'
import { BOSS_ASSETS } from '../../config/rockAssets'
import './CrystalTitan.css'

export default function CrystalTitan({ progress, onDefeatAnimationEnd }) {
  const [isHit, setIsHit] = useState(false)
  const [previousProgress, setPreviousProgress] = useState(0)

  useEffect(() => {
    if (progress > previousProgress && progress < 100) {
      setIsHit(true)
      const timer = setTimeout(() => setIsHit(false), 300)
      setPreviousProgress(progress)
      return () => clearTimeout(timer)
    }
    setPreviousProgress(progress)
  }, [progress, previousProgress])

  useEffect(() => {
    if (progress >= 100) {
      setTimeout(() => {
        onDefeatAnimationEnd()
      }, 3000)
    }
  }, [progress, onDefeatAnimationEnd])

  const crystalImage = typeof BOSS_ASSETS.full === 'string' && 
    (BOSS_ASSETS.full.includes('.png') || BOSS_ASSETS.full.includes('.jpg'))
    ? BOSS_ASSETS.full
    : null

  return (
    <div className="crystal-titan-container">
      <div className={`crystal-wrapper ${isHit ? 'shake-hard' : ''}`}>
        
        {progress >= 100 ? (
          // VICTORY STATE: Show the revealed crystal
          <div className="crystal-revealed">
            {crystalImage ? (
              <img 
                src={crystalImage} 
                alt="Crystal Titan Revealed" 
                className="crystal-shine-image" 
              />
            ) : (
              <div className="crystal-emoji-shine">
                {BOSS_ASSETS.full}
              </div>
            )}
          </div>
        ) : (
          // BATTLE STATE: Show gray shell with cracks
          <div className="gray-shell-container">
            {/* The hidden reward inside (barely visible through cracks) */}
            {crystalImage && (
              <img 
                src={crystalImage} 
                alt="Hidden Crystal" 
                className="hidden-crystal" 
                style={{ opacity: progress >= 75 ? 0.2 : 0 }}
              />
            )}
            
            {/* Gray stone shell */}
            <div className="gray-shell">
              <div className="shell-texture"></div>
            </div>

            {/* Organic Glass Fractures */}
            {progress >= 25 && (
              <svg className="fracture-overlay" viewBox="0 0 100 100" preserveAspectRatio="none">
                <path 
                  className="crack-path"
                  d="M45,0 L48,15 L35,30 L45,45 L38,60 L50,80 L45,100" 
                />
                {progress >= 50 && (
                  <>
                    <path 
                      className="crack-path"
                      d="M35,30 L20,40 L15,35 M45,45 L65,50 L75,40" 
                    />
                    <path 
                      className="crack-path"
                      d="M65,20 L75,35 L80,25" 
                    />
                  </>
                )}
                {progress >= 75 && (
                  <>
                    <path 
                      className="crack-path heavy-crack"
                      d="M50,80 L70,90 L85,85 M38,60 L20,70" 
                    />
                    <path 
                      className="crack-path heavy-crack"
                      d="M10,50 L25,55 L30,48 M70,60 L85,65 L90,58" 
                    />
                  </>
                )}
              </svg>
            )}
          </div>
        )}
      </div>

      <div className="crystal-damage-indicator">
        <span className="damage-percentage">{Math.round(progress)}%</span>
        <span className="damage-label">Damaged</span>
      </div>
    </div>
  )
}