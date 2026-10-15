import { useState } from "react";
import "./App.css";

function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Login failed");
        setLoading(false);
        return;
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      onLogin(data.user);
    } catch {
      setError("Cannot connect to server. Ensure the backend is running.");
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <div className="login-logo">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 10 4 20" />
              <path d="M5 8c3-4 9-5 14-2-1 3-1 5-3 7-1-3-3-5-6-6z" />
            </svg>
          </div>
          <div>
            <h1 className="login-title">MineTrack</h1>
            <p className="login-sub">Equipment &amp; Tyre Maintenance Platform</p>
          </div>
        </div>

        <div className="login-divider" />

        <form onSubmit={handleLogin} noValidate>
          <h2 className="login-heading">Sign in to your account</h2>
          <p className="login-desc">Enter your credentials to access the dashboard.</p>

          {error && (
            <div className="login-error">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3 2 20h20z" /><path d="M12 10v4M12 17.5v.01" />
              </svg>
              {error}
            </div>
          )}

          <div className="login-field">
            <label htmlFor="login-email">Email address</label>
            <input
              id="login-email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className="login-field">
            <label htmlFor="login-password">Password</label>
            <input
              id="login-password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          <button type="submit" className="login-btn" disabled={loading}>
            {loading && (
              <span style={{
                width: "16px", height: "16px", borderRadius: "50%",
                border: "2px solid rgba(255,255,255,0.4)",
                borderTopColor: "#fff",
                animation: "spin 0.7s linear infinite",
                display: "inline-block"
              }} />
            )}
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="login-footer">
          Mining Equipment &amp; Tyre Maintenance System v2.0
        </p>
      </div>
    </div>
  );
}

export default Login;