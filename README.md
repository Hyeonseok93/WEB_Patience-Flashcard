# Patience Flashcard

무엇이든 외울 것을 담아 두는 **플래시카드 웹 서비스** (React · Vite · Tailwind · Spring Boot · PostgreSQL).

로컬은 Docker Compose로 FE / BE / DB를 한 번에 올립니다.

## 제품 요약

| 흐름 | 설명 |
|------|------|
| 인증 | 회원가입 · 로그인 (JWT HttpOnly 쿠키) |
| 세트 선택 | **탭 2개** — `기본 제공` / `내 세트` |
| 내 세트 | xlsx 업로드 → 서버 검증·파싱 → DB 카드로 저장 (원본 xlsx는 보관하지 않음) |
| 플레이 | 미니 Ver9와 동일한 다층 플래시카드 진행도 (카드 id 기준, DB 저장) |
| 내 세트 편집 | 이름 변경 · 엑셀 교체 · 카드 추가/수정/삭제 |

## 아키텍처

```text
Browser ──► nginx (FE :80) ──/api/*──► Spring Boot (:8080) ──► PostgreSQL
                 │
                 └── static SPA (React)
```

- `decks.source_type = BUILTIN | USER`
- BUILTIN: `owner_id IS NULL` (시드), 모든 로그인 사용자 읽기 전용
- USER: 본인 소유만 CRUD + xlsx import
- `study_progress`: 사용자×세트 진행도 JSON (levels / queue)

## 로컬 실행

```bash
cp .env.example .env
cd Patience-local
docker compose up --build
```

- Frontend: http://localhost
- API: http://localhost:8080
- Health: http://localhost:8080/actuator/health

로컬 FE 개발만 할 때:

```bash
cd Patience-frontend
npm install
npm run dev   # Vite :5173, /api → :8080 프록시
```

## 레포 구조

```text
WEB_Patience_Flashcard/
├── Patience-frontend/     # React + Vite + TS + Tailwind
│   └── src/assets/        # fonts (Fraunces·Pretendard), mascot images
├── Patience-backend/      # Spring Boot + Java 21 + Flyway
└── Patience-local/        # docker-compose
```

배포 시 `SPRING_PROFILES_ACTIVE=prod` 와 고유 `JWT_SECRET`·SMTP 환경변수를 설정하세요. nginx는 `/api`만 프록시하며 actuator는 공개하지 않습니다.
