import { useEffect, useRef, useState } from 'react'
import PageLayout from '../components/PageLayout.jsx'
import { Link } from 'react-router-dom'
import useAuth from '../auth/useAuth.js'

function Home() {
  const { user } = useAuth()
  const carouselRef = useRef(null)
  const [edges, setEdges] = useState({ start: true, end: false })

  useEffect(() => {
    const track = carouselRef.current
    const updateEdges = () => setEdges({
      start: track.scrollLeft <= 2,
      end: track.scrollLeft + track.clientWidth >= track.scrollWidth - 2,
    })
    updateEdges()
    track.addEventListener('scroll', updateEdges, { passive: true })
    const observer = new ResizeObserver(updateEdges)
    observer.observe(track)
    return () => {
      track.removeEventListener('scroll', updateEdges)
      observer.disconnect()
    }
  }, [])

  function moveFeatures(direction) {
    const track = carouselRef.current
    const cards = [...track.children]
    const positions = cards.map((card) => card.offsetLeft - cards[0].offsetLeft)
    const target = direction > 0
      ? positions.find((position) => position > track.scrollLeft + 2) ?? track.scrollWidth
      : positions.findLast((position) => position < track.scrollLeft - 2) ?? 0
    track.scrollTo({
      left: target,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
    })
  }

  return (
    <PageLayout>
      <section className="hero" aria-labelledby="hero-heading">
        <div className="hero-copy">
          <p className="eyebrow">A JOURNAL FOR THE PLACES YOU KEEP</p>
          <h1 id="hero-heading">
            <span>Journeys end.</span>{' '}
            <span>Memories stay.</span>
          </h1>
          <div className="hero-actions">
            <Link className="primary-link" to={user ? '/trips' : '/register'}>
              {user ? 'Open your diary' : 'Start somewhere'}
            </Link>
            {!user && <Link className="text-link" to="/login">I already have an account</Link>}
          </div>
        </div>

        <div className="hero-visual" aria-hidden="true">
          <div className="travel-stamp">
            <span>Travel Diary</span>
            <strong>Collected</strong>
            <span>along the way</span>
          </div>
          <div className="postcard postcard-back">
            <span className="postcard-label">Next adventure</span>
            <strong>Kyoto, Japan</strong>
            <span>6 days · April</span>
          </div>
          <div className="postcard postcard-front">
            <div className="postcard-sun" />
            <div className="postcard-mountain postcard-mountain-back" />
            <div className="postcard-mountain postcard-mountain-front" />
            <div className="postcard-caption">
              <span>Day three</span>
              <strong>Sunrise above the clouds</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="feature-section" aria-labelledby="features-heading">
        <div className="feature-heading-row">
          <div>
            <p className="eyebrow">Your whole journey, together</p>
            <h2 id="features-heading">How your journey comes to life</h2>
            <p id="features-help" className="feature-hint">Four ways to keep the little things. Swipe or use the arrows to explore.</p>
          </div>
          <div className="feature-controls" aria-label="Feature carousel controls">
            <button type="button" aria-label="Previous feature" aria-controls="feature-carousel"
              disabled={edges.start} onClick={() => moveFeatures(-1)}>
              <span aria-hidden="true">←</span>
            </button>
            <button type="button" aria-label="Next feature" aria-controls="feature-carousel"
              disabled={edges.end} onClick={() => moveFeatures(1)}>
              <span aria-hidden="true">→</span>
            </button>
          </div>
        </div>
        <div className="feature-carousel" id="feature-carousel" ref={carouselRef}
          role="region" aria-label="Travel Diary features" aria-roledescription="carousel"
          aria-describedby="features-help" tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
              event.preventDefault()
              moveFeatures(event.key === 'ArrowRight' ? 1 : -1)
            }
          }}>
          <article className="feature-card" aria-label="1 of 4: Add a memory">
            <div className="feature-preview feature-preview-memory" aria-hidden="true">
              <div className="feature-note">
                <span className="feature-preview-label">A page from the journey</span>
                <strong>A morning by the harbour</strong>
                <div className="feature-photo" />
                <span>Salt in the air. Nowhere to rush.</span>
                <small>⌖ Hobart, Tasmania</small>
              </div>
            </div>
            <div className="feature-card-copy">
              <span className="feature-number">01 / CAPTURE</span>
              <h3>Add a memory</h3>
              <p>Write about the day, add your photos, and save where it happened. Keep the details that made it yours.</p>
            </div>
          </article>
          <article className="feature-card" aria-label="2 of 4: Map your journey">
            <div className="feature-preview feature-preview-map" aria-hidden="true">
              <svg viewBox="0 0 360 230" fill="none">
                <path className="feature-map-water" d="M250 -20 C160 65 335 110 210 250 L400 260 V-20Z" />
                <path className="feature-map-road" d="M-20 70 L380 165 M75 -20 L150 250 M-10 190 L310 -20" />
                <path className="feature-map-route" d="M75 167 Q100 80 174 101 T270 48" />
                <g className="feature-map-pin"><circle cx="75" cy="167" r="8" /><circle cx="174" cy="101" r="8" /><circle cx="270" cy="48" r="8" /></g>
              </svg>
              <span className="feature-map-caption">Three places. One story.</span>
            </div>
            <div className="feature-card-copy">
              <span className="feature-number">02 / EXPLORE</span>
              <h3>Map your journey</h3>
              <p>See your saved locations as markers on your journey map, with a route connecting each memory.</p>
            </div>
          </article>
          <article className="feature-card" aria-label="3 of 4: Remember the day">
            <div className="feature-preview feature-preview-weather" aria-hidden="true">
              <div className="feature-weather-sheet">
                <span className="feature-preview-label">03 NOV · HOBART</span>
                <span className="feature-weather-sun">☀</span>
                <strong>Partly cloudy</strong>
                <span className="feature-weather-temperature">18° <small>/ 11°</small></span>
                <span>0 mm rain · A day to remember</span>
              </div>
            </div>
            <div className="feature-card-copy">
              <span className="feature-number">03 / REMEMBER</span>
              <h3>Remember the day</h3>
              <p>Keep the date and saved weather with your entry, from the temperature to the rain that shaped the day.</p>
            </div>
          </article>
          <article className="feature-card" aria-label="4 of 4: Replay & share">
            <div className="feature-preview feature-preview-replay" aria-hidden="true">
              <div className="feature-replay-sheet">
                <span className="feature-preview-label">YOUR JOURNEY, REVISITED</span>
                <div className="feature-photo"><span className="feature-play">▶</span></div>
                <div className="feature-replay-progress"><i /><i /><i /></div>
                <strong>Memory 2 of 3</strong>
                <span>Share a public link when you’re ready ↗</span>
              </div>
            </div>
            <div className="feature-card-copy">
              <span className="feature-number">04 / RELIVE</span>
              <h3>Replay &amp; share</h3>
              <p>Revisit your memories in date order with Journey Replay. Make a trip public when you want to share its link.</p>
            </div>
          </article>
        </div>
      </section>

      <section className="home-cta" aria-labelledby="home-cta-heading">
        <div>
          <p className="eyebrow">Ready when you are</p>
          <h2 id="home-cta-heading">Your next chapter starts with a destination.</h2>
        </div>
        <Link className="primary-link primary-link-light" to={user ? '/trips' : '/register'}>
          {user ? 'View your trips' : 'Create a free account'}
        </Link>
      </section>
    </PageLayout>
  )
}

export default Home
