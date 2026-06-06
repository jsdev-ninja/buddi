import { CouplePill } from '@/components/CouplePill';
import { buddiColors } from '@/constants/theme';
import { useAuth } from '@/context/AuthProvider';
import { setCurrentChatConversationId } from '@/context/NotificationProvider';
import { db, firebaseApi } from '@/services/firebase';
import { Feather } from '@expo/vector-icons';
import { Audio, Video } from 'expo-av';
import { doc, onSnapshot } from 'firebase/firestore';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Bubble, Composer, GiftedChat, IMessage, InputToolbar, Send, User } from 'react-native-gifted-chat';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type FirebaseMessage = {
  id: string;
  text: string;
  image?: string;
  video?: string;
  audio?: string;
  timestamp: string;
  isSent: boolean;
  createdAt: number;
  userId: string;
};

function toGiftedMessage(m: FirebaseMessage, currentUserId: string): IMessage {
  return {
    _id: m.id,
    text: m.text,
    image: m.image,
    video: m.video,
    audio: m.audio,
    createdAt: new Date(m.createdAt),
    user: {
      _id: m.userId,
      name: m.userId === currentUserId ? 'You' : undefined,
    },
  };
}

function AudioMessage({ uri, isMine }: { uri: string; isMine?: boolean }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const soundRef = useRef<Audio.Sound | null>(null);

  const toggle = async () => {
    try {
      if (isPlaying && soundRef.current) {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
        soundRef.current = null;
        setIsPlaying(false);
      } else {
        await Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true });
        const { sound } = await Audio.Sound.createAsync({ uri });
        soundRef.current = sound;
        setIsPlaying(true);
        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded && status.didJustFinish) {
            setIsPlaying(false);
            sound.unloadAsync();
            soundRef.current = null;
          }
        });
        await sound.playAsync();
      }
    } catch (e) {
      console.error('Audio playback error:', e);
    }
  };

  useEffect(() => {
    return () => { soundRef.current?.unloadAsync(); };
  }, []);

  return (
    <Pressable style={styles.audioMsg} onPress={toggle}>
      <Feather
        name={isPlaying ? 'pause-circle' : 'play-circle'}
        size={28}
        color={isMine ? '#fff' : buddiColors.primary}
      />
      <View style={styles.audioWaveform}>
        {Array.from({ length: 12 }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.audioBar,
              { height: 6 + Math.random() * 14, backgroundColor: isMine ? 'rgba(255,255,255,0.6)' : buddiColors.surfaceBorder },
            ]}
          />
        ))}
      </View>
      <Text style={[styles.audioLabel, { color: isMine ? 'rgba(255,255,255,0.8)' : buddiColors.textSecondary }]}>
        Voice
      </Text>
    </Pressable>
  );
}

const BACKGROUNDS = [
  { id: 'default', name: 'Default', value: buddiColors.background },
  { id: 'zinc', name: 'Zinc Charcoal', value: '#18181B' },
  { id: 'sunset', name: 'Sunset', value: 'sunset', isGradient: true, colors: ['#FF7E5F', '#FEB47B'] },
  { id: 'sky', name: 'Sky', value: 'sky', isGradient: true, colors: ['#00c6ff', '#0072ff'] },
  { id: 'lavender', name: 'Lavender', value: 'lavender', isGradient: true, colors: ['#a18cd1', '#fbc2eb'] },
  { id: 'forest', name: 'Forest', value: 'forest', isGradient: true, colors: ['#11998e', '#38ef7d'] },
];

