# Cramer 3D Competition Website

이 폴더는 그대로 웹사이트로 배포할 수 있는 Node 기반 웹앱입니다.

## 포함 기능

- 크래머 공식과 평면 방정식 기반 3D 입체 생성
- 1번 기본 모델, 2번 평면 수정 실험 모델
- 크래머 공식 적용 과정 시각화
- 구글 아이디와 참가자 이름으로 3D 사진 제출
- 미적 점수 자동 계산 및 순위 갤러리
- 제출 데이터 서버 저장

## 로컬 실행

```bash
npm start
```

브라우저에서 아래 주소를 엽니다.

```text
http://localhost:4174
```

## 온라인 배포 방식

정적 사이트만 올리는 방식으로는 대회 갤러리 서버 저장이 되지 않습니다.
`server.mjs`를 실행할 수 있는 Node 서버형 배포가 필요합니다.

## Render 배포

이 폴더에는 `render.yaml`이 포함되어 있습니다.
GitHub 저장소에 올린 뒤 Render에서 Blueprint로 연결하면 Node 웹서비스로 배포할 수 있습니다.

Render 설정 핵심값:

```text
Runtime: Node
Build command: npm install
Start command: npm start
Environment variable: DATA_DIR=/var/data
Persistent disk: /var/data
```

`server.mjs`는 `process.env.PORT`가 있으면 그 값을 사용하고, 없으면 `4174`를 사용합니다.

## 저장 데이터

대회 제출 작품은 기본적으로 `submissions.json`에 저장됩니다.
온라인 배포에서는 `DATA_DIR` 환경변수가 있으면 그 폴더 안의 `submissions.json`에 저장됩니다.
서버가 파일을 유지하지 않는 환경이라면 데이터베이스나 Firebase 같은 저장소로 바꾸는 것이 좋습니다.

## 구글 로그인 관련

현재 버전은 실제 Google OAuth 로그인이 아니라 사용자가 구글 아이디를 직접 입력하는 방식입니다.
진짜 구글 로그인까지 붙이려면 Google OAuth 또는 Firebase Authentication 설정이 필요합니다.
