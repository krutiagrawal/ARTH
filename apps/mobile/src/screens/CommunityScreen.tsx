import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Dimensions, ActivityIndicator, Modal } from 'react-native';
import { Text, TextInput } from '../components/common/AppText';
import Animated from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/typography';
import { RADIUS, SHADOWS } from '../constants/theme';
import { GlassCard } from '../components/common/GlassCard';
import { ProgressRing } from '../components/common/ProgressRing';
import { EmptyState } from '../components/common/EmptyState';
import { useBottomNavClearance } from '../components/navigation/BottomNav';
import { useSlideUp, useFadeIn } from '../hooks/useAnimations';
import {
  useFriends,
  useFriendRequests,
  useSearchUsers,
  useSendFriendRequest,
  useRespondFriendRequest,
  useRemoveFriend,
  useChallenges,
  useJoinChallenge,
  useGlobalCounter,
  useLeaderboard,
  useFeed,
  useCheerActivity,
  usePublicProfile,
  useUserStories,
} from '../hooks/useApiQueries';
import { StoriesTray } from '../components/stories/StoriesTray';
import { FollowingFeedScreen } from './FollowingFeedScreen';
import { NotificationBell } from '../components/social/NotificationBell';
import { StoryViewer } from '../components/stories/StoryViewer';
import type { ApiFriend, ApiFriendRequest } from '../api/friends';
import type { ApiChallenge } from '../api/challenges';
import type { LeaderboardEntry } from '../api/leaderboard';
import type { ApiActivity, ActivityType } from '../api/feed';

const { width: SW } = Dimensions.get('window');
// 'feed' is the social feed of posts; 'activity' is the older gamification stream
// (tree_planted / achievement_unlocked / ...), whose "cheer" reaction stays separate from
// post likes — they count different things.
type Tab = 'feed' | 'friends' | 'activity' | 'challenges' | 'leaderboard';

const TAB_LABELS: Record<Tab, string> = {
  feed: '📸 Feed',
  friends: '👥 Friends',
  activity: '⚡ Activity',
  challenges: '⚔️ Quests',
  leaderboard: '🏆 Ranks',
};

const ACTIVITY_COPY: Record<ActivityType, { icon: string; text: (name: string) => string }> = {
  tree_planted: { icon: '🌱', text: (name) => `${name} planted a tree` },
  achievement_unlocked: { icon: '🏆', text: (name) => `${name} unlocked an achievement` },
  streak_milestone: { icon: '🔥', text: (name) => `${name} hit a streak milestone` },
  friend_cheer: { icon: '👏', text: (name) => `${name} cheered a friend` },
  challenge_joined: { icon: '⚔️', text: (name) => `${name} joined a challenge` },
  challenge_completed: { icon: '🎉', text: (name) => `${name} completed a challenge` },
};

