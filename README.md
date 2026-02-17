# BOJ Editor

백준(BOJ) 문제 페이지에서 사이드패널 코드 에디터를 제공하는 Chrome Extension입니다.

## 주요 기능

- Monaco Editor 기반 코드 작성
- 문제별/언어별 코드 자동 저장 (`chrome.storage.local`)
- 커스텀 테스트케이스 실행 (Piston API 연동 진행 중)
- 백준 제출 페이지와 연동한 코드 제출
- 폰트 크기 조절 UI (기본 16)

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
