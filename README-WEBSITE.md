# Cramer 3D Competition Website

크래머 공식과 평면 방정식을 이용해 3D 입체를 만들고, 작품을 대회 갤러리에 제출하는 Node 기반 웹사이트입니다.

## 주요 기능

- 평면 부등식으로 입체 조건 생성
- 세 평면의 교점을 크래머 공식으로 계산
- 기본 모델과 평면 수정 실험 모델 시각화
- 학번, 이름, 작품명, 미적 의도를 입력해 작품 제출
- 학번 기준 중복 제출 방지
- Render PostgreSQL 또는 Supabase 연결 시 온라인 영구 데이터베이스 저장
- 시상식 화면용 갤러리 자동 새로고침

## 로컬 실행

```bash
npm start
```

브라우저에서 아래 주소를 엽니다.

```text
http://localhost:4174
```

## 온라인 배포

Render 같은 Node 서버 배포 환경에서 실행할 수 있습니다.

```text
Build command: npm install
Start command: npm start
```

무료 Render 웹 서비스의 서버 파일 저장은 재시작 시 사라질 수 있습니다. 이 프로젝트의 `render.yaml`은 Render PostgreSQL 데이터베이스를 함께 만들고, `DATABASE_URL`을 웹 서비스에 연결하도록 설정되어 있습니다.

배포 후 `/api/storage-status`가 아래처럼 나오면 시상식 갤러리가 온라인 DB를 사용 중입니다.

```json
{"mode":"postgres","persistent":true}
```

만약 `{"mode":"file","persistent":false}`가 나오면 아직 DB가 연결되지 않은 상태입니다. Render Blueprint를 다시 동기화하거나, Render Dashboard에서 `DATABASE_URL` 환경 변수가 연결되어 있는지 확인해야 합니다.

## Render PostgreSQL 저장 방식

서버는 `DATABASE_URL` 환경 변수가 있으면 시작 후 첫 API 요청에서 `cramer_submissions` 테이블을 자동 생성합니다. 별도의 SQL 실행 없이 다음 데이터를 저장합니다.

- 학번, 이름, 작품명, 미적 의도
- 3D 사진 이미지
- 자동 미적 점수와 세부 점수
- 꼭짓점 수, 사용 모델, 평면 요약

갤러리는 5초마다 서버에서 목록을 다시 불러오므로, 다른 학생이 제출한 작품도 시상식 화면의 순위에 자동 반영됩니다.

## Supabase 영구 DB 설정

Render PostgreSQL 대신 Supabase를 쓰고 싶을 때만 아래 설정을 사용합니다.

Supabase SQL Editor에서 아래 SQL을 실행합니다.

```sql
create table if not exists cramer_submissions (
  id text primary key,
  "displayName" text not null,
  "studentId" text not null unique,
  title text not null,
  description text,
  source text,
  "sourceLabel" text,
  model text,
  image text not null,
  "createdAt" timestamptz not null,
  "aestheticScore" integer not null,
  "scoreBreakdown" jsonb,
  "vertexCount" integer,
  "planeSummary" text
);
```

Render 환경 변수에 다음 값을 추가합니다.

```text
SUPABASE_URL=Supabase project URL
SUPABASE_SERVICE_ROLE_KEY=Supabase service_role key
```

이 두 값이 설정되면 `/api/submissions`는 `submissions.json` 대신 Supabase의 `cramer_submissions` 테이블을 사용합니다.

## 저장 방식

- `DATABASE_URL`이 있으면 Render PostgreSQL에 저장됩니다.
- `DATABASE_URL`이 없고 Supabase 환경 변수가 있으면 Supabase에 저장됩니다.
- 둘 다 없으면 서버의 `submissions.json`에 임시 저장됩니다.
- 서버 API가 완전히 막히면 마지막 fallback으로 해당 브라우저의 localStorage에만 저장됩니다.
