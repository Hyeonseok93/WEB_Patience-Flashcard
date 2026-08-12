// Cursor/VS Code Java LS는 워크스페이스 루트의 Gradle을 찾는다.
// includeBuild는 소스 프로젝트로 안 잡혀 Java(16) non-project 경고가 난다.
rootProject.name = "patience"
include("Patience-backend")