function formatRelativeTime(iso: string | null): string {
  if (!iso) return 'a while ago';
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function GlobalCounter() {
  const fadeStyle = useFadeIn(0);
  const { data } = useGlobalCounter();

  return (
    <Animated.View style={fadeStyle}>
      <LinearGradient
        colors={[COLORS.forest, COLORS.forestDeep]}
        style={styles.globalCounter}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Text style={styles.globalCounterLabel}>🌍 GLOBAL TREES PLANTED TODAY</Text>
        <Text style={styles.globalCounterNum}>{(data?.treesToday ?? 0).toLocaleString()}</Text>
        <View style={styles.globalCounterRow}>
          <Text style={styles.globalCounterSub}>{(data?.plantersToday ?? 0).toLocaleString()} planters</Text>
        </View>
        <View style={styles.globalCounterBar}>
          <Animated.View style={[styles.globalCounterFill, { width: `${data?.percentOfGoal ?? 0}%` }]} />
        </View>
        <Text style={styles.globalCounterGoal}>Daily goal: {(data?.dailyGoal ?? 0).toLocaleString()} 🌱</Text>
      </LinearGradient>
    </Animated.View>
  );
}

function FriendCard({ friend, index, onPress }: { friend: ApiFriend; index: number; onPress: () => void }) {
  const slideStyle = useSlideUp(index * 80, 20);
  return (
    <Animated.View style={slideStyle}>
      <TouchableOpacity activeOpacity={0.85} onPress={onPress}>
        <GlassCard variant="dark" style={styles.friendCard}>
          <View style={styles.friendAvatarWrapper}>
            <View style={[styles.friendAvatar, { backgroundColor: COLORS.mintLight }]}>
              <Text style={styles.friendAvatarEmoji}>{friend.avatar}</Text>
            </View>
            {friend.isOnline && <View style={styles.onlineDot} />}
          </View>
          <View style={styles.friendInfo}>
            <Text style={styles.friendNameDark}>{friend.name}</Text>
            <Text style={styles.friendStatsDark}>
              🌳 {friend.treesPlanted} trees · 🔥 {friend.streak} streak
            </Text>
            <Text style={styles.friendActiveDark}>
              {friend.isOnline ? '🟢 Online now' : `⏱ ${formatRelativeTime(friend.lastActive)}`}
            </Text>
          </View>
          <View style={styles.friendRight}>
            <LinearGradient
              colors={[COLORS.sageLight, COLORS.sage]}
              style={styles.friendLevelBadge}
            >
              <Text style={styles.friendLevelText}>Lv.{friend.forestLevel}</Text>
            </LinearGradient>
            <Text style={styles.friendArrowDark}>›</Text>
          </View>
        </GlassCard>
      </TouchableOpacity>
    </Animated.View>
  );
}

function FriendRequestRow({ request }: { request: ApiFriendRequest }) {
  const respondMutation = useRespondFriendRequest();
  return (
    <GlassCard variant="dark" style={styles.friendCard}>
      <View style={[styles.friendAvatar, { backgroundColor: COLORS.mintLight }]}>
        <Text style={styles.friendAvatarEmoji}>{request.from.avatar}</Text>
      </View>
      <View style={styles.friendInfo}>
        <Text style={styles.friendNameDark}>{request.from.name}</Text>
        <Text style={styles.friendStatsDark}>wants to be your friend</Text>
      </View>
      <View style={styles.requestActions}>
        <TouchableOpacity
          style={styles.requestAccept}
          onPress={() => respondMutation.mutate({ id: request.id, action: 'accept' })}
          accessibilityRole="button"
          accessibilityLabel={`Accept friend request from ${request.from.name}`}
        >
          <Text style={styles.requestAcceptText}>✓</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.requestDecline}
          onPress={() => respondMutation.mutate({ id: request.id, action: 'decline' })}
          accessibilityRole="button"
          accessibilityLabel={`Decline friend request from ${request.from.name}`}
        >
          <Text style={styles.requestDeclineText}>✕</Text>
        </TouchableOpacity>
      </View>
    </GlassCard>
  );
}

function AddFriendPanel({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState('');
  const { data: results = [], isFetching } = useSearchUsers(query);
  const sendRequestMutation = useSendFriendRequest();
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());

  return (
    <GlassCard variant="dark" style={styles.addFriendPanel}>
      <View style={styles.addFriendHeader}>
        <TextInput
          style={styles.addFriendInputDark}
          placeholder="Search by name or handle..."
          placeholderTextColor="rgba(255,255,255,0.5)"
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
        />
        <TouchableOpacity onPress={onClose} accessibilityRole="button" accessibilityLabel="Close search">
          <Text style={styles.addFriendCloseDark}>✕</Text>
        </TouchableOpacity>
      </View>
      {isFetching && <ActivityIndicator size="small" color={COLORS.sage} style={{ marginTop: 8 }} />}
      {results.map(user => (
        <View key={user.id} style={styles.searchResultRow}>
          <Text style={styles.searchResultAvatar}>{user.avatarEmoji}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.friendNameDark}>{user.name}</Text>
            <Text style={styles.friendActiveDark}>@{user.handle} · Lv.{user.level}</Text>
          </View>
          <TouchableOpacity
            style={styles.searchResultButton}
            disabled={sentIds.has(user.id)}
            onPress={() => {
              sendRequestMutation.mutate(user.id);
              setSentIds(prev => new Set(prev).add(user.id));
            }}
          >
            <Text style={styles.searchResultButtonText}>{sentIds.has(user.id) ? 'Sent ✓' : 'Add'}</Text>
          </TouchableOpacity>
        </View>
      ))}
    </GlassCard>
  );
}

