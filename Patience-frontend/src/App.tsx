import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth/auth-context";
import DecksPage from "./pages/DecksPage";
import EditDeckPage from "./pages/EditDeckPage";
import ErrorPage from "./pages/ErrorPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import LoginPage from "./pages/LoginPage";
import PlayPage from "./pages/PlayPage";
import SignupPage from "./pages/SignupPage";

function Protected({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-[var(--cream)] text-[var(--ink)]/50">
        불러오는 중…
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route
        path="/"
        element={
          <Protected>
            <DecksPage />
          </Protected>
        }
      />
      <Route
        path="/play/:deckId"
        element={
          <Protected>
            <PlayPage />
          </Protected>
        }
      />
      <Route
        path="/decks/:deckId/edit"
        element={
          <Protected>
            <EditDeckPage />
          </Protected>
        }
      />
      <Route path="*" element={<ErrorPage kind="not-found" />} />
    </Routes>
  );
}
