# Video Görüşme Uygulaması

Bu proje, **NestJS** (WebSocket tabanlı signaling server) ve **Expo React Native** (WebRTC) kullanılarak geliştirilmiş, modern ve profesyonel bir video arama uygulamasıdır. Hem backend hem frontend kodları bu depoda yer alır ve iki kullanıcı arasında gerçek zamanlı, uçtan uca video görüşmesi sağlar.

---

## Özellikler
- **Gerçek zamanlı video görüşmesi** (WebRTC peer-to-peer)
- **Signaling server:** NestJS & Socket.io (join-room, offer, answer, ice-candidate event’leri)
- **Expo React Native frontend** (iOS & Android desteği)
- **Kamera/mikrofon izinleri** ve cihaz uyumluluğu
- **Oda kodu ile görüşme başlatma/katılma**

---

## Neden Bu Mimari?
- **WebRTC**: Cihazlar arasında doğrudan, düşük gecikmeli video/ses aktarımı sağlar. Ancak bağlantı kurulumu için bir signaling server gerekir (SDP, ICE candidate değişimi).
- **NestJS**: Güçlü, ölçeklenebilir ve WebSocket desteği yüksek bir backend framework’üdür.
- **Socket.io**: Oda bazlı, güvenilir ve event tabanlı signaling iletişimi sağlar.
- **Expo React Native**: Hızlı, çapraz platform mobil geliştirme ve native modüllere erişim (kamera, mikrofon, WebRTC).

---

## Klasör Yapısı

```
video-call-app/
  backend/         # NestJS WebSocket signaling server
    src/
      app.gateway.ts
      app.module.ts
      ...
    package.json
    ...
  frontend/        # Expo React Native uygulaması
    App.js
    assets/logo.gif
    package.json
    ...
  README.md
```

---

## Kurulum

### Gereksinimler
- Node.js (18+ önerilir)
- npm veya yarn
- Xcode (iOS için) / Android Studio (Android için)

### 1. Bağımlılıkları yükle
```bash
cd backend
npm install
cd ../frontend
npm install
```

### 2. Backend’i başlat (signaling server)
```bash
cd ../backend
npm run start:dev
```
- Varsayılan olarak `http://localhost:3000` adresinde çalışır.

### 3. Frontend’i başlat (Expo uygulaması)
```bash
cd ../frontend
npx expo run:ios   # veya npx expo run:android
```
- Gerçek cihaz veya simülatör kullanın. **Expo Go ile çalışmaz** (native modül gerektirir).

---

## Nasıl Çalışır?
1. **Kullanıcı uygulamayı açar, kamera/mikrofon izinlerini verir.**
2. **Oda kodu girerek yeni bir oda başlatır veya mevcut odaya katılır.**
3. **Frontend, backend signaling server’a Socket.io ile bağlanır.**
4. **WebRTC peer bağlantısı kurulur:**
   - Kullanıcı A offer oluşturur, server’a gönderir
   - Server, offer’ı Kullanıcı B’ye iletir
   - Kullanıcı B answer gönderir, server iletir
   - Her iki taraf ICE candidate değişimi yapar
5. **Kullanıcılar arasında doğrudan (peer-to-peer) video/ses akışı başlar.**
6. **Arayüzde video kutuları yer değiştirebilir, ana video büyütülüp küçültülebilir, dil değiştirilebilir.**

---

## Kullanılan Teknolojiler
- **Backend:**
  - NestJS
  - @nestjs/websockets
  - socket.io
- **Frontend:**
  - Expo (React Native)
  - react-native-webrtc
  - socket.io-client

---

## Notlar & İpuçları
- **Expo Go ile native WebRTC modülleri çalışmaz.** Her zaman development build kullanın (`expo run:ios` veya `expo run:android`).
- **Kamera/mikrofon izinleri** verilmeden görüşme başlatılamaz.
- **Signaling server** sadece bağlantı kurulumunda kullanılır; medya akışı her zaman doğrudan cihazlar arasında gerçekleşir.
- **Oda kodu** herhangi bir string olabilir; aynı oda kodunu giren kullanıcılar eşleşir.