function FriendProfileModal({ userId, onClose }: { userId: string | null; onClose: () => void }) {
  const { data: profile, isLoading } = usePublicProfile(userId);
  const { data: stories = [] } = useUserStories(userId);
  const removeFriendMutation = useRemoveFriend();
  const [viewingStory, setViewingStory] = useState(false);

  return (
    <Modal visible={!!userId} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
          <GlassCard variant="dark" style={styles.profileModalCardDark}>
            {isLoading || !profile ? (
              <ActivityIndicator size="small" color={COLORS.sage} style={{ paddingVertical: 40 }} />
            ) : (
              <>
                <TouchableOpacity
                  activeOpacity={stories.length > 0 ? 0.8 : 1}
                  onPress={() => stories.length > 0 && setViewingStory(true)}
                >
                  {stories.length > 0 ? (
                    <LinearGradient
                      colors={[COLORS.golden, COLORS.sage, COLORS.forest]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.profileModalStoryRing}
                    >
                      <View style={styles.profileModalAvatarRinged}>
                        <Text style={styles.profileModalAvatarEmoji}>{profile.avatarEmoji}</Text>
                      </View>
                    </LinearGradient>
                  ) : (
                    <View style={styles.profileModalAvatar}>
                      <Text style={styles.profileModalAvatarEmoji}>{profile.avatarEmoji}</Text>
                    </View>
                  )}
                </TouchableOpacity>
                {stories.length > 0 && <Text style={styles.profileModalStoryHint}>Tap avatar to view story</Text>}
                <Text style={styles.profileModalNameDark}>{profile.name}</Text>
                <Text style={styles.profileModalHandleDark}>@{profile.handle}</Text>
                <View style={styles.profileModalStats}>
                  <View style={styles.profileModalStat}>
                    <Text style={styles.profileModalStatNumDark}>{profile.treesPlantedCount}</Text>
                    <Text style={styles.profileModalStatLabelDark}>Trees</Text>
                  </View>
                  <View style={styles.profileModalStat}>
                    <Text style={styles.profileModalStatNumDark}>{profile.streakCurrent}</Text>
                    <Text style={styles.profileModalStatLabelDark}>Streak</Text>
                  </View>
                  <View style={styles.profileModalStat}>
                    <Text style={styles.profileModalStatNumDark}>{profile.badgesCount}</Text>
                    <Text style={styles.profileModalStatLabelDark}>Badges</Text>
                  </View>
                  <View style={styles.profileModalStat}>
                    <Text style={styles.profileModalStatNumDark}>Lv.{profile.level}</Text>
                    <Text style={styles.profileModalStatLabelDark}>Level</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.removeFriendButton}
                  onPress={() => {
                    removeFriendMutation.mutate(profile.id);
                    onClose();
                  }}
                >
                  <Text style={styles.removeFriendText}>Remove Friend</Text>
                </TouchableOpacity>
              </>
            )}
          </GlassCard>
        </TouchableOpacity>
      </TouchableOpacity>

      {profile && stories.length > 0 && (
        <StoryViewer
          visible={viewingStory}
          stories={stories}
          authorName={profile.name}
          authorAvatar={profile.avatarEmoji}
          onClose={() => setViewingStory(false)}
        />
      )}
    </Modal>
  );
}

function ActivityFeedItem({ activity, index }: { activity: ApiActivity; index: number }) {
  const slideStyle = useSlideUp(index * 60, 20);
  const cheerMutation = useCheerActivity();
  const copy = ACTIVITY_COPY[activity.type];

  return (
    <Animated.View style={slideStyle}>
      <GlassCard variant="dark" style={styles.activityCard}>
        <Text style={styles.activityIcon}>{copy.icon}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.activityTextDark}>{copy.text(activity.user.name)}</Text>
          <Text style={styles.activityTimeDark}>{formatRelativeTime(activity.createdAt)}</Text>
        </View>
        <TouchableOpacity
          style={[styles.activityCheerButton, activity.cheeredByMe && styles.activityCheerButtonActive]}
          disabled={activity.cheeredByMe}
          onPress={() => cheerMutation.mutate(activity.id)}
        >
          <Text style={styles.activityCheerIcon}>👏</Text>
          {activity.cheerCount > 0 && <Text style={styles.activityCheerCount}>{activity.cheerCount}</Text>}
        </TouchableOpacity>
      </GlassCard>
    </Animated.View>
  );
}

