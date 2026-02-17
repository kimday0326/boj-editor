# BOJ Editor

백준(BOJ) 문제 페이지에서 사이드패널 코드 에디터를 제공하는 Chrome Extension입니다.

## 주요 기능

- Monaco Editor 기반 코드 작성
- 문제별/언어별 코드 자동 저장 (`chrome.storage.local`)
- 커스텀 테스트케이스 실행 (Piston API 연동 진행 중)
- 백준 제출 페이지와 연동한 코드 제출
- 폰트 크기 조절 UI (기본 16)

## Cloudflare Worker 배포 (필수)

이 Extension은 Piston API 키를 보호하고 Rate Limiting을 적용하기 위해 Cloudflare Worker 프록시를 사용합니다.

**배포 필요**: Extension을 사용하기 전에 먼저 Worker를 배포해야 합니다.

자세한 배포 가이드는 [`cloudflare-worker/README.md`](./cloudflare-worker/README.md)를 참고하세요.

### 빠른 시작

1. Worker 배포:
   ```bash
   cd cloudflare-worker
   npm install
   npx wrangler login
   cp .env.example .dev.vars
   # .dev.vars 파일 편집 (PISTON_API_KEY 입력)
   npx wrangler deploy
   ```

2. 배포된 Worker URL을 Extension Settings에 입력 (선택사항)

**참고**: Worker URL을 입력하지 않으면 Piston API에 직접 연결됩니다 (API 키 노출 위험).

## 요구 사항

- Chrome 116 이상
- 백준 로그인 상태

## 설치 방법 (개발자 모드)

1. 저장소 클론 후 의존성 설치

```bash
npm install
```

2. Chrome에서 `chrome://extensions` 접속
3. 우측 상단 **개발자 모드** 활성화
4. **압축해제된 확장 프로그램을 로드합니다** 클릭
5. 이 프로젝트 루트 폴더(`boj-editor`) 선택

## 테스트 방법

Extension과 Worker의 통합 동작을 확인하려면 다음 단계를 따라주세요.

### 1. Worker 로컬 테스트

배포 전에 로컬 환경에서 Worker를 먼저 테스트할 수 있습니다:

```bash
cd cloudflare-worker
npx wrangler dev
```

Worker가 `http://localhost:8787`에서 실행됩니다.

### 2. Extension 설정

1. Extension을 개발자 모드로 로드 (위의 "설치 방법" 참고)
2. 백준 문제 페이지에서 사이드패널 열기
3. Settings (⚙️ 아이콘) 클릭
4. Worker URL 입력:
   - **로컬 테스트**: `http://localhost:8787`
   - **배포 후 테스트**: `https://boj-piston-proxy.{subdomain}.workers.dev`

### 3. 통합 테스트

1. [백준 1000번 문제](https://www.acmicpc.net/problem/1000) 페이지로 이동
2. 사이드패널에서 언어 선택 (예: Python)
3. 코드 작성:
   ```python
   a, b = map(int, input().split())
   print(a + b)
   ```
4. 테스트케이스 추가: 입력 `1 2`, 예상 출력 `3`
5. **Run** 버튼 클릭
6. 결과 확인:
   - ✅ 출력이 `3`과 일치하면 성공
   - ❌ 에러 발생 시 브라우저 Console 확인 (F12)

### 4. Rate Limiting 테스트

Worker의 속도 제한 동작을 확인하려면:

1. 위의 통합 테스트 완료 후
2. **Run** 버튼을 **1분 이내에 11번** 빠르게 클릭
3. 예상 결과:
   - 처음 10번: 정상 실행
   - 11번째: 429 에러 메시지 표시
4. 브라우저 Console (F12)에서 `Retry-After` 헤더 확인
5. 1분 후 다시 실행하여 제한 해제 확인

### 5. 에러 시나리오 테스트

#### Worker 다운 시나리오

1. 로컬 테스트 중이라면 `Ctrl+C`로 Worker 종료
2. Extension에서 **Run** 버튼 클릭
3. 예상 동작:
   - Worker URL이 설정되어 있으면: 연결 실패 에러
   - Worker URL이 비어있으면: Piston API 직접 호출 (정상 동작)

#### 잘못된 Worker URL

1. Settings에서 존재하지 않는 URL 입력 (예: `https://invalid.workers.dev`)
2. **Run** 버튼 클릭
3. 네트워크 에러 확인

### 문제 해결

| 문제 | 원인 | 해결 방법 |
|------|------|----------|
| `403 Forbidden` | Origin 검증 실패 | Worker가 `chrome-extension://` origin을 허용하는지 확인 |
| `429 Too Many Requests` | Rate Limit 초과 | `Retry-After` 시간만큼 대기 (보통 1분) |
| `500 Internal Server Error` | Worker 내부 오류 | `npx wrangler tail`로 로그 확인, API 키 설정 확인 |
| `Network Error` | Worker 미실행/잘못된 URL | Worker가 실행 중인지, URL이 올바른지 확인 |

**자세한 Worker 테스트 방법**은 [`cloudflare-worker/README.md`](./cloudflare-worker/README.md)의 "문제 해결" 섹션을 참고하세요.

## 사용 방법

1. `https://www.acmicpc.net/problem/{번호}` 페이지로 이동
2. 페이지의 BOJ Editor 버튼(또는 자동 활성화된 사이드패널)에서 에디터 열기
3. 언어 선택 후 코드 작성/테스트 실행
4. 제출 버튼으로 백준 제출

## 프로젝트 구조

```text
boj-editor/
├── manifest.json
├── background.js
├── content/
│   ├── content.js
│   └── submit.js
├── sidepanel/
│   ├── index.html
│   ├── sidepanel.css
│   ├── sidepanel.js
│   ├── components/
│   └── utils/
└── lib/monaco/
```

## 참고

- `lib/monaco/`는 확장 프로그램에서 직접 로드하므로 저장소에 포함되어야 합니다.
- 배포용 패키징 시 `.pem`, `.crx` 파일은 커밋하지 않도록 `.gitignore`에 제외되어 있습니다.
