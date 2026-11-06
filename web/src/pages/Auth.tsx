import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api, ApiError } from "../lib/api";
import { useAuth } from "../lib/auth";

export function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get("next") || "/dashboard";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await api.login(username.trim(), password);
      signIn(res.token, { username: res.username, role: res.role, profile_id: res.profile_id });
      navigate(next);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Login failed.");
    } finally {
      setBusy(false);
    }
  };

  const demoLogin = async (u: string) => {
    setError("");
    try {
      const res = await api.login(u, "demo1234");
      signIn(res.token, { username: res.username, role: res.role, profile_id: res.profile_id });
      navigate("/dashboard");
    } catch {
      setError("Demo login failed — is the API running?");
    }
  };

  return (
    <div className="page">
      <div className="wrap" style={{ maxWidth: "560px" }}>
        <p className="eyebrow">Welcome back</p>
        <h1>Log in</h1>
        <form onSubmit={submit} className="panel stack" style={{ marginTop: "1.5rem" }}>
          <div>
            <label htmlFor="li-user">Username</label>
            <input id="li-user" value={username} onChange={(e) => setUsername(e.target.value)} required autoComplete="username" />
          </div>
          <div>
            <label htmlFor="li-pass">Password</label>
            <input id="li-pass" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
          </div>
          {error && <p className="error">{error}</p>}
          <button className="btn" type="submit" disabled={busy}>
            {busy ? "Logging in…" : "Log in"}
          </button>
          <p className="muted">
            No account yet? <Link to="/signup">Sign up free</Link>.
          </p>
        </form>
        <div className="panel stack" style={{ marginTop: "1rem" }}>
          <strong>Try the demo</strong>
          <p className="muted" style={{ margin: 0 }}>
            One tap to look around with a demo account — no sign-up needed.
          </p>
          <div className="row">
            <button className="btn btn-ghost btn-sm" type="button" onClick={() => demoLogin("client_demo")}>
              Demo client
            </button>
            <button className="btn btn-ghost btn-sm" type="button" onClick={() => demoLogin("braider_demo")}>
              Demo braider
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Signup() {
  const [params] = useSearchParams();
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"braider" | "client">(
    params.get("role") === "braider" ? "braider" : "client",
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const next = params.get("next") || "/dashboard";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await api.register(username.trim(), password, role, displayName.trim() || username.trim());
      signIn(res.token, { username: res.username, role: res.role, profile_id: res.profile_id });
      navigate(next);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Sign-up failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page">
      <div className="wrap" style={{ maxWidth: "560px" }}>
        <p className="eyebrow">Join Kormo Mela</p>
        <h1>Create your account</h1>
        <p className="lede">Free for everyone on campus. Pick your side — you can only be one per account.</p>
        <form onSubmit={submit} className="panel stack" style={{ marginTop: "1.5rem" }}>
          <div>
            <label>I am here to…</label>
            <div className="chip-row">
              <button
                type="button"
                className="chip"
                aria-pressed={role === "client"}
                onClick={() => setRole("client")}
              >
                Get my hair braided
              </button>
              <button
                type="button"
                className="chip"
                aria-pressed={role === "braider"}
                onClick={() => setRole("braider")}
              >
                Braid hair for others
              </button>
            </div>
          </div>
          <div>
            <label htmlFor="su-display">Display name</label>
            <input
              id="su-display"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={role === "braider" ? "e.g. Adaeze" : "e.g. Maya"}
              required
            />
          </div>
          <div>
            <label htmlFor="su-user">Username</label>
            <input id="su-user" value={username} onChange={(e) => setUsername(e.target.value)} required autoComplete="username" />
          </div>
          <div>
            <label htmlFor="su-pass">Password</label>
            <input id="su-pass" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={4} autoComplete="new-password" />
          </div>
          {error && <p className="error">{error}</p>}
          <button className="btn" type="submit" disabled={busy}>
            {busy ? "Creating…" : role === "braider" ? "Create braider account" : "Create client account"}
          </button>
          <p className="muted">
            Already have an account? <Link to="/login">Log in</Link>.
          </p>
        </form>
      </div>
    </div>
  );
}