function ChallengeCard({
  challenge,
  index,
  joined,
  onJoin,
}: {
  challenge: ApiChallenge;
  index: number;
  joined: boolean;
  onJoin: () => void;
}) {
  const slideStyle = useSlideUp(index * 80, 20);

  return (
    <Animated.View style={slideStyle}>
      <GlassCard variant="dark" style={styles.challengeCard}>
        <View style={styles.challengeHeader}>
          <Text style={styles.challengeIcon}>{challenge.icon}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.challengeTitleDark}>{challenge.title}</Text>
            <Text style={styles.challengeDescDark}>{challenge.description}</Text>
          </View>
          <TouchableOpacity
            style={[styles.joinButton, joined && styles.joinButtonJoined]}
            disabled={joined}
            onPress={onJoin}
          >
            <Text style={[styles.joinButtonText, joined && styles.joinButtonTextJoined]}>
              {joined ? 'Joined ✓' : 'Join'}
            </Text>
          </TouchableOpacity>
        </View>
        <View style={styles.challengeFooter}>
          <View style={styles.challengeStat}>
            <Text style={styles.challengeStatIcon}>👥</Text>
            <Text style={styles.challengeStatTextDark}>{challenge.participants.toLocaleString()}</Text>
          </View>
          <View style={styles.challengeStat}>
            <Text style={styles.challengeStatIcon}>⏰</Text>
            <Text style={styles.challengeStatTextDark}>{challenge.daysLeft}d left</Text>
          </View>
          <View style={styles.xpReward}>
            <Text style={styles.xpRewardText}>+{challenge.xpReward} XP</Text>
          </View>
        </View>
      </GlassCard>
    </Animated.View>
  );
}

function LeaderboardRow({ entry, index }: { entry: LeaderboardEntry; index: number }) {
  const slideStyle = useSlideUp(index * 60, 20);

  const rankColors: Record<number, [string, string]> = {
    1: [COLORS.amberLight, COLORS.golden],
    2: [COLORS.silver, '#A0A0A0'],
    3: [COLORS.bronze, '#A05020'],
  };

  return (
    <Animated.View style={slideStyle}>
      <GlassCard variant="warm" style={[styles.leaderRow, entry.isUser && styles.leaderRowUser]}>
        {rankColors[entry.rank] ? (
          <LinearGradient
            colors={rankColors[entry.rank]}
            style={styles.rankBadge}
          >
            <Text style={styles.rankText}>{entry.rank}</Text>
          </LinearGradient>
        ) : (
          <View style={styles.rankBadgePlainDark}>
            <Text style={styles.rankTextPlainDark}>{entry.rank}</Text>
          </View>
        )}
        <View style={[styles.leaderAvatar, { backgroundColor: entry.isUser ? COLORS.mintLight : COLORS.sand }]}>
          <Text style={styles.leaderAvatarEmoji}>{entry.avatar}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.leaderNameDark, entry.isUser && styles.leaderNameUser]}>
            {entry.name}
          </Text>
          <Text style={styles.leaderStreakDark}>🔥 {entry.streak} streak</Text>
        </View>
        <View style={styles.leaderTreeCount}>
          <Text style={styles.leaderTreeNumDark}>{entry.trees}</Text>
          <Text style={styles.leaderTreeLabelDark}>trees</Text>
        </View>
      </GlassCard>
    </Animated.View>
  );
}

