'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import AppLayout from '../../../components/AppLayout';
import { useUserData } from '@/hooks/useUserData';

export default function QuizPage() {
  const params = useParams();
  const router = useRouter();
  const dayNumber = parseInt(params.day as string);
  const { userData } = useUserData();
  
  const [quiz, setQuiz] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(true);
  const [attempts, setAttempts] = useState(0);
  const [maxAttempts] = useState(1);
  const [showError, setShowError] = useState<string | null>(null);

  useEffect(() => {
    // Get goalId first
    const goalId = new URLSearchParams(window.location.search).get('goalId') || 
                  localStorage.getItem('currentGoalId');
    
    if (!goalId) {
      // Show error modal instead of alert
      setShowResults(true);
      setFinalScore(0);
      setShowError('Goal ID not found!');
      setTimeout(() => window.close(), 3000);
      return;
    }
    
    // Check if quiz has already been completed (any attempt)
    const quizPassed = localStorage.getItem(`quiz-passed-${goalId}-day-${dayNumber}`) === 'true';
    const quizCompleted = localStorage.getItem(`quiz-completed-${goalId}-day-${dayNumber}`);
    
    if (quizPassed || quizCompleted) {
      // Quiz already completed, redirect back
      setShowResults(true);
      setFinalScore(0);
      setShowError('You have already completed this quiz!');
      setTimeout(() => window.close(), 3000);
      return;
    }

    // Load quiz data from the current goal's roadmap
    const loadQuiz = async () => {
      try {
        // Get the current goal ID from the URL or localStorage
        const goalId = new URLSearchParams(window.location.search).get('goalId') || 
                      localStorage.getItem('currentGoalId');
        
        if (goalId) {
          // Fetch the goal data from the API
          const response = await fetch(`/api/goals/${goalId}`);
          if (response.ok) {
            const data = await response.json();
            const dayData = data.goal.roadmapJson?.days?.find((d: any) => d.day === dayNumber);
            if (dayData && dayData.quiz) {
              console.log('Found quiz data for day', dayNumber, ':', dayData.quiz);
              setQuiz(dayData.quiz);
            } else {
              console.log('No quiz data found for day', dayNumber, 'in roadmap');
            }
          }
        } else {
          // Fallback: try localStorage
          const roadmap = localStorage.getItem('currentRoadmap');
          if (roadmap) {
            const roadmapData = JSON.parse(roadmap);
            const dayData = roadmapData.days.find((d: any) => d.day === dayNumber);
            if (dayData && dayData.quiz) {
              setQuiz(dayData.quiz);
            }
          }
        }
      } catch (error) {
        console.error('Error loading quiz:', error);
      } finally {
        setLoading(false);
      }
    };

    loadQuiz();
  }, [dayNumber]);

  const handleAnswerChange = (questionIndex: number, answer: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionIndex]: answer
    }));
  };

  const calculateScore = () => {
    if (!quiz) return 0;
    
    let correct = 0;
    quiz.forEach((question: any, index: number) => {
      if (answers[index] === question.correct) {
        correct++;
      }
    });
    
    return Math.round((correct / quiz.length) * 100);
  };

  const handleSubmit = async () => {
    const finalScore = calculateScore();
    const newAttempts = attempts + 1;
    setScore(finalScore);
    setSubmitted(true);
    setShowResults(true);
    setAttempts(newAttempts);
    
    // Award coins if passed (80% or higher)
    if (finalScore >= 80) {
      try {
        const goalId = new URLSearchParams(window.location.search).get('goalId') || 
                      localStorage.getItem('currentGoalId');
        
        if (goalId) {
          const response = await fetch('/api/quiz/complete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              goalId: goalId,
              dayNumber: dayNumber,
              score: finalScore
            })
          });
          
          if (response.ok) {
            const data = await response.json();
            console.log('Quiz completed successfully:', data);
            // Refresh user data to show updated coins
            window.dispatchEvent(new Event("coins:refresh"));
          } else {
            console.error('Failed to complete quiz:', await response.text());
          }
        }
      } catch (error) {
        console.error('Failed to complete quiz:', error);
      }
    }
    
    // Get goalId for localStorage storage
    const goalId = new URLSearchParams(window.location.search).get('goalId') || 
                  localStorage.getItem('currentGoalId');
    
    if (goalId) {
      // Store quiz completion (always completed after one attempt)
      localStorage.setItem(`quiz-completed-${goalId}-day-${dayNumber}`, JSON.stringify({
        score: finalScore,
        passed: finalScore >= 80,
        attempts: newAttempts,
        completedAt: new Date().toISOString()
      }));
      
      // Store passed status only if score >= 80% (for coins and next day unlock)
      if (finalScore >= 80) {
        localStorage.setItem(`quiz-passed-${goalId}-day-${dayNumber}`, 'true');
      }
    }
    
    // Always dispatch event to refresh dashboard (quiz is completed regardless of score)
    window.dispatchEvent(new Event('quiz-completed'));
  };

  const handleRetake = () => {
    setShowError('You have already completed this quiz. Only one attempt is allowed.');
  };

  const handleBackToGoal = () => {
    // Get goal ID from URL params or localStorage
    const goalId = new URLSearchParams(window.location.search).get('goalId') || 
                  localStorage.getItem('currentGoalId');
    if (goalId) {
      router.push(`/goal/${goalId}`);
    } else {
      router.push('/dashboard');
    }
  };

  if (loading) {
    return (
      <AppLayout activePage="quiz">
        <div className="content-main" style={{ padding: "32px" }}>
          <div style={{
            background: 'white',
            padding: '40px',
            borderRadius: '16px',
            textAlign: 'center',
            boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
            fontFamily: 'Baloo Bhai, cursive'
          }}>
            <div style={{ fontSize: '24px', marginBottom: '16px' }}>🧠</div>
            <div>Loading quiz...</div>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!quiz || quiz.length === 0) {
    return (
      <AppLayout activePage="quiz">
        <div className="content-main" style={{ padding: "32px" }}>
          <div style={{
            background: 'white',
            padding: '40px',
            borderRadius: '16px',
            textAlign: 'center',
            boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
            maxWidth: '500px',
            margin: '0 auto',
            fontFamily: 'Baloo Bhai, cursive'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>❌</div>
            <h2 style={{ color: '#1F2937', marginBottom: '16px' }}>Quiz Not Available</h2>
            <p style={{ color: '#6B7280', marginBottom: '24px' }}>
              No quiz found for Day {dayNumber}. Please complete the learn, practice, and reflect quests first.
            </p>
            <button
              onClick={handleBackToGoal}
              style={{
                background: 'linear-gradient(135deg, #6A3EE8, #8B5CF6)',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                fontFamily: 'Baloo Bhai, cursive'
              }}
            >
              Back to Goal
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout activePage="quiz">
      <div className="content-main" style={{ padding: "32px" }}>
        <div style={{
          maxWidth: '800px',
          margin: '0 auto',
          background: 'white',
          borderRadius: '16px',
          padding: '40px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
          fontFamily: 'Baloo Bhai, cursive'
        }}>
        {/* Header */}
        <div style={{
          textAlign: 'center',
          marginBottom: '40px',
          paddingBottom: '20px',
          borderBottom: '2px solid #E5E7EB'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🧠</div>
          <h1 style={{
            color: '#1F2937',
            fontSize: '32px',
            marginBottom: '8px',
            fontWeight: '700'
          }}>
            Day {dayNumber} Quiz
          </h1>
          <p style={{
            color: '#6B7280',
            fontSize: '18px',
            marginBottom: '16px'
          }}>
            Test your knowledge! Score 80% or higher to unlock the next day's quests.
          </p>
          <div style={{
            background: '#F3F4F6',
            padding: '12px 20px',
            borderRadius: '8px',
            display: 'inline-block'
          }}>
            <span style={{ fontWeight: '600', color: '#1F2937' }}>
              {quiz.length} Questions • 80% Required to Pass • 1 Attempt Only
            </span>
          </div>
        </div>

        {!showResults ? (
          /* Quiz Questions */
          <div>
            {quiz.map((question: any, questionIndex: number) => (
              <div key={questionIndex} style={{
                marginBottom: '32px',
                padding: '24px',
                background: '#F9FAFB',
                borderRadius: '12px',
                border: '1px solid #E5E7EB'
              }}>
                <h3 style={{
                  color: '#1F2937',
                  fontSize: '20px',
                  marginBottom: '20px',
                  fontWeight: '600'
                }}>
                  {questionIndex + 1}. {question.question}
                </h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {Object.entries(question.options).map(([key, value]) => (
                    <label key={key} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '16px 20px',
                      background: answers[questionIndex] === key ? '#EDE9FE' : 'white',
                      border: answers[questionIndex] === key ? '2px solid #8B5CF6' : '2px solid #E5E7EB',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      fontWeight: '500'
                    }}>
                      <input
                        type="radio"
                        name={`question-${questionIndex}`}
                        value={key}
                        checked={answers[questionIndex] === key}
                        onChange={(e) => handleAnswerChange(questionIndex, e.target.value)}
                        style={{
                          width: '20px',
                          height: '20px',
                          accentColor: '#8B5CF6'
                        }}
                      />
                      <span style={{
                        color: answers[questionIndex] === key ? '#1F2937' : '#6B7280',
                        fontSize: '16px'
                      }}>
                        {key}. {String(value)}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ))}

            {/* Submit Button */}
            <div style={{ textAlign: 'center', marginTop: '40px' }}>
              <button
                onClick={handleSubmit}
                disabled={Object.keys(answers).length !== quiz.length}
                style={{
                  background: Object.keys(answers).length === quiz.length 
                    ? 'linear-gradient(135deg, #8B5CF6, #A855F7)' 
                    : '#D1D5DB',
                  color: 'white',
                  border: 'none',
                  padding: '16px 32px',
                  borderRadius: '12px',
                  fontSize: '18px',
                  fontWeight: '600',
                  cursor: Object.keys(answers).length === quiz.length ? 'pointer' : 'not-allowed',
                  transition: 'all 0.2s ease',
                  fontFamily: 'Baloo Bhai, cursive',
                  boxShadow: Object.keys(answers).length === quiz.length 
                    ? '0 8px 20px rgba(139, 92, 246, 0.3)' 
                    : 'none'
                }}
              >
                Submit Quiz
              </button>
              <p style={{
                color: '#6B7280',
                fontSize: '14px',
                marginTop: '12px'
              }}>
                Answer all questions to submit
              </p>
            </div>
          </div>
        ) : (
          /* Results */
          <div style={{ textAlign: 'center' }}>
            {showError ? (
              <div>
                <div style={{
                  fontSize: '64px',
                  marginBottom: '24px'
                }}>
                  ⚠️
                </div>
                <h2 style={{
                  color: '#DC2626',
                  fontSize: '32px',
                  marginBottom: '16px',
                  fontWeight: '700'
                }}>
                  Error
                </h2>
                <p style={{
                  color: '#6B7280',
                  fontSize: '18px',
                  marginBottom: '32px',
                  lineHeight: '1.6'
                }}>
                  {showError}
                </p>
                <button
                  onClick={handleBackToGoal}
                  style={{
                    background: 'linear-gradient(135deg, #6A3EE8, #8B5CF6)',
                    color: 'white',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    fontFamily: 'Baloo Bhai, cursive'
                  }}
                >
                  Back to Goal
                </button>
              </div>
            ) : (
              <div>
                <div style={{
                  fontSize: '64px',
                  marginBottom: '24px'
                }}>
                  {score >= 80 ? '🎉' : '😔'}
                </div>
            
            <h2 style={{
              color: score >= 80 ? '#10B981' : '#EF4444',
              fontSize: '32px',
              marginBottom: '16px',
              fontWeight: '700'
            }}>
              {score >= 80 ? 'Congratulations!' : 'Try Again'}
            </h2>
            
            <div style={{
              background: score >= 80 ? '#D1FAE5' : '#FEE2E2',
              color: score >= 80 ? '#065F46' : '#991B1B',
              padding: '20px',
              borderRadius: '12px',
              marginBottom: '24px',
              fontSize: '24px',
              fontWeight: '600'
            }}>
              Score: {score}%
            </div>
            
            <p style={{
              color: '#6B7280',
              fontSize: '18px',
              marginBottom: '32px',
              lineHeight: '1.6'
            }}>
              {score >= 80 
                ? `Great job! You've unlocked Day ${dayNumber + 1}'s quests. Keep up the excellent work!`
                : `You need 80% to pass. Don't worry, you can retake the quiz to improve your score.`
              }
            </p>

            {/* Show correct answers */}
            <div style={{
              background: '#F9FAFB',
              padding: '24px',
              borderRadius: '12px',
              marginBottom: '32px',
              textAlign: 'left'
            }}>
              <h3 style={{
                color: '#1F2937',
                fontSize: '20px',
                marginBottom: '16px',
                textAlign: 'center'
              }}>
                Quiz Review
              </h3>
              {quiz.map((question: any, questionIndex: number) => (
                <div key={questionIndex} style={{
                  marginBottom: '16px',
                  padding: '16px',
                  background: 'white',
                  borderRadius: '8px',
                  border: '1px solid #E5E7EB'
                }}>
                  <div style={{
                    fontWeight: '600',
                    color: '#1F2937',
                    marginBottom: '8px'
                  }}>
                    {questionIndex + 1}. {question.question}
                  </div>
                  <div style={{
                    color: answers[questionIndex] === question.correct ? '#10B981' : '#EF4444',
                    fontWeight: '500'
                  }}>
                    Your answer: {answers[questionIndex]} {answers[questionIndex] === question.correct ? '✓' : '✗'}
                  </div>
                  <div style={{ color: '#6B7280', fontSize: '14px' }}>
                    Correct answer: {question.correct}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
              {score < 80 && (
                <div style={{
                  background: '#FEE2E2',
                  color: '#991B1B',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  textAlign: 'center'
                }}>
                  Quiz failed. Try again tomorrow!
                </div>
              )}
              <button
                onClick={handleBackToGoal}
                style={{
                  background: 'linear-gradient(135deg, #6A3EE8, #8B5CF6)',
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontFamily: 'Baloo Bhai, cursive'
                }}
              >
                Back to Goal
              </button>
            </div>
              </div>
            )}
          </div>
        )}
        </div>
      </div>
    </AppLayout>
  );
}
