import { HashRouter, Link, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./lib/auth";
import Home from "./pages/Home";
import Browse from "./pages/Browse";
import BraiderDetail from "./pages/BraiderDetail";
import { Login, Signup } from "./pages/Auth";
import ClientDashboard from "./pages/ClientDashboard";
import BraiderDashboard from "./pages/BraiderDashboard";
import { BraidBand } from "./components/ui";

function DashboardRoute() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login?next=/dashboard" replace />;
  return user.role === "braider" ? <BraiderDashboard /> : <ClientDashboard />;
}

function Header() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  return (
    <header className="site-header">
      <div className="wrap">
        <Link className="brand" to="/">
          Kormo Mela <small>braids on campus</small>
        </Link>
        <nav className="nav">
          <Link to="/browse">Find a braider</Link>
          {user ? (
            <>
              <Link to="/dashboard">My dashboard</Link>
              <span style={{ color: "var(--gold-soft)" }}>
                {user.username} · {user.role}
              </span>
              <button
                type="button"
                className="btn btn-light btn-sm"
                onClick={() => {
                  signOut();
                  navigate("/");
                }}
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link to="/signup?role=braider">List your chair</Link>
              <Link to="/login">Log in</Link>
              <Link to="/signup" className="btn btn-gold btn-sm">
                Sign up
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <Header />
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/browse" element={<Browse />} />
            <Route path="/braiders/:id" element={<BraiderDetail />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/dashboard" element={<DashboardRoute />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <footer className="site-footer">
          <div className="wrap">
            <BraidBand />
            <p>
              <strong style={{ color: "var(--cream)" }}>Kormo Mela</strong> — a campus
              marketplace for braiding services, built by a Cornell student for
              Black women on campus. Student braiders, real prices, no chasing DMs.
            </p>
            <p>
              A free community project. Listings marked “Demo profile” are seeded
              examples, not real people.
            </p>
          </div>
        </footer>
      </HashRouter>
    </AuthProvider>
  );
}
