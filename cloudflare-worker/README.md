# Piston API Cloudflare Worker 프록시

Cloudflare Worker를 사용하여 Chrome Extension에서 Piston API로의 요청을 프록시합니다.
이 Worker는 요청을 검증하고, 속도 제한을 적용하며, API 키를 안전하게 관리합니다.

## 기능

- Chrome Extension 요청 프록시 (Piston API로 전달)
- IP 기반 속도 제한 (분당 10개 요청)
- `chrome-extension://` origin 검증
- API 키 환경변수로 관리
- CORS 헤더 처리
- 429 상태 코드와 `Retry-After` 헤더로 속도 제한 응답

## 사전 요구 사항

1. **Cloudflare 계정**
   - [Cloudflare](https://dash.cloudflare.com)에서 무료 계정 생성

2. **Node.js 및 npm**
   - Node.js 16 이상 필요
   - [nodejs.org](https://nodejs.org)에서 다운로드

3. **Wrangler CLI**
   - Cloudflare Workers 배포 도구
   - 설치 후 자동으로 포함됨

## 설치 방법

### 1단계: 의존성 설치

```bash
cd cloudflare-worker
npm install
```

### 2단계: Cloudflare 로그인

```bash
npx wrangler login
```

브라우저에서 Cloudflare 계정으로 로그인합니다.

### 3단계: 환경변수 설정

`.env.example` 파일을 복사하여 `.dev.vars` 파일을 생성합니다:

```bash
cp .env.example .dev.vars
```

`.dev.vars` 파일을 편집하여 Piston API 키를 설정합니다:

```
PISTON_API_KEY=your_piston_api_key_here
```

**참고**: `.dev.vars` 파일은 `.gitignore`에 포함되어 있어 로컬 환경에서만 사용됩니다.

### 4단계: 로컬 개발 (선택사항)

```bash
npx wrangler dev
```

Worker가 `http://localhost:8787`에서 실행됩니다.

### 5단계: 배포

```bash
npx wrangler deploy
```

배포 완료 후 Worker URL이 출력됩니다. 예: `https://boj-piston-proxy.{subdomain}.workers.dev`

## Worker URL 획득

배포 후 다음 명령으로 Worker URL을 확인할 수 있습니다:

```bash
npx wrangler deployments list
```

또는 [Cloudflare Dashboard](https://dash.cloudflare.com)에서:
1. Workers & Pages 선택
2. `boj-piston-proxy` Worker 선택
3. "Deployments" 탭에서 프로덕션 URL 확인

## 속도 제한 정책

- **제한**: 1분당 IP당 10개 요청
- **초과 시 응답**: HTTP 429 (Too Many Requests)
- **응답 본문**:
  ```json
  {
    "error": "Rate limit exceeded",
    "retryAfter": 45
  }
  ```
- **헤더**: `Retry-After: 45` (초 단위)
- **리셋**: 1분 경과 후 자동 리셋

## 보안

- Worker는 `chrome-extension://` origin만 허용합니다
- CORS 헤더로 Cross-Origin 요청 처리
- API 키는 Worker 환경변수에 저장되어 클라이언트에 노출되지 않습니다
- 요청 IP 주소로 속도 제한 추적

## 요청 형식

Chrome Extension에서 Worker로 요청할 때:

```javascript
const workerUrl = 'https://boj-piston-proxy.{subdomain}.workers.dev';

fetch(workerUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Origin': 'chrome-extension://{extension-id}'
  },
  body: JSON.stringify({
    language: 'javascript',
    version: '18.12.1',
    files: [{ name: 'index.js', content: 'console.log("Hello")' }],
    stdin: '',
    args: [],
    compile_timeout: 10000,
    run_timeout: 3000,
    compile_memory_limit: -1,
    run_memory_limit: -1
  })
})
```

## 문제 해결

### 403 Forbidden 오류
- Worker URL이 `chrome-extension://` origin에서 호출되는지 확인하세요
- Origin 헤더가 올바르게 설정되어 있는지 확인하세요

### 429 Too Many Requests
- 1분 이내에 10개 이상의 요청을 보냈습니다
- `Retry-After` 헤더의 시간만큼 대기 후 재시도하세요

### 500 Internal Server Error
- Worker 로그 확인: `npx wrangler tail`
- API 키가 올바르게 설정되었는지 확인하세요

### 401 Unauthorized (Piston API)
- `.dev.vars`에서 `PISTON_API_KEY`가 올바른지 확인하세요
- Piston API 키 유효성을 확인하세요

## 배포된 Worker 환경변수 설정

프로덕션 배포 시 환경변수를 설정하려면:

```bash
npx wrangler secret put PISTON_API_KEY
```

프롬프트에서 API 키를 입력합니다.

## 참고 자료

- [Cloudflare Workers 문서](https://developers.cloudflare.com/workers/)
- [Wrangler CLI 참고](https://developers.cloudflare.com/workers/wrangler/install-and-update/)
- [Piston API 문서](https://github.com/engineer-man/piston)

## 라이선스

MIT
