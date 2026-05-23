import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldPlus, UserCheck, Shield, MapPin, Award, Truck, Navigation } from 'lucide-react'

export function LandingPage() {
  const [showPortal, setShowPortal] = useState(false)
  const [currentSlide, setCurrentSlide] = useState(0)
  const navigate = useNavigate()

  const slides = [
    {
      bg: '/slide1.png',
      title: 'Your Trusted Wholesale Partner',
      subtitle: 'Providing high-quality pharmaceuticals to healthcare providers with reliability and uncompromising standards.',
      isMap: false
    },
    {
      bg: '/slide2.png',
      title: 'Lightning Fast Home Delivery',
      subtitle: 'Direct-to-doorstep wholesale medicines in Kahalgaon. Safe, secure, and always on time.',
      isMap: false
    },
    {
      bg: '/slide3.png',
      title: '100% Verified Quality',
      subtitle: 'Every product is strictly vetted for quality and authenticity. Your patients deserve the best.',
      isMap: false
    },
    {
      title: 'न्यू माँ दुर्गा मेडिकल एजेन्सी',
      subtitle: '767G+FR9, Station Rd, Kahalgaon, Bihar 813203',
      isMap: true
    }
  ]

  useEffect(() => {
    if (showPortal) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length)
    }, 10000) 
    return () => clearInterval(timer)
  }, [showPortal, slides.length])

  const handleLoginClick = () => {
    navigate('/login')
  }

  return (
    <div className="fullpage-landing">
      {/* Floating Glassmorphic Navbar */}
      <nav className="floating-nav">
        <div className="nav-brand">
          <div className="logo-icon-container">
            <ShieldPlus size={28} color="white" />
          </div>
          <span className="brand-text">NEW MAA DURGA MEDICAL</span>
        </div>
        
        <div className="nav-menu">
          <a href="#about" className="nav-menu-link">About Us</a>
          <a href="#location" className="nav-menu-link">Location</a>
          <button className="nav-login-btn" onClick={() => setShowPortal(true)}>
            Portal Login
          </button>
        </div>
      </nav>

      {/* Full Page Slideshow Hero */}
      <section className="hero-slideshow">
        {slides.map((slide, index) => (
          <div 
            key={index} 
            className={`slide ${index === currentSlide ? 'active' : ''}`}
          >
            {slide.isMap ? (
              <div className="map-container" style={{ overflow: 'hidden' }}>
                <div className="map-zoom-wrapper">
                  <iframe 
                    src="https://maps.google.com/maps?q=25.2636707,87.2271144&z=19&output=embed" 
                    width="100%" 
                    height="100%" 
                    style={{ border: 0 }} 
                    allowFullScreen={false} 
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title="न्यू माँ दुर्गा मेडिकल एजेन्सी"
                  ></iframe>
                </div>
                <div className="slide-overlay map-overlay">
                  <div className="slide-content">
                    <h1 className="slide-title">{slide.title}</h1>
                    <p className="slide-subtitle">{slide.subtitle}</p>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="slide-bg" style={{ backgroundImage: `url(${slide.bg})` }}></div>
                <div className="slide-overlay">
                  <div className="slide-content">
                    <h1 className="slide-title">{slide.title}</h1>
                    <p className="slide-subtitle">{slide.subtitle}</p>
                  </div>
                </div>
              </>
            )}
          </div>
        ))}

        {/* Slide Indicators */}
        <div className="slide-indicators">
          {slides.map((_, idx) => (
            <div 
              key={idx} 
              className={`indicator ${idx === currentSlide ? 'active' : ''}`}
              onClick={() => setCurrentSlide(idx)}
            />
          ))}
        </div>
      </section>

      {/* About Us & Owner Section */}
      <section id="about" className="about-section">
        <div className="about-container">
          <div className="about-text-content">
            <h2 className="section-title">About New Maa Durga Medical</h2>
            <div className="title-underline"></div>
            <p className="section-description">
              Nestled in the heart of Kahalgaon, New Maa Durga Medical has grown to become the premier wholesale distributor of high-quality pharmaceuticals and medical supplies in the region. We pride ourselves on our uncompromising standards, ensuring that every product we deliver meets the strictest quality control measures.
            </p>
            <div className="features-list">
              <div className="feature-item">
                <div className="feature-icon-wrapper"><Award size={24} /></div>
                <span>Certified Genuine Medicines</span>
              </div>
              <div className="feature-item">
                <div className="feature-icon-wrapper"><Truck size={24} /></div>
                <span>Same-Day Kahalgaon Delivery</span>
              </div>
            </div>
          </div>

          <div className="owner-profile-card">
            <div className="owner-image-wrapper">
              <img src="/owner-image.jpg" alt="Nirmal Raj" className="owner-image" />
            </div>
            <div className="owner-info">
              <h3 className="owner-name">Nirmal Raj</h3>
              <p className="owner-role">Founder & Managing Director</p>
              <p className="owner-quote">"Our mission is to ensure that every healthcare provider in Kahalgaon has uninterrupted access to the highest quality medicines, safeguarding the health of our community."</p>
            </div>
          </div>
        </div>
      </section>

      {/* Location Section */}
      <section id="location" className="location-section">
        <div className="location-container">
          <h2 className="section-title text-center text-white">Visit Us</h2>
          <div className="location-streetview-container">
            <iframe 
              src="https://www.google.com/maps/embed?pb=!3m2!1sen!2sin!4v1779553282079!5m2!1sen!2sin!6m8!1m7!1sr60BqCUvHWIgWKZZLMqS2g!2m2!1d25.26376480118739!2d87.22708451368986!3f150.45030876189483!4f7.483228933408711!5f0.7820865974627469" 
              width="100%" 
              height="100%" 
              style={{ border: 0 }} 
              allowFullScreen={false} 
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="न्यू माँ दुर्गा मेडिकल एजेन्सी - Street View"
            ></iframe>
            
            <div className="location-overlay-card">
              <div className="location-icon">
                <MapPin size={24} color="white" />
              </div>
              <h3 className="location-overlay-title">न्यू माँ दुर्गा मेडिकल एजेन्सी</h3>
              <p className="location-overlay-address">
                767G+FR9, Station Rd,<br />
                Kahalgaon, Bihar 813203
              </p>
              <p className="location-overlay-hours">
                Open Monday - Saturday: 9:00 AM - 9:00 PM
              </p>
              
              <a 
                href="https://www.google.com/maps/dir/?api=1&destination=25.2636707,87.2271144" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="location-locate-btn"
              >
                <Navigation size={16} />
                <span>Locate Us / Directions</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Dual Login Overlay */}
      {showPortal && (
        <div className="landing-overlay fade-in" onClick={() => setShowPortal(false)}>
          <div className="landing-modal slide-up" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">Select Portal</h2>
            <div className="portal-options">
              
              <div className="portal-card" onClick={handleLoginClick}>
                <div className="portal-icon-wrapper bg-accent-light text-accent">
                  <UserCheck size={32} />
                </div>
                <h3 className="portal-card-title">Employee Portal</h3>
                <p className="portal-card-desc">View leaves, track salary, and manage your profile securely.</p>
              </div>

              <div className="portal-card" onClick={handleLoginClick}>
                <div className="portal-icon-wrapper bg-purple-light text-purple">
                  <Shield size={32} />
                </div>
                <h3 className="portal-card-title">Admin Portal</h3>
                <p className="portal-card-desc">Manage workforce, approve leaves, and handle payroll systems.</p>
              </div>

            </div>
            <button className="btn-cancel" onClick={() => setShowPortal(false)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}
