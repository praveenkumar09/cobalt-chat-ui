import { useState, type CSSProperties } from 'react'
import { playLikeSound } from '../utils/sound'

const BURST_COLORS = ['#F91880', '#FFAD1F', '#17BF63', '#1DA1F2', '#FFD400', '#F4511E', '#B14EFF', '#FF5C5C']

export function HeartButton() {
  const [liked, setLiked] = useState(false)
  const [burst, setBurst] = useState(false)

  const toggle = () => {
    setLiked((prev) => {
      const next = !prev
      if (next) {
        playLikeSound()
        setBurst(true)
        window.setTimeout(() => setBurst(false), 950)
      }
      return next
    })
  }

  return (
    <button
      type="button"
      className={`action-btn heart-btn${liked ? ' is-liked' : ''}`}
      onClick={toggle}
      aria-pressed={liked}
      aria-label={liked ? 'Unlike this response' : 'Like this response'}
    >
      <span className="heart-icon-wrap">
        <span className="heart-burst" aria-hidden="true">
          {burst &&
            Array.from({ length: 8 }).map((_, i) => (
              <span
                key={i}
                className="heart-particle"
                style={
                  {
                    '--angle': `${i * 45}deg`,
                    '--pcolor': BURST_COLORS[i % BURST_COLORS.length],
                    animationDelay: `${i * 25}ms`,
                  } as CSSProperties
                }
              />
            ))}
        </span>
        <svg
          className="heart-icon"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill={liked ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <path d="M12 20.3s-6.8-4.2-9.2-8.5C1.1 8.2 2.4 4.8 5.5 4a4.8 4.8 0 0 1 6.5 2.3A4.8 4.8 0 0 1 18.5 4c3.1.8 4.4 4.2 2.7 7.8-2.4 4.3-9.2 8.5-9.2 8.5Z" />
        </svg>
      </span>
      <span className="action-btn__label">Like</span>
    </button>
  )
}
