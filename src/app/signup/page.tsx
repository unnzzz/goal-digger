"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from 'next/image';

export default function SignupPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    avatarKey: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    if (!formData.avatarKey) {
      setError("Please select an avatar");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          avatarKey: formData.avatarKey,
        }),
      });

      if (response.ok) {
        setError(""); // Clear any previous errors
        // Show success modal instead of alert
        setShowSuccessModal(true);
      } else {
        const data = await response.json();
        setError(data.error || "An error occurred");
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-layout">
      <div className="auth-container">
        <div className="auth-header">
          <Image src="/icons/rocket.png" alt="Goal-Digger" width={60} height={60} className="auth-logo" />
          <h1>Join Goal-Digger!</h1>
          <p>Start your journey to achieving your dreams</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input
              type="text"
              name="name"
              className="form-input"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="Enter your full name"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              name="email"
              className="form-input"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="Enter your email"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              name="password"
              className="form-input"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="Create a password"
              minLength={6}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Confirm Password</label>
            <input
              type="password"
              name="confirmPassword"
              className="form-input"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              placeholder="Confirm your password"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Choose Your Avatar</label>
            <div className="avatar-selection">
              {[
                { key: "monkey", name: "Monkey" },
                { key: "penguin", name: "Penguin" },
                { key: "cat", name: "Cat" },
                { key: "lion", name: "Lion" },
                { key: "dog", name: "Dog" },
                { key: "rabbit", name: "Rabbit" },
                { key: "elephant", name: "Elephant" },
                { key: "duck", name: "Duck" },
                { key: "owl", name: "Owl" },
              ].map((avatar) => (
                <div
                  key={avatar.key}
                  className={`avatar-option ${formData.avatarKey === avatar.key ? 'selected' : ''}`}
                  onClick={() => setFormData({ ...formData, avatarKey: avatar.key })}
                >
                  <Image
                    src={`/avatars/${avatar.key}.png`}
                    alt={avatar.name}
                    width={60}
                    height={60}
                    className="avatar-image"
                  />
                </div>
              ))}
            </div>
            {!formData.avatarKey && (
              <p className="avatar-error">Please select an avatar</p>
            )}
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
          >
            {loading ? "Creating Account..." : "Create Account"}
          </button>
        </form>

        <div className="auth-footer">
          <p>Already have an account? <a href="/login" className="auth-link">Sign in</a></p>
        </div>
        
        <div className="verification-info">
          <h3>📧 Email Verification Required</h3>
          <p>After signing up, you'll receive a verification email. Click the link in the email to activate your account, then you can sign in.</p>
          <div className="dev-note">
            <strong>Development Note:</strong> Check the console where the dev server is running for the Ethereal email preview URL.
          </div>
          <div className="verification-steps">
            <div className="step">
              <span className="step-number">1</span>
              <span>Check your email inbox</span>
            </div>
            <div className="step">
              <span className="step-number">2</span>
              <span>Click the verification link</span>
            </div>
            <div className="step">
              <span className="step-number">3</span>
              <span>Return here to sign in</span>
            </div>
          </div>
        </div>
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => {
            setShowSuccessModal(false);
            router.push("/login?message=Account created! Check your email for verification link.");
          }}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '20px',
              padding: '40px',
              maxWidth: '500px',
              width: '90%',
              textAlign: 'center',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                fontSize: '48px',
                marginBottom: '20px',
              }}
            >
              ✅
            </div>
            <h2
              style={{
                fontSize: '24px',
                fontWeight: '700',
                color: '#1F2937',
                marginBottom: '16px',
                fontFamily: "'Baloo Bhai', sans-serif",
              }}
            >
              Account Created Successfully!
            </h2>
            <p
              style={{
                fontSize: '16px',
                color: '#6B7280',
                marginBottom: '32px',
                lineHeight: '1.5',
                fontFamily: "'Baloo Bhai', sans-serif",
              }}
            >
              Please check your email and click the verification link to activate your account.
            </p>
            <button
              onClick={() => {
                setShowSuccessModal(false);
                router.push("/login?message=Account created! Check your email for verification link.");
              }}
              style={{
                backgroundColor: 'linear-gradient(45deg, #8B5CF6, #A78BFA)',
                background: 'linear-gradient(45deg, #8B5CF6, #A78BFA)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                padding: '12px 32px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                fontFamily: "'Baloo Bhai', sans-serif",
                boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)',
                transition: 'all 0.3s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'linear-gradient(45deg, #7C3AED, #9333EA)';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 20px rgba(139, 92, 246, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'linear-gradient(45deg, #8B5CF6, #A78BFA)';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(139, 92, 246, 0.3)';
              }}
            >
              Continue to Login
            </button>
          </div>
        </div>
      )}
    </div>
  );
}