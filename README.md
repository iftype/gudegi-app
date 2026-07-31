# 구데기 앱

치지직 방송 시작, 방제 변경, 카테고리 변경 및 키워드 알림을 제공하는 Expo 네이티브 앱입니다.

## 구성

- Expo SDK 57 / React Native / TypeScript
- Expo Router Native Tabs
- iOS 시스템 `formSheet`와 Android 네이티브 bottom sheet
- AsyncStorage 기반 기기별 알림 설정
- Expo Notifications 기반 APNs/FCM 토큰 발급
- 기존 `gudegi-server` API 재사용

웹 앱 코드는 포함하지 않습니다. 공개 API 주소는 `EXPO_PUBLIC_API_BASE_URL`로 주입하며 치지직 API 키, Apple 인증서, FCM 서비스 계정 키는 앱 번들 또는 저장소에 넣지 않습니다.

## 시작

```bash
cp .env.example .env.local
pnpm install
pnpm ios
```

실기기 알림과 App Store 빌드는 Expo development build 및 EAS 설정 후 검증합니다.

```bash
eas build --profile development --platform ios
eas build --profile production --platform ios
eas submit --platform ios
```

## 현재 포함된 화면

- 알림 관리: 전체 선택, 스트리머별 알림 토글, 카테고리와 세부 조건
- 스트리머: 검색 및 알림 목록 추가/삭제
- 설정: 알림 권한, 서버 연결 상태, 앱 정보
- 알림 조건 시트: 방송 시작, 방제 변경, 카테고리 변경, 키워드
- 카테고리 시트: 전체 또는 복수 카테고리 선택

API가 연결되지 않은 로컬 환경에서는 화면 검증용 미리보기 데이터가 표시됩니다.