export function CommunityScreen({ navigation }: any) {
  const [activeTab, setActiveTab] = useState<Tab>('feed');
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [joinedIds, setJoinedIds] = useState<Set<string>>(new Set());
  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null);
  const insets = useSafeAreaInsets();
  const bottomNavClearance = useBottomNavClearance();

  const { data: friends = [] } = useFriends();
  const { data: friendRequests = [] } = useFriendRequests();
  const { data: challenges = [] } = useChallenges();
  const joinChallengeMutation = useJoinChallenge();
  const { data: leaderboard } = useLeaderboard('global');
  const { data: feed = [] } = useFeed('friends');

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <LinearGradient colors={[COLORS.cream, COLORS.beigeLight]} style={StyleSheet.absoluteFill} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.headerTitleDark}>Community 🌱</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <NotificationBell onPress={() => navigation.navigate('Notifications')} />
          <TouchableOpacity style={styles.ngoButton} onPress={() => navigation.navigate('NgoDirectory')}>
            <Text style={styles.ngoButtonText}>🌿 NGOs</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.ngoButton} onPress={() => navigation.navigate('NurseryDirectory')}>
            <Text style={styles.ngoButtonText}>🌱 Nurseries</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.addFriendButton} onPress={() => setShowAddFriend(prev => !prev)}>
            <LinearGradient colors={[COLORS.sageLight, COLORS.sage]} style={styles.addFriendGradient}>
              <Text style={styles.addFriendText}>{showAddFriend ? 'Close' : '+ Add Friend'}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tab bar */}
      <GlassCard variant="warm" noPadding borderRadius={RADIUS.xl} style={styles.tabBarDark}>
        {(Object.keys(TAB_LABELS) as Tab[]).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text
              style={[styles.tabTextDark, activeTab === tab && styles.tabTextActive]}
              numberOfLines={1}
            >
              {TAB_LABELS[tab]}
            </Text>
          </TouchableOpacity>
        ))}
      </GlassCard>

      {activeTab === 'feed' ? (
        <FollowingFeedScreen navigation={navigation} embedded />
      ) : (
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomNavClearance }]}
        showsVerticalScrollIndicator={false}
      >
        <GlobalCounter />

        {showAddFriend && <AddFriendPanel onClose={() => setShowAddFriend(false)} />}

        {activeTab === 'friends' && (
          <View style={styles.section}>
            {friendRequests.length > 0 && (
              <>
                <Text style={styles.sectionTitleDark}>Friend Requests</Text>
                {friendRequests.map(request => (
                  <FriendRequestRow key={request.id} request={request} />
                ))}
              </>
            )}
            <Text style={styles.sectionTitleDark}>Your Squad</Text>
            {friends.length === 0 ? (
              <EmptyState
                icon="🌲"
                title="Your forest is better with friends"
                body="Search above to find people and grow together."
                tint="light"
              />
            ) : (
              friends.map((friend, i) => (
                <FriendCard key={friend.id} friend={friend} index={i} onPress={() => setSelectedFriendId(friend.id)} />
              ))
            )}
          </View>
        )}

        {activeTab === 'activity' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitleDark}>Friend Activity</Text>
            {feed.length === 0 ? (
              <EmptyState
                icon="📰"
                title="No activity yet"
                body="Plant a tree or add friends to start seeing updates here."
                tint="light"
              />
            ) : (
              feed.map((activity, i) => (
                <ActivityFeedItem key={activity.id} activity={activity} index={i} />
              ))
            )}
          </View>
        )}

        {activeTab === 'challenges' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitleDark}>Active Challenges</Text>
            {challenges.length === 0 ? (
              <EmptyState
                icon="⚔️"
                title="No challenges right now"
                body="New community challenges will show up here when they open."
                tint="light"
              />
            ) : (
              challenges.map((challenge, i) => (
                <ChallengeCard
                  key={challenge.id}
                  challenge={challenge}
                  index={i}
                  joined={joinedIds.has(challenge.id)}
                  onJoin={() => {
                    joinChallengeMutation.mutate(challenge.id);
                    setJoinedIds(prev => new Set(prev).add(challenge.id));
                  }}
                />
              ))
            )}
          </View>
        )}

        {activeTab === 'leaderboard' && (
          <View style={styles.section}>
            <GlassCard variant="dark" style={styles.yourRankCard}>
              <Text style={styles.yourRankLabelDark}>YOUR RANK</Text>
              <View style={styles.yourRankRow}>
                <Text style={styles.yourRankNumDark}>{leaderboard?.myRank ? `#${leaderboard.myRank}` : '—'}</Text>
                <Text style={styles.yourRankOfDark}>of {(leaderboard?.totalUsers ?? 0).toLocaleString()}</Text>
              </View>
            </GlassCard>

            <Text style={styles.sectionTitleDark}>Top Planters</Text>
            {(leaderboard?.entries ?? []).length === 0 ? (
              <EmptyState
                icon="🏆"
                title="The leaderboard is still filling in"
                body="Plant a tree to claim your spot."
                tint="light"
              />
            ) : (
              (leaderboard?.entries ?? []).map((entry, i) => (
                <LeaderboardRow key={entry.id} entry={entry} index={i} />
              ))
            )}
          </View>
        )}
      </ScrollView>
      )}

      <FriendProfileModal userId={selectedFriendId} onClose={() => setSelectedFriendId(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerTitleDark: {
    fontFamily: FONTS.displayBold,
    fontSize: 26,
    lineHeight: 34,
    color: COLORS.textPrimary,
  },
  ngoButton: {
    borderRadius: RADIUS.full,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: 'rgba(45,90,39,0.1)',
    borderWidth: 1,
    borderColor: COLORS.sage,
    justifyContent: 'center',
  },
  ngoButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.forest,
  },
  addFriendButton: {
    ...SHADOWS.sage,
  },
  addFriendGradient: {
    borderRadius: RADIUS.full,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  addFriendText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.white,
  },
  tabBarDark: {
    flexDirection: 'row',
    marginHorizontal: 16,
    padding: 4,
    marginBottom: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: RADIUS.lg,
  },
  tabActive: {
    backgroundColor: COLORS.forest,
    ...SHADOWS.sm,
  },
  tabTextDark: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  tabTextActive: {
    color: COLORS.white,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  globalCounter: {
    borderRadius: RADIUS.xl,
    padding: 20,
    gap: 6,
    ...SHADOWS.md,
  },
  globalCounterLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(168,196,153,0.9)',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  globalCounterNum: {
    fontSize: 42,
    fontWeight: '900',
    color: COLORS.white,
    letterSpacing: -1,
  },
  globalCounterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  globalCounterSub: {
    fontSize: 12,
    color: COLORS.white,
    fontWeight: '500',
  },
  globalCounterBar: {
    height: 5,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 4,
  },
  globalCounterFill: {
    height: '100%',
    backgroundColor: COLORS.amberLight,
    borderRadius: 3,
  },
  globalCounterGoal: {
    fontSize: 12,
    color: COLORS.white,
    fontWeight: '500',
  },
  section: {
    gap: 8,
  },
  sectionTitleDark: {
    fontSize: 18,
    fontWeight: '700',
    // Sits directly on the page's cream gradient background, NOT inside a GlassCard — must use
    // dark text (was COLORS.white with only a faint shadow, still nearly invisible on cream).
    color: COLORS.textPrimary,
    marginBottom: 4,
    marginTop: 4,
  },
  friendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
  },
  friendAvatarWrapper: {
    position: 'relative',
  },
  friendAvatar: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  friendAvatarEmoji: {
    fontSize: 26,
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  friendInfo: {
    flex: 1,
    gap: 2,
  },
  friendNameDark: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.white,
  },
  friendStatsDark: {
    fontSize: 12,
    color: COLORS.white,
  },
  friendActiveDark: {
    fontSize: 11,
    color: COLORS.white,
  },
  friendRight: {
    alignItems: 'center',
    gap: 6,
  },
  friendLevelBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  friendLevelText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.white,
  },
  friendArrowDark: {
    fontSize: 22,
    color: COLORS.white,
    fontWeight: '300',
  },
  challengeCard: {
    gap: 12,
    padding: 16,
  },
  challengeHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  challengeIcon: {
    fontSize: 32,
    marginTop: 2,
  },
  challengeTitleDark: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.white,
  },
  challengeDescDark: {
    fontSize: 12,
    color: COLORS.white,
    marginTop: 2,
    lineHeight: 18,
  },
  challengeFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  challengeStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  challengeStatIcon: {
    fontSize: 14,
  },
  challengeStatTextDark: {
    fontSize: 12,
    color: COLORS.white,
    fontWeight: '500',
  },
  xpReward: {
    marginLeft: 'auto',
    backgroundColor: 'rgba(74,144,217,0.12)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  xpRewardText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.xpBlue,
  },
  yourRankCard: {
    gap: 6,
    padding: 16,
  },
  yourRankLabelDark: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.sageLight,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  yourRankRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  yourRankNumDark: {
    fontSize: 36,
    fontWeight: '900',
    color: COLORS.white,
    letterSpacing: -1,
  },
  yourRankOfDark: {
    fontSize: 14,
    color: COLORS.white,
  },
  yourRankTrend: {
    fontSize: 13,
    color: COLORS.sage,
    fontWeight: '600',
  },
  leaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
  },
  leaderRowUser: {
    backgroundColor: 'rgba(168,196,153,0.25)',
    borderColor: COLORS.sage,
  },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.white,
  },
  rankBadgePlainDark: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(107,68,35,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankTextPlainDark: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  leaderAvatar: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leaderAvatarEmoji: {
    fontSize: 20,
  },
  leaderNameDark: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  leaderNameUser: {
    color: COLORS.forest,
    fontWeight: '700',
  },
  leaderStreakDark: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  leaderTreeCount: {
    alignItems: 'center',
  },
  leaderTreeNumDark: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.forest,
  },
  leaderTreeLabelDark: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  requestActions: {
    flexDirection: 'row',
    gap: 8,
  },
  requestAccept: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.sage,
    alignItems: 'center',
    justifyContent: 'center',
  },
  requestAcceptText: {
    fontSize: 18,
    color: COLORS.white,
    fontWeight: '700',
  },
  requestDecline: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  requestDeclineText: {
    fontSize: 16,
    color: COLORS.white,
    fontWeight: '600',
  },
  addFriendPanel: {
    gap: 8,
  },
  addFriendHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  addFriendInputDark: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.white,
  },
  addFriendCloseDark: {
    fontSize: 16,
    color: COLORS.white,
    fontWeight: '600',
    paddingHorizontal: 4,
  },
  searchResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  searchResultAvatar: {
    fontSize: 24,
  },
  searchResultButton: {
    backgroundColor: COLORS.sage,
    borderRadius: RADIUS.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  searchResultButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.white,
  },
  joinButton: {
    backgroundColor: COLORS.forest,
    borderRadius: RADIUS.full,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  joinButtonJoined: {
    backgroundColor: 'rgba(135,168,120,0.2)',
  },
  joinButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.white,
  },
  joinButtonTextJoined: {
    color: COLORS.sage,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  profileModalCardDark: {
    width: '100%',
    alignItems: 'center',
    padding: 24,
    backgroundColor: 'rgba(13,35,24,0.92)',
  },
  profileModalAvatar: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: COLORS.mintLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  profileModalStoryRing: {
    width: 80,
    height: 80,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  profileModalAvatarRinged: {
    width: 72,
    height: 72,
    borderRadius: 23,
    backgroundColor: COLORS.mintLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(0,0,0,0.25)',
  },
  profileModalStoryHint: {
    fontSize: 11,
    color: COLORS.white,
    marginBottom: 8,
  },
  profileModalAvatarEmoji: {
    fontSize: 38,
  },
  profileModalNameDark: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.white,
  },
  profileModalHandleDark: {
    fontSize: 13,
    color: COLORS.white,
    marginTop: 2,
  },
  profileModalStats: {
    flexDirection: 'row',
    width: '100%',
    marginTop: 18,
    marginBottom: 18,
  },
  profileModalStat: {
    flex: 1,
    alignItems: 'center',
  },
  profileModalStatNumDark: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.sageLight,
  },
  profileModalStatLabelDark: {
    fontSize: 10,
    color: COLORS.white,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  removeFriendButton: {
    width: '100%',
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: RADIUS.lg,
    backgroundColor: 'rgba(232,137,106,0.12)',
  },
  removeFriendText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.coral,
  },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
  },
  activityIcon: {
    fontSize: 26,
  },
  activityTextDark: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
  },
  activityTimeDark: {
    fontSize: 11,
    color: COLORS.white,
    marginTop: 2,
  },
  activityCheerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(135,168,120,0.15)',
    borderRadius: RADIUS.full,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  activityCheerButtonActive: {
    backgroundColor: COLORS.sage,
  },
  activityCheerIcon: {
    fontSize: 14,
  },
  activityCheerCount: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.forest,
  },
});
