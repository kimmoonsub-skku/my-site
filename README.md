# Poker Decision Helper

GitHub Pages에 올릴 수 있는 정적 웹사이트입니다.

## 파일 구성

- `index.html` : 사이트 구조
- `style.css` : 디자인
- `script.js` : 포커 액션 추천 로직

## 사용 방법

1. GitHub에서 새 Repository를 만듭니다.
2. 위 세 파일을 업로드합니다.
3. Repository Settings → Pages → Branch를 `main`으로 설정합니다.
4. 생성된 GitHub Pages 주소로 접속합니다.

## 발표 설명 예시

이 사이트는 포커 상황을 입력하면 추천 액션을 제공하는 웹 기반 의사결정 도구입니다. 
사용자는 자신의 두 장의 핸드, 스택, 팟 사이즈, 현재 스트리트, 상대 액션을 입력할 수 있습니다.
사이트는 입력값을 바탕으로 핸드 강도, SPR, 팟 오즈를 단순 계산하고 Fold, Call, Check, Bet, Raise, All-in 중 하나의 방향을 제안합니다.

실제 GTO 솔버와 달리 모든 변수를 계산하지는 않지만, 포커 의사결정의 기본 구조를 시각적으로 체험할 수 있도록 제작했습니다.
