# Cramer 3D Competition Website

크래머 공식과 평면 방정식을 이용해 3D 입체를 만들고, 작품을 대회 갤러리에 제출하는 Node 기반 웹사이트입니다.

## 주요 기능

- 평면 부등식으로 입체 조건 생성
- 세 평면의 교점을 크래머 공식으로 계산
- 기본 모델과 평면 수정 실험 모델 시각화
- 학번, 이름, 작품명, 미적 의도를 입력해 작품 제출
- 학번 기준 중복 제출 방지
- Supabase 연결 시 온라인 영구 데이터베이스 저장

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

무료 Render 웹 서비스는 서버 파일 저장이 영구 보존되지 않습니다. 제출 데이터를 계속 보존하려면 Supabase 같은 외부 데이터베이스를 연결해야 합니다.

## Supabase 영구 DB 설정

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

- Supabase 환경 변수가 있으면 온라인 영구 DB에 저장됩니다.
- Supabase 환경 변수가 없으면 서버의 `submissions.json`에 저장됩니다.
- Render 무료 서버의 로컬 파일은 재시작 시 보존되지 않을 수 있으므로, 실제 온라인 대회 제출 기록은 Supabase 연결을 권장합니다.
