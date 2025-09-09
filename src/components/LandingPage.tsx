"use client";
import React from "react";
import Image from 'next/image';
import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="landing-page">
      {/* Hero Section */}
      <div className="hero-section">
        <div className="hero-content">
          <div className="hero-logo">
            <Image src="/logo.png" alt="Goal-Digger" width={80} height={80} className="hero-logo-img" />
            <h1 className="hero-title">Goal-Digger</h1>
          </div>
          <p className="hero-subtitle">Turn your big dreams into daily action plans</p>
          <p className="hero-description">
            Transform any goal into a structured roadmap with curated resources, 
            daily practice tasks, and reflection prompts. Start achieving your dreams today!
          </p>
          
          <div className="hero-actions">
            <Link href="/signup" className="btn btn-primary btn-large">
              Get Started Free
            </Link>
            <Link href="/login" className="btn btn-secondary btn-large">
              Sign In
            </Link>
          </div>
        </div>
        
        <div className="hero-visual">
          <div className="avatar-showcase">
            <div className="avatar-grid">
              <div className="avatar-item">
                <Image src="/avatars/cat.png" alt="Cat Avatar" width={60} height={60} className="avatar-img" />
                <span className="avatar-name">Alex</span>
              </div>
              <div className="avatar-item">
                <Image src="/avatars/lion.png" alt="Lion Avatar" width={60} height={60} className="avatar-img" />
                <span className="avatar-name">Sarah</span>
              </div>
              <div className="avatar-item">
                <Image src="/avatars/owl.png" alt="Owl Avatar" width={60} height={60} className="avatar-img" />
                <span className="avatar-name">Mike</span>
              </div>
              <div className="avatar-item">
                <Image src="/avatars/elephant.png" alt="Elephant Avatar" width={60} height={60} className="avatar-img" />
                <span className="avatar-name">Emma</span>
              </div>
            </div>
            <div className="testimonial-bubble">
              <p>"I learned Python in 30 days with Goal-Digger!"</p>
              <span className="testimonial-author">- Alex, Developer</span>
            </div>
          </div>
          
          <div className="feature-cards">
            <div className="feature-card">
              <div className="feature-icon">📚</div>
              <h3>Learn</h3>
              <p>Curated resources from top platforms</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">💪</div>
              <h3>Practice</h3>
              <p>Hands-on exercises and projects</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🤔</div>
              <h3>Reflect</h3>
              <p>Daily insights and progress tracking</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="stats-section">
        <div className="container">
          <div className="stats-grid">
            <div className="stat-item">
              <div className="stat-number">10,000+</div>
              <div className="stat-label">Goals Achieved</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">50,000+</div>
              <div className="stat-label">Learning Hours</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">95%</div>
              <div className="stat-label">Success Rate</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">4.9/5</div>
              <div className="stat-label">User Rating</div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="features-section">
        <div className="container">
          <h2 className="section-title">Why Choose Goal-Digger?</h2>
          
          <div className="features-grid">
            <div className="feature-item">
              <div className="feature-icon-large">🎯</div>
              <h3>AI-Powered Roadmaps</h3>
              <p>Our advanced AI creates personalized learning paths based on your specific goals, time constraints, and skill level. No more generic courses!</p>
            </div>
            
            <div className="feature-item">
              <div className="feature-icon-large">📱</div>
              <h3>Smart Daily Reminders</h3>
              <p>Get intelligent daily reminders that adapt to your schedule. We stop bothering you once you complete your tasks for the day.</p>
            </div>
            
            <div className="feature-item">
              <div className="feature-icon-large">🏆</div>
              <h3>Gamified Learning</h3>
              <p>Earn coins for completing tasks, unlock achievements, and decorate your virtual study room. Make learning fun and rewarding!</p>
            </div>
            
            <div className="feature-item">
              <div className="feature-icon-large">🌐</div>
              <h3>Curated Resources</h3>
              <p>Access the best learning materials from YouTube, Coursera, Khan Academy, TED Talks, and more. All handpicked for quality.</p>
            </div>
            
            <div className="feature-item">
              <div className="feature-icon-large">📊</div>
              <h3>Progress Analytics</h3>
              <p>Track your learning journey with detailed analytics, streak counters, and visual progress indicators. See how far you've come!</p>
            </div>
            
            <div className="feature-item">
              <div className="feature-icon-large">🎨</div>
              <h3>Personalized Experience</h3>
              <p>Choose from 9 adorable avatars and customize your virtual study space. Your learning companion grows with you!</p>
            </div>
          </div>
        </div>
      </div>

      {/* Testimonials Section */}
      <div className="testimonials-section">
        <div className="container">
          <h2 className="section-title">What Our Users Say</h2>
          <div className="testimonials-grid">
            <div className="testimonial-card">
              <div className="testimonial-avatar">
                <Image src="/avatars/monkey.png" alt="User Avatar" width={50} height={50} />
              </div>
              <div className="testimonial-content">
                <p>"Goal-Digger helped me learn React in just 3 weeks! The daily structure kept me motivated."</p>
                <div className="testimonial-author">
                  <strong>Jessica Chen</strong>
                  <span>Frontend Developer</span>
                </div>
              </div>
            </div>
            
            <div className="testimonial-card">
              <div className="testimonial-avatar">
                <Image src="/avatars/penguin.png" alt="User Avatar" width={50} height={50} />
              </div>
              <div className="testimonial-content">
                <p>"I finally learned Spanish after years of trying! The gamification made it addictive."</p>
                <div className="testimonial-author">
                  <strong>Marcus Rodriguez</strong>
                  <span>Marketing Manager</span>
                </div>
              </div>
            </div>
            
            <div className="testimonial-card">
              <div className="testimonial-avatar">
                <Image src="/avatars/rabbit.png" alt="User Avatar" width={50} height={50} />
              </div>
              <div className="testimonial-content">
                <p>"The AI-generated roadmaps are incredible. It found resources I never would have discovered."</p>
                <div className="testimonial-author">
                  <strong>Sarah Kim</strong>
                  <span>Data Scientist</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* How It Works Section */}
      <div className="how-it-works-section">
        <div className="container">
          <h2 className="section-title">How It Works</h2>
          
          <div className="steps-container">
            <div className="step-item">
              <div className="step-number">1</div>
              <div className="step-content">
                <h3>Set Your Goal</h3>
                <p>Tell us what you want to achieve and how much time you can dedicate daily.</p>
              </div>
            </div>
            
            <div className="step-item">
              <div className="step-number">2</div>
              <div className="step-content">
                <h3>Get Your Roadmap</h3>
                <p>Our AI generates a personalized learning plan with daily tasks and resources.</p>
              </div>
            </div>
            
            <div className="step-item">
              <div className="step-number">3</div>
              <div className="step-content">
                <h3>Start Learning</h3>
                <p>Follow your daily plan, complete tasks, and track your progress.</p>
              </div>
            </div>
            
            <div className="step-item">
              <div className="step-number">4</div>
              <div className="step-content">
                <h3>Achieve Success</h3>
                <p>Reach your goals faster with structured learning and consistent practice.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="cta-section">
        <div className="container">
          <div className="cta-content">
            <h2>Ready to Start Your Learning Journey?</h2>
            <p>Join thousands of learners who are already achieving their goals with Goal-Digger.</p>
            <div className="cta-actions">
              <Link href="/signup" className="btn btn-primary btn-large">
                Start Free Today
              </Link>
              <Link href="/login" className="btn btn-outline btn-large">
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="landing-footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-logo">
              <Image src="/logo.png" alt="Goal-Digger" width={40} height={40} />
              <span>Goal-Digger</span>
            </div>
            <p>&copy; 2024 Goal-Digger. All rights reserved.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
