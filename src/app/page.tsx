"use client";
import React, { useState, useEffect } from "react";
import Image from 'next/image';
import { useUserData } from '@/hooks/useUserData';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import AppLayout from '../components/AppLayout';
import LandingPage from '../components/LandingPage';
import { useAvatar } from '../contexts/AvatarContext';
import { useRoadmapGeneration } from '../contexts/RoadmapGenerationContext';
import { getMessageForAction } from '../lib/avatarMessages';

export default function Home() {
  const [goal, setGoal] = useState("");
  const [dailyMinutes, setDailyMinutes] = useState(30);
  const [totalDays, setTotalDays] = useState(10);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const { showMessage } = useAvatar();
  const [savedGoals, setSavedGoals] = useState<any[]>([]);
  const [loadingGoals, setLoadingGoals] = useState(false);
  
  // Use the global generation context
  const { 
    generationState, 
    startGeneration, 
    clearGeneration, 
    goalName, 
    setGoalName,
    setData
  } = useRoadmapGeneration();
  
  // Destructure for easier access
  const { 
    isGenerating: loading, 
    data, 
    error, 
    progress, 
    statusMessage 
  } = generationState;

  // Show avatar message when roadmap generator page loads
  useEffect(() => {
    const timer = setTimeout(() => {
      showMessage(getMessageForAction('generator_visited'));
    }, 2000); // Delay to let page load
    return () => clearTimeout(timer);
  }, [showMessage]);
  
  // Save Goal Modal
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveModalData, setSaveModalData] = useState<{
    success: boolean;
    message: string;
    isStartGoal: boolean;
  }>({
    success: false,
    message: '',
    isStartGoal: false
  });

  const { userData, loading: userLoading } = useUserData();
  const { data: session, status } = useSession();
  const router = useRouter();


  // Show landing page if not authenticated
  if (status === "loading") {
    return <div className="loading-screen">Loading...</div>;
  }

  if (status === "unauthenticated") {
    return <LandingPage />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await startGeneration(goal, dailyMinutes, totalDays);
  };

  const handleSaveGoal = async (startGoal = false) => {
    if (!data || !goalName.trim()) {
      setSaveModalData({
        success: false,
        message: "Please enter a goal name",
        isStartGoal: startGoal
      });
      setShowSaveModal(true);
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: goalName,
          content: data,
          totalDays: data.total_days,
          dailyMinutes: data.daily_minutes,
          startGoal: startGoal
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setSaveModalData({
          success: true,
          message: startGoal ? "Goal saved and started successfully!" : "Goal saved successfully!",
          isStartGoal: startGoal
        });
        setShowSaveModal(true);
        
        // Show instant avatar message for goal creation
        if (startGoal) {
          showMessage(getMessageForAction('goal_started'), true);
          // Navigate to dashboard after a short delay
          setTimeout(() => {
            router.push("/dashboard");
          }, 2000);
        } else {
          showMessage(getMessageForAction('goal_created'), true);
        }
      } else {
        const errorData = await response.json();
        setSaveModalData({
          success: false,
          message: `Error: ${errorData.error || "Failed to save goal"}`,
          isStartGoal: startGoal
        });
        setShowSaveModal(true);
      }
    } catch (err) {
      setSaveModalData({
        success: false,
        message: "Error saving goal. Please try again.",
        isStartGoal: startGoal
      });
      setShowSaveModal(true);
    } finally {
      setSaving(false);
    }
  };


  const loadSavedGoals = async () => {
    setLoadingGoals(true);
    try {
      const response = await fetch("/api/goals");
      if (response.ok) {
        const goals = await response.json();
        setSavedGoals(goals);
      }
    } catch (err) {
      console.error("Failed to load saved goals:", err);
    } finally {
      setLoadingGoals(false);
    }
  };

  const loadGoal = async (goalId: string) => {
    try {
      const response = await fetch(`/api/goals/${goalId}`);
      if (response.ok) {
        const result = await response.json();
        const roadmapData = result.goal.roadmapJson;
        // Update the context with loaded data
        setData(roadmapData);
        setGoalName(result.goal.title);
        setIsEditing(false);
      }
    } catch (err) {
      console.error("Failed to load goal:", err);
    }
  };

  return (
    <AppLayout activePage="generator">
      <div className="generator-page">
        <div className="page-layout">
        <div className="content-main">
          <div className="form-container">
            <form onSubmit={handleSubmit}>
            <div className="form-box main-form-box">
              <h1 className="form-title">
                <Image src="/icons/trophy.png" alt="Trophy" width={53} height={53} className="title-icon" />
                Create your RoadMap
              </h1>
              
              <div className="form-group">
                <label className="form-label">Enter your Goal</label>
            <input
                  type="text"
                  className="form-input"
              placeholder="e.g., Learn SQL for data analysis"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              required
            />
              </div>

              <div className="form-group">
                <label className="form-label">Daily Minutes</label>
                <div className="slider-container">
                  <div className="slider-wrapper">
                <input
                      type="range"
                      className="slider"
                      min="10"
                      max="120"
                      step="5"
                  value={dailyMinutes}
                      onChange={(e) => setDailyMinutes(Number(e.target.value))}
                      aria-label="Daily minutes"
                      style={{
                        background: `linear-gradient(90deg, #6A3EE8 ${Math.round(((dailyMinutes - 10) * 100) / (120 - 10))}%, #D8D8D8 ${Math.round(((dailyMinutes - 10) * 100) / (120 - 10))}%)`,
                      }}
                    />
                  </div>
                  <div className="slider-value">{dailyMinutes} mins</div>
                </div>
              </div>
              
              <div className="form-group">
                <label className="form-label">Total Days</label>
                <input
                  type="number"
                  className="form-input"
                  min="1"
                  max="365"
                  value={totalDays}
                  onChange={(e) => setTotalDays(Number(e.target.value))}
                  required
                />
              </div>


              <div className="button-container">
                <button
                  type="submit"
                  className="btn generate-btn"
                  disabled={loading}
                >
                  {loading ? `${statusMessage} (${progress}%)` : "Generate Roadmap"}
                </button>
              </div>

            {loading && (
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${progress}%` }}
                  />
              </div>
            )}

            {error && (
                <div className="error-message" style={{
                  marginTop: "16px",
                  padding: "12px",
                  backgroundColor: "#FEE2E2",
                  border: "1px solid #FECACA",
                  borderRadius: "8px",
                  color: "#DC2626" 
                }}>
                {error}
              </div>
            )}
            </div>
          </form>
        </div>


          {/* Roadmap Display */}
      {data && (
            <div className="roadmap-display">
              <div className="roadmap-header">
                <div className="roadmap-title-section">
                  <h2>Generated Roadmap</h2>
                  <div className="roadmap-controls">
                    {isEditing && (
                      <button 
                        className="btn-ghost regenerate-btn"
                        onClick={() => {
                          clearGeneration();
                          setIsEditing(false);
                        }}
                      >
                        Regenerate
                      </button>
                    )}
                    <button 
                      className="btn-ghost edit-btn"
                      onClick={() => {
                        setIsEditing(!isEditing);
                        if (!isEditing) {
                          loadSavedGoals();
                        }
                      }}
                    >
                      {isEditing ? "Done Editing" : "Edit Roadmap"}
                    </button>
                  </div>
                </div>
                <div className="roadmap-actions">
                  {isEditing && savedGoals.length > 0 && (
                    <div className="load-goal-section">
                      <label className="form-label">Load Saved Goal:</label>
                      <select 
                        className="goal-select"
                        onChange={(e) => {
                          if (e.target.value) {
                            loadGoal(e.target.value);
                          }
                        }}
                        defaultValue=""
                      >
                        <option value="">Select a saved goal...</option>
                        {savedGoals.map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.title} {g.startDate ? '(Started)' : '(Not Started)'}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <input
                    type="text"
                    placeholder="Add a name for your goal..."
                    className="goal-name-input"
                    value={goalName}
                    onChange={(e) => setGoalName(e.target.value)}
                  />
                  <div className="action-buttons">
                    <button 
                      className="btn-secondary" 
                      onClick={() => handleSaveGoal(false)}
                      disabled={saving}
                    >
                      {saving ? "Saving..." : "Save Goal"}
                                </button>
                    <button 
                      className="btn-primary" 
                      onClick={() => handleSaveGoal(true)}
                      disabled={saving}
                    >
                      {saving ? "Saving..." : "Save & Start Goal"}
                                </button>
                  </div>
                </div>
              </div>
              <div className="roadmap-content">
                <h3>{data.title}</h3>
                <p><strong>Total Days:</strong> {data.total_days}</p>
                <p><strong>Daily Minutes:</strong> {data.daily_minutes}</p>
                <div className="roadmap-days">
                  {data.days?.map((day: any, index: number) => (
                    <div key={index} className="roadmap-day">
                      <h4>Day {day.day}: {day.title}</h4>
                      <div className="day-sections">
                        {day.learn && (
                          <div className="section learn">
                            <h5>Learn</h5>
                            <div className="section-content">
                              {Array.isArray(day.learn) ? (
                                day.learn.map((item: any, idx: number) => (
                                  <div key={idx} className="task-item">
                                    <h6>{item.title || 'Resource'}</h6>
                                    <p>{item.description || item.content}</p>
                                    <div className="task-meta">
                                      {item.kind && (
                                        <span className={`resource-badge ${item.kind}`}>
                                          {item.kind === 'watch' ? '📺 Watch' : 
                                           item.kind === 'read' ? '📖 Read' : 
                                           item.kind === 'listen' ? '🎧 Listen' : 
                                           item.kind}
                                        </span>
                                      )}
                                      {item.url && <a href={item.url} target="_blank" rel="noopener noreferrer" className="resource-link">View Resource</a>}
                                      {item.duration_minutes && <span className="duration">{item.duration_minutes} min</span>}
                                      {item.source && <span className="source">{item.source}</span>}
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <p>{typeof day.learn === 'string' ? day.learn : JSON.stringify(day.learn)}</p>
                              )}
                            </div>
                          </div>
                        )}
                        {day.practice && (
                          <div className="section practice">
                            <h5>Practice</h5>
                            <div className="section-content">
                              {Array.isArray(day.practice) ? (
                                day.practice.map((item: any, idx: number) => (
                                  <div key={idx} className="task-item">
                                    <h6>{item.title || 'Resource'}</h6>
                                    <p>{item.description || item.content}</p>
                                    <div className="task-meta">
                                      {item.kind && (
                                        <span className={`resource-badge ${item.kind}`}>
                                          {item.kind === 'watch' ? '📺 Watch' : 
                                           item.kind === 'read' ? '📖 Read' : 
                                           item.kind === 'listen' ? '🎧 Listen' : 
                                           item.kind}
                                        </span>
                                      )}
                                      {item.url && <a href={item.url} target="_blank" rel="noopener noreferrer" className="resource-link">View Resource</a>}
                                      {item.duration_minutes && <span className="duration">{item.duration_minutes} min</span>}
                                      {item.source && <span className="source">{item.source}</span>}
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <p>{typeof day.practice === 'string' ? day.practice : JSON.stringify(day.practice)}</p>
                              )}
                            </div>
                          </div>
                        )}
                        {day.reflect && (
                          <div className="section reflect">
                            <h5>Reflect</h5>
                            <div className="section-content">
                              {Array.isArray(day.reflect) ? (
                                day.reflect.map((item: any, idx: number) => (
                                  <div key={idx} className="task-item">
                                    <h6>{item.title || 'Resource'}</h6>
                                    <p>{item.description || item.content}</p>
                                    <div className="task-meta">
                                      {item.kind && (
                                        <span className={`resource-badge ${item.kind}`}>
                                          {item.kind === 'watch' ? '📺 Watch' : 
                                           item.kind === 'read' ? '📖 Read' : 
                                           item.kind === 'listen' ? '🎧 Listen' : 
                                           item.kind}
                                        </span>
                                      )}
                                      {item.url && <a href={item.url} target="_blank" rel="noopener noreferrer" className="resource-link">View Resource</a>}
                                      {item.duration_minutes && <span className="duration">{item.duration_minutes} min</span>}
                                      {item.source && <span className="source">{item.source}</span>}
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <p>{typeof day.reflect === 'string' ? day.reflect : JSON.stringify(day.reflect)}</p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar */}
        <div className="content-sidebar">
          <div className="sidebar-section">
            <h2 className="sidebar-title">
              <Image src="/icons/check.png" alt="What We Do" width={34} height={34} className="section-icon" />
              What We Do
            </h2>
            <ul className="sidebar-list">
              <li>We turn your big goal into a daily roadmap, by finding top rated resources from the internet and reddit</li>
              <li>Each day has 3 parts: Learn, Practice, Reflect.</li>
              <li>We will send you a reminder email daily to remind you to complete your daily tasks, until you complete them all.</li>
              <li> once you complete all the tasks for the day, we will stop spamming you with emails.</li>
              <li>You earn <img src="/icons/coin.png" alt="" width={17} height={17} style={{ verticalAlign: "text-bottom", margin: "0 2px" }} /> coins for completing daily tasks.</li>
              <li>Coins can be spent in the "Shop" to buy furniture for your avatar's "Room."</li>
              <li>Each item boosts stats (Intelligence, Strength, Vitality, Aesthetic, Wealth).</li>
              <li>Higher stats unlock rarer themed items and fun statuses (e.g., Code Scholar, Fitness Freak).</li>
            </ul>
          </div>

          <div className="sidebar-section">
            <h2 className="sidebar-title">
              <Image src="/icons/lightning.png" alt="Tips" width={34} height={34} className="section-icon" />
              Tips
            </h2>
            <ul className="sidebar-list">
              <li>Be specific: "Ship a React portfolio" beats "learn coding".</li>
              <li>Pick a realistic time budget (15-60 min works great).</li>
              <li>After generation you can edit the plan after saving it to the dashboard.</li>
                    </ul>
          </div>
        </div>
      </div>

      {/* Save Goal Modal */}
      {showSaveModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '24px',
            width: '90%',
            maxWidth: '400px',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
            border: '1px solid #E5E7EB',
            textAlign: 'center'
          }}>
            {/* Icon */}
            <div style={{
              fontSize: '48px',
              marginBottom: '16px'
            }}>
              {saveModalData.success ? '✅' : '❌'}
            </div>

            {/* Title */}
            <h2 style={{
              margin: '0 0 8px 0',
              fontSize: '20px',
              fontWeight: '700',
              color: '#1F2937'
            }}>
              {saveModalData.success ? 'Success!' : 'Error'}
            </h2>

            {/* Message */}
            <p style={{
              margin: '0 0 20px 0',
              fontSize: '16px',
              color: '#6B7280',
              fontWeight: '500'
            }}>
              {saveModalData.message}
            </p>

            {/* Action Button */}
            <div style={{
              display: 'flex',
              justifyContent: 'center'
            }}>
              <button
                type="button"
                onClick={() => setShowSaveModal(false)}
                style={{
                  background: saveModalData.success ? '#10B981' : '#6A3EE8',
                  color: 'white',
                  border: 'none',
                  padding: '10px 24px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontFamily: 'inherit'
                }}
              >
                {saveModalData.success ? 'Great!' : 'OK'}
              </button>
            </div>
          </div>
          </div>
      )}
        </div>
    </AppLayout>
  );
}
