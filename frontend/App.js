import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, StatusBar, Keyboard, Platform, Dimensions, Image } from 'react-native';
import { mediaDevices, RTCPeerConnection, RTCView } from 'react-native-webrtc';
import io from 'socket.io-client';

const SIGNALING_SERVER_URL = 'http://localhost:3000'; 

const translations = {
  tr: {
    title: 'Görüntülü Arama',
    desc: 'Oda kodu ile aramaya katılabilir veya yeni bir arama başlatabilirsin.',
    placeholder: 'Oda kodu',
    join: 'Katıl',
    room: 'Oda Kodu',
    exit: 'Çıkış',
    waitingRemote: 'Karşı taraf henüz katılmadı',
    waitingSelf: 'Kamera başlatılıyor...',
    waitingOther: 'Karşı taraf bekleniyor',
    connected: 'Bağlantı başarılı',
    connecting: 'Bağlantı bekleniyor...',
    permissions: 'Kamera ve mikrofon izinleri alınıyor...',
    copyright: '© ' + new Date().getFullYear() + ' VideoCall',
    enlarge: 'Büyüt',
    shrink: 'Küçült',
    lang: 'EN',
  },
  en: {
    title: 'Video Call',
    desc: 'Join a call with a room code or start a new one.',
    placeholder: 'Room code',
    join: 'Join',
    room: 'Room',
    exit: 'Exit',
    waitingRemote: 'Waiting for the other participant...',
    waitingSelf: 'Starting camera...',
    waitingOther: 'Waiting for the other side',
    connected: 'Connected',
    connecting: 'Waiting for connection...',
    permissions: 'Requesting camera and microphone permissions...',
    copyright: '© ' + new Date().getFullYear() + ' VideoCall',
    enlarge: 'Enlarge',
    shrink: 'Shrink',
    lang: 'TR',
  },
};

