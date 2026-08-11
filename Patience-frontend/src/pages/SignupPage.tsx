import { Navigate } from "react-router-dom";
import mascotSignup from "../assets/images/mascot-signup.png";
import { useAuth } from "../auth/auth-context";
import AuthStage from "../components/AuthStage";
import { SignupForm } from "../components/SignupForm";

export default function SignupPage() {
  const { user } = useAuth();

  if (user) return <Navigate to="/" replace />;

  return (
    <AuthStage
      mascotSrc={mascotSignup}
      mascotAlt="손 흔드는 Patience 마스코트"
      eyebrow="Get started"
      title="함께 키워볼까요"
      subtitle="카드를 담아 둘 내 자리를 만드는 데는 잠깐이면 돼요."
      accent="gold"
    >
      <SignupForm />
    </AuthStage>
  );
}
