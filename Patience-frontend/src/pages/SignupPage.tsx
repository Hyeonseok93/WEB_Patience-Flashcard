import { Navigate } from "react-router-dom";
import mascotSignup from "../assets/images/mascot-signup.png";
import { useAuth } from "../auth/auth-context";
import AuthStage from "../components/AuthStage";
import { SignupForm } from "../components/SignupForm";

export default function SignupPage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="grid min-h-dvh place-items-center bg-[var(--cream)] text-sm text-[var(--ink)]/50">
        확인 중…
      </div>
    );
  }
  if (user) return <Navigate to="/" replace />;

  return (
    <AuthStage
      mascotSrc={mascotSignup}
      mascotAlt="손 흔드는 Patience 마스코트"
      eyebrow="Get started"
      title="함께 키워볼까요"
      subtitle="닉네임과 메일로 자리를 만들어요. 메일 인증을 마쳐야 가입돼요."
      accent="gold"
    >
      <SignupForm />
    </AuthStage>
  );
}