export default function App() {
  const [roomId, setRoomId] = useState('');
  const [joined, setJoined] = useState(false);
  const [permissionsGranted, setPermissionsGranted] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState('');
  const socketRef = useRef(null);
  const pcRef = useRef(null);
  const isOfferer = useRef(false);
  const [isVideoLarge, setIsVideoLarge] = useState(false);
  const [isSelfMain, setIsSelfMain] = useState(false);
  const [lang, setLang] = useState('tr');
  const t = translations[lang];

  const getPermissions = async () => {
    try {
      const stream = await mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });
      setLocalStream(stream);
      setPermissionsGranted(true);
    } catch (e) {
      setError('Kamera veya mikrofon izni alınamadı!');
    }
  };

  useEffect(() => {
    getPermissions();
  }, []);

  const handleJoin = () => {
    if (!roomId) {
      setError('Lütfen bir oda ID girin!');
      return;
    }
    setConnecting(true);
    setTimeout(() => {
      setJoined(true);
      setConnecting(false);
      setError('');
      Keyboard.dismiss();
    }, 500);
  };

  const handleLeave = () => {
    setJoined(false);
    setRemoteStream(null);
    setRoomId('');
    if (socketRef.current) socketRef.current.disconnect();
    if (pcRef.current) pcRef.current.close();
  };

  useEffect(() => {
    if (joined && permissionsGranted && localStream) {
      socketRef.current = io(SIGNALING_SERVER_URL);
      socketRef.current.emit('join-room', { roomId });
      pcRef.current = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
        ],
      });
      localStream.getTracks().forEach(track => {
        pcRef.current.addTrack(track, localStream);
      });
      pcRef.current.onicecandidate = (event) => {
        if (event.candidate) {
          socketRef.current.emit('ice-candidate', { roomId, candidate: event.candidate });
        }
      };
      pcRef.current.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          setRemoteStream(event.streams[0]);
        }
      };
      socketRef.current.on('offer-received', async ({ offer }) => {
        await pcRef.current.setRemoteDescription(offer);
        const answer = await pcRef.current.createAnswer();
        await pcRef.current.setLocalDescription(answer);
        socketRef.current.emit('answer', { roomId, answer: pcRef.current.localDescription });
      });
      socketRef.current.on('answer-received', async ({ answer }) => {
        await pcRef.current.setRemoteDescription(answer);
      });
      socketRef.current.on('ice-candidate-received', async ({ candidate }) => {
        try {
          await pcRef.current.addIceCandidate(candidate);
        } catch (e) {}
      });
      socketRef.current.on('connect', async () => {
        if (localStream) {
          isOfferer.current = true;
          const offer = await pcRef.current.createOffer();
          await pcRef.current.setLocalDescription(offer);
          socketRef.current.emit('offer', { roomId, offer: pcRef.current.localDescription });
        }
      });
      return () => {
        socketRef.current.disconnect();
        pcRef.current.close();
      };
    }
  }, [joined, permissionsGranted, localStream]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      <TouchableOpacity style={styles.langButton} onPress={() => setLang(l => l === 'tr' ? 'en' : 'tr')}>
        <Text style={styles.langButtonText}>{t.lang}</Text>
      </TouchableOpacity>
      {!permissionsGranted ? (
        <View style={[styles.centered, styles.contentWithLangButton]}>
          <Text style={styles.title}>{t.permissions}</Text>
        </View>
      ) : !joined ? (
        <View style={[styles.container, styles.contentWithLangButton]}>
          <Image source={require('./assets/logo.gif')} style={styles.logoGif} resizeMode="contain" />
          <Text style={styles.bigTitle}>{t.title}</Text>
          <Text style={styles.subtitle}>{t.desc}</Text>
          <TextInput
            style={styles.input}
            placeholder={t.placeholder}
            placeholderTextColor="#888"
            value={roomId}
            onChangeText={setRoomId}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="default"
            returnKeyType="done"
            onSubmitEditing={handleJoin}
          />
          <TouchableOpacity style={styles.button} onPress={handleJoin} activeOpacity={0.8}>
            <Text style={styles.buttonText}>{t.join}</Text>
          </TouchableOpacity>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <View style={styles.footer}><Text style={styles.footerText}>{t.copyright}</Text></View>
        </View>
      ) : (
        <View style={[styles.roomContainer, styles.contentWithLangButton]}>
          <View style={styles.headerRow}>
            <Text style={styles.roomIdText}>{t.room}: <Text style={styles.roomIdValue}>{roomId}</Text></Text>
            <TouchableOpacity style={styles.leaveButton} onPress={handleLeave}>
              <Text style={styles.leaveButtonText}>{t.exit}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.videoArea}>
            <View style={[styles.videoBoxRemote, isVideoLarge ? styles.videoBoxRemoteLarge : styles.videoBoxRemoteSmall]}>
              <TouchableOpacity style={styles.resizeButton} onPress={() => setIsVideoLarge(v => !v)}>
                <Text style={styles.resizeButtonText}>{isVideoLarge ? t.shrink : t.enlarge}</Text>
              </TouchableOpacity>
              {isSelfMain
                ? (localStream ? (
                    <RTCView
                      streamURL={localStream.toURL()}
                      style={styles.rtcViewRemote}
                      objectFit="cover"
                      mirror
                    />
                  ) : (
                    <View style={styles.waitingBox}><Text style={styles.waitingText}>{t.waitingSelf}</Text></View>
                  ))
                : (remoteStream ? (
                    <RTCView
                      streamURL={remoteStream.toURL()}
                      style={styles.rtcViewRemote}
                      objectFit="cover"
                    />
                  ) : (
                    <View style={styles.waitingBox}><Text style={styles.waitingText}>{t.waitingRemote}</Text></View>
                  ))}
            </View>
            <TouchableOpacity style={styles.videoBoxSelf} onPress={() => setIsSelfMain(v => !v)} activeOpacity={0.8}>
              {isSelfMain
                ? (remoteStream ? (
                    <RTCView
                      streamURL={remoteStream.toURL()}
                      style={styles.rtcViewSelf}
                      objectFit="cover"
                    />
                  ) : (
                    <View style={styles.waitingBox}><Text style={styles.waitingText}>{t.waitingOther}</Text></View>
                  ))
                : (localStream ? (
                    <RTCView
                      streamURL={localStream.toURL()}
                      style={styles.rtcViewSelf}
                      objectFit="cover"
                      mirror
                    />
                  ) : null)}
            </TouchableOpacity>
          </View>
          <Text style={styles.statusText}>{remoteStream ? t.connected : t.connecting}</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#181824',
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#181824',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#181824',
  },
  bigTitle: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 12,
    letterSpacing: 1,
    fontFamily: 'System',
  },
  subtitle: {
    color: '#bbb',
    fontSize: 16,
    marginBottom: 32,
    textAlign: 'center',
    fontFamily: 'System',
  },
  input: {
    width: '100%',
    backgroundColor: '#23233a',
    color: '#fff',
    borderRadius: 10,
    padding: 16,
    marginBottom: 20,
    fontSize: 18,
    borderWidth: 1,
    borderColor: '#333',
    fontFamily: 'System',
  },
  button: {
    width: '100%',
    backgroundColor: '#2979FF',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#2979FF',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  buttonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    letterSpacing: 1,
    fontFamily: 'System',
  },
  error: {
    color: '#ff4d4d',
    marginTop: 8,
    fontSize: 16,
    textAlign: 'center',
    fontFamily: 'System',
  },
  footer: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  footerText: {
    color: '#444',
    fontSize: 14,
    fontFamily: 'System',
  },
  roomContainer: {
    flex: 1,
    backgroundColor: '#181824',
    padding: 0,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 16 : 8,
    paddingBottom: 8,
    backgroundColor: '#22223b',
  },
  roomIdText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'System',
  },
  roomIdValue: {
    color: '#2979FF',
    fontWeight: 'bold',
    fontFamily: 'System',
  },
  leaveButton: {
    backgroundColor: '#ff4d4d',
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 8,
  },
  leaveButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    fontFamily: 'System',
  },
  videoArea: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
  },
  videoBoxRemote: {
    width: '100%',
    backgroundColor: '#23233a',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#2979FF',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  videoBoxRemoteSmall: {
    aspectRatio: 9/16,
    maxHeight: Dimensions.get('window').height * 0.5,
  },
  videoBoxRemoteLarge: {
    aspectRatio: 9/16,
    maxHeight: Dimensions.get('window').height * 0.85,
  },
  resizeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 10,
    backgroundColor: '#181824cc',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  resizeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: 'System',
  },
  videoBoxSelf: {
    position: 'absolute',
    right: 24,
    bottom: 24,
    width: 96, 
    height: 144,
    backgroundColor: '#333',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#fff',
    overflow: 'hidden',
    zIndex: 2,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  rtcViewRemote: {
    width: '100%',
    height: '100%',
    backgroundColor: '#23233a',
  },
  rtcViewSelf: {
    width: '100%',
    height: '100%',
    backgroundColor: '#333',
  },
  waitingBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waitingText: {
    color: '#bbb',
    fontSize: 18,
    fontFamily: 'System',
  },
  statusText: {
    color: '#2979FF',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: 'bold',
    fontFamily: 'System',
  },
  logoGif: {
    width: 120,
    height: 120,
    marginBottom: 32,
    alignSelf: 'center',
  },
  langButton: {
    position: 'absolute',
    top: 48,
    right: 16,
    zIndex: 99,
    backgroundColor: '#23233a',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: '#333',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 10,
  },
  langButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
    fontFamily: 'System',
  },
  contentWithLangButton: {
    paddingTop: 32,
  },
});