export default function ChatScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const params = useLocalSearchParams<{ id: string; name?: string }>();
  const id = typeof params.id === 'string' ? params.id : params.id?.[0];
  const nameParam = typeof params.name === 'string' ? params.name : params.name?.[0];
  const [chatName, setChatName] = useState(nameParam ? decodeURIComponent(nameParam) : 'Chat');
  const [members, setMembers] = useState(1);
  const [isGroupChat, setIsGroupChat] = useState(false);
  const [otherUserId, setOtherUserId] = useState<string | null>(null);
  const [partnerKind, setPartnerKind] = useState<"solo" | "couple" | undefined>();
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [firebaseMessages, setFirebaseMessages] = useState<FirebaseMessage[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isSendingMedia, setIsSendingMedia] = useState(false);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const insets = useSafeAreaInsets();

  const [conversationBackground, setConversationBackground] = useState('default');
  const [conversationRoles, setConversationRoles] = useState<Record<string, string>>({});
  const [groupMembersList, setGroupMembersList] = useState<{ id: string; name: string; role: string }[]>([]);
  const [showGroupOptions, setShowGroupOptions] = useState(false);

  const selectedBackground = useMemo(() => {
    return BACKGROUNDS.find((b) => b.id === conversationBackground) || BACKGROUNDS[0];
  }, [conversationBackground]);

  const giftedUser: User = useMemo(
    () => (user?.uid ? { _id: user.uid } : { _id: '' }),
    [user?.uid]
  );

  const headerHeight = insets.top + 64;

  // Suppress "new message" notifications while user is in this chat
  useEffect(() => {
    if (id) setCurrentChatConversationId(id);
    return () => setCurrentChatConversationId(null);
  }, [id]);

  // Reset unread count on mount/focus
  useEffect(() => {
    if (id && user?.uid) {
      firebaseApi.chat.clearUnreadCount(id, user.uid);
    }
  }, [id, user?.uid]);

  // Fetch conversation meta and subscribe to messages
  useEffect(() => {
    if (!id || !user?.uid) return;

    const fetchConversation = async () => {
      try {
        setIsLoading(true);
        const [convs, convDoc] = await Promise.all([
          firebaseApi.chat.getConversations(user.uid),
          firebaseApi.chat.getConversation(id, user.uid),
        ]);
        const conversation = convs.find((c) => c.id === id);
        if (conversation) {
          setChatName(conversation.name);
          setMembers(conversation.members || 1);
          setIsGroupChat(conversation.isGroup ?? false);
          setPartnerKind(conversation.partnerKind);
          setConversationBackground(conversation.background || 'default');
          setConversationRoles(conversation.roles || {});
          if (!conversation.isGroup && conversation.participantIds?.length >= 2) {
            const other = conversation.participantIds.find((p: string) => p !== user.uid);
            setOtherUserId(other ?? null);
          }
        } else if (convDoc) {
          setChatName(convDoc.name);
          setMembers(convDoc.participants.length);
          setIsGroupChat(convDoc.isGroup);
          setPartnerKind(convDoc.partnerKind);
          setConversationBackground(convDoc.background || 'default');
          setConversationRoles(convDoc.roles || {});
          if (!convDoc.isGroup && convDoc.participants.length >= 2) {
            const other = convDoc.participants.find((p: string) => p !== user.uid);
            setOtherUserId(other ?? null);
          }
        }

        const fetched = await firebaseApi.chat.getMessages(id);
        setFirebaseMessages(fetched);
      } catch (error) {
        console.error('Error fetching conversation:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchConversation();

    const unsubscribe = firebaseApi.chat.subscribeToMessages(id, (updated) => {
      setFirebaseMessages(updated);
      // If we are actively in this chat, clear unread count for any new incoming messages
      firebaseApi.chat.clearUnreadCount(id, user.uid);
    });

    return () => unsubscribe();
  }, [id, user?.uid]);

  // Subscribe to conversation document for real-time background, members, and roles updates
  useEffect(() => {
    if (!id || !user?.uid) return;

    const convRef = doc(db, "conversations", id);
    const unsubscribeConv = onSnapshot(convRef, async (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.groupName) setChatName(data.groupName);
        setMembers(data.participants?.length || 1);
        setIsGroupChat(data.isGroup ?? false);
        setConversationBackground(data.background || 'default');
        setConversationRoles(data.roles || {});

        // Fetch user profiles for group members management modal
        try {
          const profilesList: any[] = [];
          for (const pId of data.participants || []) {
            const profile = await firebaseApi.profiles.getProfile(pId);
            profilesList.push({
              id: pId,
              name: profile?.name || 'Unknown',
              role: data.roles?.[pId] || 'member',
            });
          }
          setGroupMembersList(profilesList);
        } catch (e) {
          console.error("Error fetching group member profiles:", e);
        }
      }
    });

    return () => unsubscribeConv();
  }, [id, user?.uid]);

  // GiftedChat with inverted list expects newest first; list renders reversed so newest is at bottom
  const giftedMessages: IMessage[] = useMemo(() => {
    const mapped = firebaseMessages
      .filter((m) => m.text?.trim() !== '' || m.image || m.video || m.audio)
      .map((m) => toGiftedMessage(m, user?.uid ?? ''));
    return mapped.sort((a, b) => (b.createdAt as Date).getTime() - (a.createdAt as Date).getTime());
  }, [firebaseMessages, user?.uid]);

  const onSend = useCallback(
    async (newMessages: IMessage[] = []) => {
      if (!id || !user?.uid || newMessages.length === 0) return;
      const text = newMessages[0].text?.trim();
      if (!text) return;
      try {
        await firebaseApi.chat.sendMessage(id, text);
      } catch (error) {
        console.error('Error sending message:', error);
        Alert.alert('Error', 'Could not send message. Please try again.');
      }
    },
    [id, user?.uid]
  );

  const pickImage = useCallback(async () => {
    if (!id || !user?.uid) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Photo library access is required.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      quality: 0.7,
    });
    if (result.canceled) return;
    try {
      setIsSendingMedia(true);
      const asset = result.assets[0];
      const isVideo = asset.type === 'video';
      const type = isVideo ? 'video' : 'image';
      const url = await firebaseApi.storage.uploadChatMedia(asset.uri, id, type);
      await firebaseApi.chat.sendMessage(id, '', { [type]: url });
    } catch (e) {
      console.error('Error sending media:', e);
      Alert.alert('Error', 'Could not send media.');
    } finally {
      setIsSendingMedia(false);
    }
  }, [id, user?.uid]);

  const startRecording = useCallback(async () => {
    try {
      const perm = await Audio.requestPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission needed', 'Microphone access is required for voice messages.');
        return;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = recording;
      setIsRecording(true);
    } catch (e) {
      console.error('Error starting recording:', e);
    }
  }, []);

  const stopRecording = useCallback(async () => {
    if (!recordingRef.current || !id || !user?.uid) return;
    try {
      setIsRecording(false);
      await recordingRef.current.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;
      if (!uri) return;
      setIsSendingMedia(true);
      const url = await firebaseApi.storage.uploadChatMedia(uri, id, 'audio');
      await firebaseApi.chat.sendMessage(id, '', { audio: url });
    } catch (e) {
      console.error('Error sending voice message:', e);
      Alert.alert('Error', 'Could not send voice message.');
    } finally {
      setIsSendingMedia(false);
    }
  }, [id, user?.uid]);

  const renderLoading = useCallback(
    () => (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={buddiColors.primary} />
      </View>
    ),
    []
  );

  return (
    <View style={styles.container}>
      {/* Chat header only (no logo bar — more space for conversation) */}
      <View style={[styles.chatHeader, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color={buddiColors.textPrimary} />
        </Pressable>
        <View style={styles.chatInfo}>
          <View style={styles.chatNameRow}>
            <Text style={styles.chatName} numberOfLines={1} ellipsizeMode="tail">{chatName}</Text>
            {partnerKind === "couple" && !isGroupChat && (
              <CouplePill variant="compact" />
            )}
          </View>
          <View style={styles.chatMeta}>
            <Feather name="users" size={14} color={buddiColors.textSecondary} />
            <Text style={styles.chatMetaText}>{members} members</Text>
            <View style={styles.onlineDot} />
          </View>
        </View>
        <Pressable onPress={() => setShowMoreMenu(true)}>
          <Feather name="more-vertical" size={24} color={buddiColors.textPrimary} />
        </Pressable>
      </View>

      {/* More menu modal */}
      <Modal
        visible={showMoreMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMoreMenu(false)}
      >
        <Pressable style={styles.moreMenuOverlay} onPress={() => setShowMoreMenu(false)}>
          <View style={styles.moreMenuBox} onStartShouldSetResponder={() => true}>
            {!isGroupChat && otherUserId && (
              <Pressable
                style={styles.moreMenuItem}
                onPress={() => {
                  setShowMoreMenu(false);
                  Alert.alert(
                    'Unmatch',
                    'Remove this match? You will no longer see each other in matches.',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Unmatch',
                        style: 'destructive',
                        onPress: async () => {
                          try {
                            await firebaseApi.matches.unmatch(otherUserId);
                            router.back();
                          } catch {
                            Alert.alert('Error', 'Could not unmatch.');
                          }
                        },
                      },
                    ]
                  );
                }}
              >
                <Feather name="user-x" size={20} color={buddiColors.dangerText} />
                <Text style={styles.moreMenuUnmatchText}>Unmatch</Text>
              </Pressable>
            )}
            {isGroupChat && (
              <Pressable
                style={styles.moreMenuItem}
                onPress={() => {
                  setShowMoreMenu(false);
                  setShowGroupOptions(true);
                }}
              >
                <Feather name="info" size={20} color={buddiColors.textPrimary} />
                <Text style={styles.moreMenuItemText}>Group Settings</Text>
              </Pressable>
            )}
            {!isGroupChat && !otherUserId && (
              <Text style={styles.moreMenuPlaceholder}>No actions</Text>
            )}
            <Pressable
              style={styles.moreMenuItem}
              onPress={() => {
                setShowMoreMenu(false);
                router.push('/settings');
              }}
            >
              <Feather name="settings" size={20} color={buddiColors.textPrimary} />
              <Text style={styles.moreMenuItemText}>Settings</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {/* Gifted Chat - handles keyboard, list, and input with best practices */}
      <View style={styles.chatWrapper}>
        {selectedBackground.isGradient ? (
          <LinearGradient
            colors={selectedBackground.colors || []}
            style={StyleSheet.absoluteFillObject}
          />
        ) : (
          <View
            style={[
              StyleSheet.absoluteFillObject,
              { backgroundColor: selectedBackground.value }
            ]}
          />
        )}
        <GiftedChat
          messages={giftedMessages}
          onSend={onSend}
          user={giftedUser}
          renderLoading={isLoading ? renderLoading : undefined}
          isInverted
          listProps={{
            style: [styles.messageList, selectedBackground.id !== 'default' && { backgroundColor: 'transparent' }],
            contentContainerStyle: styles.messageListContent,
          }}
          messagesContainerStyle={[styles.messagesContainer, selectedBackground.id !== 'default' && { backgroundColor: 'transparent' }]}
          timeFormat="HH:mm"
          dateFormat="D MMM"
          minInputToolbarHeight={48}
          isSendButtonAlwaysVisible
          textInputProps={{
            placeholder: 'Type a message...',
            placeholderTextColor: buddiColors.textTertiary,
            style: styles.textInput,
          }}
          keyboardAvoidingViewProps={{
            keyboardVerticalOffset: Platform.OS === 'ios' ? headerHeight : 0,
          }}
          renderInputToolbar={(inputToolbarProps) => (
            <View style={[styles.inputToolbarWrapper, { paddingBottom: Math.max(insets.bottom, 6) }]}>
              {isSendingMedia && (
                <View style={styles.mediaUploading}>
                  <ActivityIndicator size="small" color={buddiColors.primary} />
                  <Text style={styles.mediaUploadingText}>Sending...</Text>
                </View>
              )}
              <View style={styles.toolbarRow}>
                <Pressable style={styles.mediaBtn} onPress={pickImage}>
                  <Feather name="image" size={22} color={buddiColors.primary} />
                </Pressable>
                <Pressable
                  style={[styles.mediaBtn, isRecording && styles.mediaBtnRecording]}
                  onPress={isRecording ? stopRecording : startRecording}
                >
                  <Feather name="mic" size={22} color={isRecording ? '#fff' : buddiColors.primary} />
                </Pressable>
                <View style={styles.composerFlex}>
                  <InputToolbar
                    {...inputToolbarProps}
                    containerStyle={[styles.inputToolbar, styles.inputToolbarNoBorder]}
                    primaryStyle={styles.inputToolbarPrimary}
                    renderComposer={(composerProps) => (
                      <View style={styles.composerWrap}>
                        <Composer
                          {...composerProps}
                          textInputProps={{
                            ...composerProps.textInputProps,
                            style: [styles.textInput, composerProps.textInputProps?.style],
                          }}
                        />
                      </View>
                    )}
                    renderSend={(sendProps) => (
                      <Send
                        {...sendProps}
                        containerStyle={styles.sendWrap}
                        textStyle={styles.sendText}
                      />
                    )}
                  />
                </View>
              </View>
            </View>
          )}
          renderMessageImage={(props) => {
            const imgUrl = props.currentMessage?.image;
            if (!imgUrl) return null;
            return (
              <Pressable onPress={() => {}}>
                <Image
                  source={{ uri: imgUrl }}
                  style={styles.messageImage}
                  resizeMode="cover"
                />
              </Pressable>
            );
          }}
          renderMessageVideo={(props) => {
            const videoUrl = props.currentMessage?.video;
            if (!videoUrl) return null;
            return (
              <Video
                source={{ uri: videoUrl }}
                style={styles.messageVideo}
                useNativeControls
                resizeMode="contain"
                isLooping={false}
              />
            );
          }}
          renderCustomView={(props) => {
            const audioUrl = (props.currentMessage as any)?.audio;
            if (!audioUrl) return null;
            return (
              <AudioMessage
                uri={audioUrl}
                isMine={props.currentMessage?.user?._id === user?.uid}
              />
            );
          }}
          renderBubble={(bubbleProps) => (
            <Bubble
              {...bubbleProps}
              wrapperStyle={{
                right: { backgroundColor: buddiColors.primary },
                left: { backgroundColor: buddiColors.surfaceMuted },
              }}
              textStyle={{
                right: { color: '#fff' },
                left: { color: buddiColors.textPrimary },
              }}
            />
          )}
          renderDay={({ createdAt }) => {
            const date = createdAt instanceof Date ? createdAt : new Date(createdAt);
            const label =
              date.toDateString() === new Date().toDateString()
                ? 'Today'
                : date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
            return (
              <View style={styles.daySeparator}>
                <Text style={styles.daySeparatorText}>{label}</Text>
              </View>
            );
          }}
        />
      </View>

      {/* Group options / settings modal */}
      <Modal
        visible={showGroupOptions}
        animationType="slide"
        onRequestClose={() => setShowGroupOptions(false)}
      >
        <View style={[styles.optionsContainer, { paddingTop: insets.top }]}>
          {/* Header */}
          <View style={styles.optionsHeader}>
            <Pressable onPress={() => setShowGroupOptions(false)} style={styles.optionsBackButton}>
              <Feather name="x" size={24} color={buddiColors.textPrimary} />
            </Pressable>
            <Text style={styles.optionsTitle}>Group Settings</Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView style={styles.optionsScroll} contentContainerStyle={styles.optionsScrollContent} showsVerticalScrollIndicator={false}>
            {/* Group details summary */}
            <View style={styles.optionsGroupCard}>
              <View style={styles.optionsAvatarGroup}>
                <Feather name="users" size={32} color={buddiColors.primary} />
              </View>
              <Text style={styles.optionsGroupName}>{chatName}</Text>
              <Text style={styles.optionsGroupMeta}>{members} members</Text>
            </View>

            {/* Background Selector */}
            <View style={styles.optionsSection}>
              <Text style={styles.optionsSectionTitle}>Chat Background</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.bgList}>
                {BACKGROUNDS.map((bg) => {
                  const isSelected = bg.id === conversationBackground;
                  return (
                    <Pressable
                      key={bg.id}
                      style={[styles.bgItem, isSelected && styles.bgItemAct]}
                      onPress={() => firebaseApi.chat.updateChatBackground(id, bg.id)}
                    >
                      <View style={[styles.bgOuter, isSelected && styles.bgOuterSelected]}>
                        {bg.isGradient ? (
                          <LinearGradient colors={bg.colors || []} style={styles.bgPreview} />
                        ) : (
                          <View style={[styles.bgPreview, { backgroundColor: bg.value }]} />
                        )}
                      </View>
                      <Text style={styles.bgLabel} numberOfLines={1}>{bg.name}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {/* Members Management */}
            <View style={styles.optionsSection}>
              <Text style={styles.optionsSectionTitle}>Group Members</Text>
              <View style={styles.memberList}>
                {groupMembersList.map((m) => {
                  const currentUserRole = conversationRoles[user?.uid ?? ''];
                  const isCurrentUserCreator = currentUserRole === 'creator';
                  const isCurrentUserAdmin = currentUserRole === 'admin';
                  const isTargetCreator = m.role === 'creator';
                  const isTargetAdmin = m.role === 'admin';
                  
                  // Can current user kick target?
                  // Creator can kick anyone. Admin can kick member.
                  const canKick = (isCurrentUserCreator && !isTargetCreator) || (isCurrentUserAdmin && !isTargetCreator && !isTargetAdmin);
                  // Can current user promote/demote? Only creator can promote/demote admins.
                  const canManageRole = isCurrentUserCreator && !isTargetCreator;

                  return (
                    <View key={m.id} style={styles.memberRow}>
                      <View style={styles.memberInfo}>
                        <Text style={styles.memberName}>{m.name} {m.id === user?.uid && '(You)'}</Text>
                        <View style={[
                          styles.roleBadge,
                          m.role === 'creator' && styles.roleBadgeCreator,
                          m.role === 'admin' && styles.roleBadgeAdmin
                        ]}>
                          <Text style={styles.roleBadgeText}>{m.role.toUpperCase()}</Text>
                        </View>
                      </View>
                      
                      <View style={styles.memberActions}>
                        {canManageRole && (
                          <Pressable
                            style={styles.actionBtnSecondary}
                            onPress={async () => {
                              const newRole = m.role === 'admin' ? 'member' : 'admin';
                              await firebaseApi.chat.updateParticipantRole(id, m.id, newRole);
                            }}
                          >
                            <Text style={styles.actionBtnTextSecondary}>
                              {m.role === 'admin' ? 'Demote' : 'Make Admin'}
                            </Text>
                          </Pressable>
                        )}
                        {canKick && m.id !== user?.uid && (
                          <Pressable
                            style={styles.actionBtnDanger}
                            onPress={() => {
                              Alert.alert(
                                'Remove Member',
                                `Are you sure you want to remove ${m.name} from this group?`,
                                [
                                  { text: 'Cancel', style: 'cancel' },
                                  {
                                    text: 'Remove',
                                    style: 'destructive',
                                    onPress: async () => {
                                      await firebaseApi.chat.removeParticipant(id, m.id);
                                    }
                                  }
                                ]
                              );
                            }}
                          >
                            <Feather name="user-x" size={16} color={buddiColors.dangerText} />
                          </Pressable>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Leave Group */}
            <Pressable
              style={styles.leaveButton}
              onPress={() => {
                const currentUserRole = conversationRoles[user?.uid ?? ''];
                const isCreator = currentUserRole === 'creator';
                const msg = isCreator
                  ? 'Leaving as creator will delete this group and chat conversation. Are you sure?'
                  : 'Are you sure you want to leave this group?';
                
                Alert.alert(
                  'Leave Group',
                  msg,
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Leave',
                      style: 'destructive',
                      onPress: async () => {
                        await firebaseApi.chat.leaveGroup(id, user!.uid);
                        setShowGroupOptions(false);
                        router.replace('/(tabs)/messages');
                      }
                    }
                  ]
                );
              }}
            >
              <Feather name="log-out" size={20} color={buddiColors.textOnDark} />
              <Text style={styles.leaveButtonText}>Leave Group</Text>
            </Pressable>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: buddiColors.background,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: buddiColors.surface,
    borderBottomWidth: 1,
    borderBottomColor: buddiColors.surfaceBorder,
  },
  backButton: {
    marginRight: 12,
  },
  chatInfo: {
    flex: 1,
  },
  chatNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  chatName: {
    fontSize: 18,
    fontWeight: '600',
    color: buddiColors.textPrimary,
    flexShrink: 1,
  },
  chatMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chatMetaText: {
    fontSize: 12,
    color: buddiColors.textSecondary,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: buddiColors.badgeHighlight,
    marginLeft: 4,
  },
  chatWrapper: {
    flex: 1,
  },
  messageList: {
    backgroundColor: buddiColors.background,
    flexGrow: 1,
  },
  messageListContent: {
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  messagesContainer: {
    backgroundColor: buddiColors.background,
  },
  inputToolbarWrapper: {
    backgroundColor: buddiColors.surface,
    paddingHorizontal: 12,
    paddingTop: 4,
  },
  inputToolbar: {
    backgroundColor: 'transparent',
    paddingVertical: 0,
    minHeight: undefined,
  },
  inputToolbarNoBorder: {
    borderTopWidth: 0,
  },
  inputToolbarPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    paddingVertical: 0,
  },
  composerWrap: {
    flex: 1,
    height: 44,
    justifyContent: 'center',
    marginRight: 4,
  },
  textInput: {
    flex: 1,
    minHeight: 36,
    maxHeight: 88,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: buddiColors.surfaceMuted,
    color: buddiColors.textPrimary,
    fontSize: 16,
    lineHeight: 20,
  },
  sendWrap: {
    justifyContent: 'center',
    paddingBottom: 0,
    marginBottom: 0,
    minWidth: 56,
  },
  sendText: {
    paddingVertical: 6,
    paddingHorizontal: 4,
    fontSize: 16,
    fontWeight: '600',
  },
  daySeparator: {
    alignSelf: 'center',
    marginVertical: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: buddiColors.surfaceMuted,
    borderRadius: 14,
  },
  daySeparatorText: {
    fontSize: 12,
    fontWeight: '600',
    color: buddiColors.textSecondary,
  },
  toolbarRow: {
    flexDirection: 'row',
    direction: 'ltr',
    alignItems: 'center',
    gap: 4,
  },
  composerFlex: {
    flex: 1,
  },
  mediaBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: buddiColors.surfaceMuted,
  },
  mediaBtnRecording: {
    backgroundColor: buddiColors.dangerText || '#e53e3e',
  },
  mediaUploading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  mediaUploadingText: {
    fontSize: 12,
    color: buddiColors.textSecondary,
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
    margin: 4,
  },
  audioMsg: {
    flexDirection: 'row',
    direction: 'ltr',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  audioWaveform: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    flex: 1,
  },
  audioBar: {
    width: 3,
    borderRadius: 2,
    backgroundColor: buddiColors.surfaceBorder,
  },
  audioLabel: {
    fontSize: 11,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  moreMenuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 100,
    paddingRight: 20,
  },
  moreMenuBox: {
    backgroundColor: buddiColors.surface,
    borderRadius: 12,
    padding: 8,
    minWidth: 160,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  moreMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  moreMenuUnmatchText: {
    fontSize: 16,
    color: buddiColors.dangerText,
    fontWeight: '500',
  },
  moreMenuItemText: {
    fontSize: 16,
    color: buddiColors.textPrimary,
    fontWeight: '500',
  },
  moreMenuPlaceholder: {
    fontSize: 14,
    color: buddiColors.textSecondary,
    padding: 16,
  },
  optionsContainer: {
    flex: 1,
    backgroundColor: buddiColors.background,
  },
  optionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: buddiColors.surfaceBorder,
    backgroundColor: buddiColors.surface,
  },
  optionsBackButton: {
    padding: 8,
  },
  optionsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: buddiColors.textPrimary,
  },
  optionsScroll: {
    flex: 1,
  },
  optionsScrollContent: {
    padding: 20,
    gap: 24,
  },
  optionsGroupCard: {
    backgroundColor: buddiColors.surface,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: buddiColors.surfaceBorder,
  },
  optionsAvatarGroup: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: buddiColors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionsGroupName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: buddiColors.textPrimary,
  },
  optionsGroupMeta: {
    fontSize: 14,
    color: buddiColors.textSecondary,
  },
  optionsSection: {
    gap: 12,
  },
  optionsSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: buddiColors.textPrimary,
  },
  bgList: {
    gap: 12,
    paddingVertical: 4,
  },
  bgItem: {
    width: 80,
    alignItems: 'center',
    gap: 6,
  },
  bgItemAct: {
    transform: [{ scale: 1.05 }],
  },
  bgOuter: {
    width: 66,
    height: 66,
    borderRadius: 33,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  bgOuterSelected: {
    borderColor: buddiColors.primary,
  },
  bgPreview: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  bgLabel: {
    fontSize: 11,
    color: buddiColors.textSecondary,
    textAlign: 'center',
    width: '100%',
  },
  memberList: {
    backgroundColor: buddiColors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: buddiColors.surfaceBorder,
    overflow: 'hidden',
  },
  memberRow: {
    flexDirection: 'row',
    direction: 'ltr',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: buddiColors.surfaceBorder,
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  memberName: {
    fontSize: 15,
    fontWeight: '500',
    color: buddiColors.textPrimary,
  },
  roleBadge: {
    backgroundColor: buddiColors.surfaceMuted,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  roleBadgeCreator: {
    backgroundColor: buddiColors.primaryMuted,
  },
  roleBadgeAdmin: {
    backgroundColor: '#EEF2FF', // indigo-50
  },
  roleBadgeText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: buddiColors.textSecondary,
  },
  memberActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtnSecondary: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: buddiColors.surfaceMuted,
  },
  actionBtnTextSecondary: {
    fontSize: 12,
    fontWeight: '600',
    color: buddiColors.textPrimary,
  },
  actionBtnDanger: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: buddiColors.dangerBackground,
  },
  leaveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: buddiColors.dangerText,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 12,
  },
  leaveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: buddiColors.textOnDark,
  },
  messageVideo: {
    width: 200,
    height: 150,
    borderRadius: 12,
    margin: 4,
  },
});
