import { Link, Navigate, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import mascotLogin from "../assets/images/mascot-login.png";
import { useAuth } from "../auth/auth-context";
import { AuthForm } from "../components/AuthForm";
import AuthStage from "../components/AuthStage";

export default function LoginPage() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();

  if (user) return <Navigate to="/" replace />;

  return (
    <AuthStage
      mascotSrc={mascotLogin}
      mascotAlt="물을 주는 Patience 마스코트"
      eyebrow="Welcome back"
      title="다시 만나서 반가워요"
      subtitle="멈춰 둔 그 자리에서 그대로 이어서 시작해요."
      accent="moss"
    >
      <AuthForm
        accent="leaf"
        submitLabel="로그인"
        pendingLabel="확인 중…"
        errorFallback="로그인에 실패했습니다."
        passwordAutoComplete="current-password"
        submitClassName="bg-[var(--moss)] text-[var(--sand)] hover:bg-[var(--moss-deep)]"
        onSubmit={async (username, password) => {
          const me = await api.login(username, password);
          setUser(me);
          navigate("/", { replace: true });
        }}
        footer={
          <p className="mt-8 text-center text-sm text-[var(--ink)]/60">
            계정이 없나요?{" "}
            <Link
              className="font-semibold text-[var(--moss)] underline-offset-4 transition hover:underline"
              to="/signup"
            >
              회원가입
            </Link>
          </p>
        }
      />
    </AuthStage>
  );
}
