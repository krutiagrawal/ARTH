import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Dimensions, ActivityIndicator } from 'react-native';
import { Text, TextInput } from '../components/common/AppText';
import Animated from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { COLORS, ON_DARK_SURFACE } from '../constants/colors';
import { FONTS } from '../constants/typography';
import { RADIUS, SHADOWS, SPACING } from '../constants/theme';
import { BorderCard } from '../components/common/BorderCard';
import { Sheet } from '../components/common/Sheet';
import { Toast } from '../components/common/Toast';
import { StoryRing, type StoryRingStatus } from '../components/common/StoryRing';
import { StoryAvatar } from '../components/common/StoryAvatar';
import { useSoundSystem } from '../hooks/useSoundSystem';
import { ProgressRing } from '../components/common/ProgressRing';
import { EmptyState } from '../components/common/EmptyState';
import { useBottomNavClearance } from '../components/navigation/BottomNav';
import { useSlideUp, useFadeIn } from '../hooks/useAnimations';
import { useTimeTheme, isNightlikePeriod } from '../hooks/useTimeTheme';
import {
  useFriends,
  useFriendRequests,
  useSearchUsers,
  useSendFriendRequest,
  useChallenges,
  useJoinChallenge,
  useLeaveChallenge,
  useChallengeFriendsJoined,
  useGlobalCounter,
  useUserLeaderboardPage,
  usePublicNgoLeaderboardPage,
  usePublicNurseryLeaderboardPage,
  LEADERBOARD_PAGE_SIZE,
  useFeed,
  useCheerActivity,
  useRingStatus,
} from '../hooks/useApiQueries';
import { FollowingFeedScreen } from './FollowingFeedScreen';
import { NotificationBell } from '../components/social/NotificationBell';
import { FriendCard, FriendRequestRow, formatRelativeTime } from '../components/social/FriendRow';
import type { ApiChallenge, ApiChallengeFriend } from '../api/challenges';
import type { LeaderboardEntry } from '../api/leaderboard';
import type { PublicNgoLeaderboardEntry, PublicNurseryLeaderboardEntry } from '../api/publicLeaderboard';
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

function AddFriendPanel({ onClose, navigation }: { onClose: () => void; navigation: any }) {
  const [query, setQuery] = useState('');
  const { data: results = [], isFetching } = useSearchUsers(query);
  const sendRequestMutation = useSendFriendRequest();
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());

  return (
    <View style={styles.addFriendPanel}>
      <View style={styles.addFriendSearchBox}>
        <TextInput
          style={styles.addFriendInputDark}
          placeholder="Search by name or handle..."
          placeholderTextColor={COLORS.textMuted}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
        />
        <TouchableOpacity onPress={onClose} accessibilityRole="button" accessibilityLabel="Close search" hitSlop={8}>
          <Text style={styles.addFriendCloseDark}>✕</Text>
        </TouchableOpacity>
      </View>
      {isFetching && <ActivityIndicator size="small" color={COLORS.sage} style={{ marginTop: 8 }} />}
      {query.trim().length > 0 && !isFetching && results.length === 0 && (
        <Text style={styles.searchEmptyDark}>No one matches "{query.trim()}"</Text>
      )}
      {results.map(user => (
        <TouchableOpacity
          key={user.id}
          style={styles.searchResultRow}
          activeOpacity={0.7}
          onPress={() => {
            onClose();
            navigation.navigate('UserPublicProfile', { userId: user.id });
          }}
        >
          <Text style={styles.searchResultAvatar}>{user.avatarEmoji}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.friendNameDark}>{user.name}</Text>
            <Text style={styles.friendActiveDark}>@{user.handle} · Lv.{user.level}</Text>
          </View>
          <TouchableOpacity
            style={styles.searchResultButton}
            disabled={sentIds.has(user.id)}
            onPress={(e) => {
              e.stopPropagation();
              sendRequestMutation.mutate(user.id);
              setSentIds(prev => new Set(prev).add(user.id));
            }}
          >
            <Text style={styles.searchResultButtonText}>{sentIds.has(user.id) ? 'Sent ✓' : 'Add'}</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function ActivityFeedItem({ activity, index }: { activity: ApiActivity; index: number }) {
  const slideStyle = useSlideUp(index * 60, 20);
  const cheerMutation = useCheerActivity();
  const copy = ACTIVITY_COPY[activity.type];

  return (
    <Animated.View style={slideStyle}>
      <View style={styles.activityCard}>
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
      </View>
    </Animated.View>
  );
}

const FRIENDS_JOINED_PREVIEW_COUNT = 3;

function ChallengeCard({
  challenge,
  index,
  joined,
  onJoin,
  friendsJoined,
  onSeeAllFriends,
}: {
  challenge: ApiChallenge;
  index: number;
  joined: boolean;
  onJoin: () => void;
  friendsJoined?: { count: number; friends: ApiChallengeFriend[] };
  onSeeAllFriends: () => void;
}) {
  const slideStyle = useSlideUp(index * 80, 20);
  const preview = friendsJoined?.friends.slice(0, FRIENDS_JOINED_PREVIEW_COUNT) ?? [];

  return (
    <Animated.View style={slideStyle}>
      <BorderCard style={styles.challengeCard}>
        <View style={styles.challengeHeader}>
          <Text style={styles.challengeIcon}>{challenge.icon}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.challengeTitleDark}>{challenge.title}</Text>
            <Text style={styles.challengeDescDark}>{challenge.description}</Text>
          </View>
          <TouchableOpacity
            style={[styles.joinButton, joined && styles.joinButtonJoined]}
            onPress={onJoin}
          >
            <Text style={[styles.joinButtonText, joined && styles.joinButtonTextJoined]}>
              {joined ? 'Joined ✓' : 'Join'}
            </Text>
          </TouchableOpacity>
        </View>

        {friendsJoined && friendsJoined.count > 0 && (
          <TouchableOpacity
            style={styles.friendsJoinedRow}
            activeOpacity={0.7}
            onPress={onSeeAllFriends}
          >
            <View style={styles.friendsJoinedAvatars}>
              {preview.map((friend, i) => (
                <View key={friend.id} style={[styles.friendsJoinedAvatar, i > 0 && { marginLeft: -8 }]}>
                  <Text style={styles.friendsJoinedAvatarEmoji}>{friend.avatarEmoji}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.friendsJoinedText} numberOfLines={1}>
              {preview.map((f) => f.name.split(' ')[0]).join(', ')}
              {friendsJoined.count > preview.length ? ` +${friendsJoined.count - preview.length} more` : ''}
              {' joined'}
            </Text>
            {friendsJoined.count > FRIENDS_JOINED_PREVIEW_COUNT && (
              <Text style={styles.friendsJoinedSeeAll}>See all</Text>
            )}
          </TouchableOpacity>
        )}

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
      </BorderCard>
    </Animated.View>
  );
}

const RANK_COLORS: Record<number, [string, string]> = {
  1: [COLORS.amberLight, COLORS.golden],
  2: [COLORS.silver, '#A0A0A0'],
  3: [COLORS.bronze, '#A05020'],
};

function RankBadge({ rank }: { rank: number }) {
  return RANK_COLORS[rank] ? (
    <LinearGradient colors={RANK_COLORS[rank]} style={styles.rankBadge}>
      <Text style={styles.rankText}>{rank}</Text>
    </LinearGradient>
  ) : (
    <View style={styles.rankBadgePlainDark}>
      <Text style={styles.rankTextPlainDark}>{rank}</Text>
    </View>
  );
}

function LeaderboardRow({ entry, index, onPress, storyRing }: { entry: LeaderboardEntry; index: number; onPress: () => void; storyRing?: StoryRingStatus | null }) {
  const slideStyle = useSlideUp(Math.min(index, 12) * 60, 20);

  return (
    <Animated.View style={slideStyle}>
      <View style={[styles.leaderRow, entry.isUser && styles.leaderRowUser]}>
        <RankBadge rank={entry.rank} />
        <StoryAvatar
          authorKind="user"
          authorId={entry.id}
          authorName={entry.name}
          authorAvatarEmoji={entry.avatar}
          status={storyRing}
          size={36}
          borderRadius={12}
          onPress={onPress}
        >
          <View style={[styles.leaderAvatar, { backgroundColor: entry.isUser ? COLORS.mintLight : COLORS.sand }]}>
            <Text style={styles.leaderAvatarEmoji}>{entry.avatar}</Text>
          </View>
        </StoryAvatar>
        <TouchableOpacity style={styles.leaderRowRest} activeOpacity={0.85} onPress={onPress}>
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
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

function NgoLeaderboardRow({ entry, onPress, storyRing }: { entry: PublicNgoLeaderboardEntry; onPress: () => void; storyRing?: StoryRingStatus | null }) {
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress}>
      <View style={styles.leaderRow}>
        <RankBadge rank={entry.rank} />
        <StoryRing status={storyRing} size={36} borderRadius={12}>
          <View style={[styles.leaderAvatar, { backgroundColor: COLORS.mintLight }]}>
            <Text style={styles.leaderAvatarEmoji}>🌿</Text>
          </View>
        </StoryRing>
        <View style={{ flex: 1 }}>
          <Text style={styles.leaderNameDark} numberOfLines={1}>{entry.orgName}</Text>
        </View>
        <View style={styles.leaderTreeCount}>
          <Text style={styles.leaderTreeNumDark}>{entry.treesPlanted}</Text>
          <Text style={styles.leaderTreeLabelDark}>trees</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function NurseryLeaderboardRow({ entry, onPress, storyRing }: { entry: PublicNurseryLeaderboardEntry; onPress: () => void; storyRing?: StoryRingStatus | null }) {
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress}>
      <View style={styles.leaderRow}>
        <RankBadge rank={entry.rank} />
        <StoryRing status={storyRing} size={36} borderRadius={12}>
          <View style={[styles.leaderAvatar, { backgroundColor: COLORS.mintLight }]}>
            <Text style={styles.leaderAvatarEmoji}>🌱</Text>
          </View>
        </StoryRing>
        <View style={{ flex: 1 }}>
          <Text style={styles.leaderNameDark} numberOfLines={1}>{entry.nurseryName}</Text>
        </View>
        <View style={styles.leaderTreeCount}>
          <Text style={styles.leaderTreeNumDark}>{entry.followers}</Text>
          <Text style={styles.leaderTreeLabelDark}>followers</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

/** Windowed page-number list: 1 … p-1 p p+1 … last, capped so it never overflows on narrow screens. */
function pagerWindow(page: number, totalPages: number): (number | '…')[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const pages = new Set([1, totalPages, page, page - 1, page + 1].filter((p) => p >= 1 && p <= totalPages));
  const sorted = [...pages].sort((a, b) => a - b);
  const out: (number | '…')[] = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) out.push('…');
    out.push(sorted[i]);
  }
  return out;
}

function Pager({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (p: number) => void }) {
  if (totalPages <= 1) return null;
  return (
    <View style={styles.pagerRow}>
      <TouchableOpacity disabled={page <= 1} onPress={() => onChange(page - 1)} style={styles.pagerArrow}>
        <Text style={[styles.pagerArrowText, page <= 1 && styles.pagerDisabled]}>‹</Text>
      </TouchableOpacity>
      {pagerWindow(page, totalPages).map((p, i) =>
        p === '…' ? (
          <Text key={`ellipsis-${i}`} style={styles.pagerEllipsis}>…</Text>
        ) : (
          <TouchableOpacity key={p} onPress={() => onChange(p)} style={[styles.pagerBtn, p === page && styles.pagerBtnActive]}>
            <Text style={[styles.pagerBtnText, p === page && styles.pagerBtnTextActive]}>{p}</Text>
          </TouchableOpacity>
        ),
      )}
      <TouchableOpacity disabled={page >= totalPages} onPress={() => onChange(page + 1)} style={styles.pagerArrow}>
        <Text style={[styles.pagerArrowText, page >= totalPages && styles.pagerDisabled]}>›</Text>
      </TouchableOpacity>
    </View>
  );
}

type RankTab = 'users' | 'ngos' | 'nurseries';
const RANK_TAB_LABELS: Record<RankTab, string> = { users: '🧑 Users', ngos: '🏢 NGOs', nurseries: '🌱 Nurseries' };

/**
 * The Ranks tab. Rendered as its own screen (like the Feed tab's embedded `FollowingFeedScreen`)
 * rather than inside the shared multi-tab ScrollView, since it needs its own scroll region below
 * a fixed sub-tab bar.
 */
function LeaderboardTabContent({ navigation }: { navigation: any }) {
  const bottomNavClearance = useBottomNavClearance();
  const [rankTab, setRankTab] = useState<RankTab>('users');
  const [userPage, setUserPage] = useState(1);
  const [ngoPage, setNgoPage] = useState(1);
  const [nurseryPage, setNurseryPage] = useState(1);

  const userBoard = useUserLeaderboardPage('global', userPage);
  const ngoBoard = usePublicNgoLeaderboardPage(ngoPage);
  const nurseryBoard = usePublicNurseryLeaderboardPage(nurseryPage);

  const userRingStatus = useRingStatus({ userIds: rankTab === 'users' ? (userBoard.data?.entries.map((e) => e.id) ?? []) : [] });
  const ngoRingStatus = useRingStatus({ ngoIds: rankTab === 'ngos' ? (ngoBoard.data?.entries.map((e) => e.id) ?? []) : [] });
  const nurseryRingStatus = useRingStatus({ nurseryIds: rankTab === 'nurseries' ? (nurseryBoard.data?.entries.map((e) => e.id) ?? []) : [] });

  const openUser = (entry: LeaderboardEntry) =>
    navigation.navigate(entry.isUser ? 'Profile' : 'UserPublicProfile', entry.isUser ? undefined : { userId: entry.id });

  const userTotalPages = Math.max(1, Math.ceil((userBoard.data?.totalUsers ?? 0) / LEADERBOARD_PAGE_SIZE));
  const ngoTotalPages = Math.max(1, Math.ceil((ngoBoard.data?.total ?? 0) / LEADERBOARD_PAGE_SIZE));
  const nurseryTotalPages = Math.max(1, Math.ceil((nurseryBoard.data?.total ?? 0) / LEADERBOARD_PAGE_SIZE));

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.rankTabBar}>
        {(Object.keys(RANK_TAB_LABELS) as RankTab[]).map((t) => (
          <TouchableOpacity key={t} style={[styles.rankTab, rankTab === t && styles.rankTabActive]} onPress={() => setRankTab(t)}>
            <Text style={[styles.rankTabText, rankTab === t && styles.rankTabTextActive]} numberOfLines={1}>
              {RANK_TAB_LABELS[t]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {rankTab === 'users' && (
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomNavClearance }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.section}>
            <BorderCard style={[styles.yourRankCard, styles.noBorder]}>
              <Text style={styles.yourRankLabelDark}>YOUR RANK</Text>
              <View style={styles.yourRankRow}>
                <Text style={styles.yourRankNumDark}>{userBoard.data?.myRank ? `#${userBoard.data.myRank}` : '–'}</Text>
                <Text style={styles.yourRankOfDark}>of {(userBoard.data?.totalUsers ?? 0).toLocaleString()}</Text>
              </View>
            </BorderCard>
            <Text style={styles.sectionTitleDark}>Top Planters</Text>
          </View>

          {userBoard.isLoading ? null : (userBoard.data?.entries ?? []).length === 0 ? (
            <EmptyState icon="🏆" title="The leaderboard is still filling in" body="Plant a tree to claim your spot." tint="light" />
          ) : (
            <BorderCard noPadding style={styles.groupedList}>
              {(userBoard.data?.entries ?? []).map((entry, index) => (
                <React.Fragment key={entry.id}>
                  {index > 0 && <View style={styles.rowDivider} />}
                  <LeaderboardRow entry={entry} index={index} onPress={() => openUser(entry)} storyRing={userRingStatus.data?.users[entry.id]} />
                </React.Fragment>
              ))}
            </BorderCard>
          )}

          <Pager page={userPage} totalPages={userTotalPages} onChange={setUserPage} />
        </ScrollView>
      )}

      {rankTab === 'ngos' && (
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomNavClearance }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.section}>
            <Text style={styles.sectionTitleDark}>🏢 NGO Rankings</Text>
          </View>

          {ngoBoard.isLoading ? null : (ngoBoard.data?.entries ?? []).length === 0 ? (
            <EmptyState icon="🏢" title="No NGOs ranked yet" body="Check back once drives start logging trees." tint="light" />
          ) : (
            <BorderCard noPadding style={styles.groupedList}>
              {(ngoBoard.data?.entries ?? []).map((entry, index) => (
                <React.Fragment key={entry.id}>
                  {index > 0 && <View style={styles.rowDivider} />}
                  <NgoLeaderboardRow
                    entry={entry}
                    onPress={() => navigation.navigate('NgoPublicProfile', { ngoId: entry.id })}
                    storyRing={ngoRingStatus.data?.ngos[entry.id]}
                  />
                </React.Fragment>
              ))}
            </BorderCard>
          )}

          <Pager page={ngoPage} totalPages={ngoTotalPages} onChange={setNgoPage} />
        </ScrollView>
      )}

      {rankTab === 'nurseries' && (
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomNavClearance }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.section}>
            <Text style={styles.sectionTitleDark}>🌱 Nursery Rankings</Text>
          </View>

          {nurseryBoard.isLoading ? null : (nurseryBoard.data?.entries ?? []).length === 0 ? (
            <EmptyState icon="🌱" title="No nurseries ranked yet" body="Follow a nursery to help it climb the ranks." tint="light" />
          ) : (
            <BorderCard noPadding style={styles.groupedList}>
              {(nurseryBoard.data?.entries ?? []).map((entry, index) => (
                <React.Fragment key={entry.id}>
                  {index > 0 && <View style={styles.rowDivider} />}
                  <NurseryLeaderboardRow
                    entry={entry}
                    onPress={() => navigation.navigate('NurseryPublicProfile', { nurseryId: entry.id })}
                    storyRing={nurseryRingStatus.data?.nurseries[entry.id]}
                  />
                </React.Fragment>
              ))}
            </BorderCard>
          )}

          <Pager page={nurseryPage} totalPages={nurseryTotalPages} onChange={setNurseryPage} />
        </ScrollView>
      )}
    </View>
  );
}

export function CommunityScreen({ navigation }: any) {
  const [activeTab, setActiveTab] = useState<Tab>('feed');
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [joinedIds, setJoinedIds] = useState<Set<string>>(new Set());
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const { playSound } = useSoundSystem();
  // The "Friends who joined" sheet uses the default (auto) Sheet surface, which flips to dark
  // chrome at night — its own text colors need to follow, same as ReportSheet does.
  const { period } = useTimeTheme();
  const isNightMode = isNightlikePeriod(period);
  const insets = useSafeAreaInsets();
  const bottomNavClearance = useBottomNavClearance();

  const celebrateFriendAccepted = (name: string) => {
    setToastMessage(`Hey, you are now friends with ${name}!`);
    playSound('friendAccepted');
  };

  const { data: friends = [] } = useFriends();
  const { data: friendRequests = [] } = useFriendRequests();
  const friendsRingStatus = useRingStatus({
    userIds: activeTab === 'friends' ? [...friends.map((f) => f.id), ...friendRequests.map((r) => r.from.id)] : [],
  });
  const { data: challenges = [] } = useChallenges();
  const joinChallengeMutation = useJoinChallenge();
  const leaveChallengeMutation = useLeaveChallenge();
  const challengeFriendsJoined = useChallengeFriendsJoined(challenges.map((c) => c.id));
  const [friendsSheetChallengeId, setFriendsSheetChallengeId] = useState<string | null>(null);
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
      <BorderCard noPadding borderRadius={RADIUS.xl} style={[styles.tabBarDark, styles.noBorder]}>
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
      </BorderCard>

      {activeTab === 'feed' ? (
        <FollowingFeedScreen navigation={navigation} embedded />
      ) : activeTab === 'leaderboard' ? (
        <LeaderboardTabContent navigation={navigation} />
      ) : (
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomNavClearance }]}
        showsVerticalScrollIndicator={false}
      >
        <GlobalCounter />

        {showAddFriend && <AddFriendPanel onClose={() => setShowAddFriend(false)} navigation={navigation} />}

        {activeTab === 'friends' && (
          <View style={styles.section}>
            {friendRequests.length > 0 && (
              <>
                <Text style={styles.sectionTitleDark}>Friend Requests</Text>
                <BorderCard noPadding style={styles.groupedList}>
                  {friendRequests.slice(0, 3).map((request, i) => (
                    <React.Fragment key={request.id}>
                      {i > 0 && <View style={styles.rowDivider} />}
                      <FriendRequestRow
                        request={request}
                        onPress={() =>
                          navigation.navigate('UserPublicProfile', {
                            userId: request.from.id,
                            friendRequestId: request.id,
                            friendRequestFromName: request.from.name,
                          })
                        }
                        onAccepted={celebrateFriendAccepted}
                        storyRing={friendsRingStatus.data?.users[request.from.id]}
                      />
                    </React.Fragment>
                  ))}
                </BorderCard>
                {friendRequests.length > 3 && (
                  <TouchableOpacity style={styles.seeAllButton} onPress={() => navigation.navigate('FriendsList', { mode: 'requests' })}>
                    <Text style={styles.seeAllText}>See all ({friendRequests.length})</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionTitleDark}>Your Squad</Text>
              <TouchableOpacity
                style={styles.squadSearchButton}
                onPress={() => setShowAddFriend((prev) => !prev)}
                accessibilityRole="button"
                accessibilityLabel="Search for friends"
              >
                <Text style={styles.squadSearchIcon}>🔍</Text>
                <Text style={styles.squadSearchText}>Search</Text>
              </TouchableOpacity>
            </View>
            {friends.length === 0 ? (
              <EmptyState
                icon="🌲"
                title="Your forest is better with friends"
                body="Tap Search above to find people and grow together."
                tint="light"
              />
            ) : (
              <>
                <BorderCard noPadding style={styles.groupedList}>
                  {friends.slice(0, 3).map((friend, i) => (
                    <React.Fragment key={friend.id}>
                      {i > 0 && <View style={styles.rowDivider} />}
                      <FriendCard
                        friend={friend}
                        index={i}
                        onPress={() => navigation.navigate('UserPublicProfile', { userId: friend.id })}
                        storyRing={friendsRingStatus.data?.users[friend.id]}
                      />
                    </React.Fragment>
                  ))}
                </BorderCard>
                {friends.length > 3 && (
                  <TouchableOpacity style={styles.seeAllButton} onPress={() => navigation.navigate('FriendsList', { mode: 'squad' })}>
                    <Text style={styles.seeAllText}>See all ({friends.length})</Text>
                  </TouchableOpacity>
                )}
              </>
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
              <BorderCard noPadding style={styles.groupedList}>
                {feed.map((activity, i) => (
                  <React.Fragment key={activity.id}>
                    {i > 0 && <View style={styles.rowDivider} />}
                    <ActivityFeedItem activity={activity} index={i} />
                  </React.Fragment>
                ))}
              </BorderCard>
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
                    if (joinedIds.has(challenge.id)) {
                      leaveChallengeMutation.mutate(challenge.id);
                      setJoinedIds(prev => { const next = new Set(prev); next.delete(challenge.id); return next; });
                    } else {
                      joinChallengeMutation.mutate(challenge.id);
                      setJoinedIds(prev => new Set(prev).add(challenge.id));
                    }
                  }}
                  friendsJoined={challengeFriendsJoined.data?.[challenge.id]}
                  onSeeAllFriends={() => setFriendsSheetChallengeId(challenge.id)}
                />
              ))
            )}
          </View>
        )}

      </ScrollView>
      )}

      <Toast visible={!!toastMessage} message={toastMessage ?? ''} icon="🌱" onHide={() => setToastMessage(null)} />

      <Sheet
        visible={friendsSheetChallengeId !== null}
        onClose={() => setFriendsSheetChallengeId(null)}
        title="Friends who joined"
        scrollable
      >
        {(challengeFriendsJoined.data?.[friendsSheetChallengeId ?? '']?.friends ?? []).map((friend) => (
          <TouchableOpacity
            key={friend.id}
            style={styles.friendsSheetRow}
            activeOpacity={0.7}
            onPress={() => {
              setFriendsSheetChallengeId(null);
              navigation.navigate('UserPublicProfile', { userId: friend.id });
            }}
          >
            <View style={styles.friendsSheetAvatar}>
              <Text style={styles.friendsSheetAvatarEmoji}>{friend.avatarEmoji}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.friendsSheetName, isNightMode && styles.friendsSheetNameNight]}>{friend.name}</Text>
              <Text style={[styles.friendsSheetHandle, isNightMode && styles.friendsSheetHandleNight]}>@{friend.handle}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  noBorder: {
    borderWidth: 0,
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
    color: COLORS.textPrimary,
    marginBottom: 4,
    marginTop: 4,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  squadSearchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.sage,
    backgroundColor: 'rgba(45,90,39,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  squadSearchIcon: {
    fontSize: 13,
  },
  squadSearchText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.forest,
  },
  friendNameDark: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  friendActiveDark: {
    fontSize: 11,
    color: COLORS.textMuted,
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
    color: COLORS.textPrimary,
  },
  challengeDescDark: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
    lineHeight: 18,
  },
  friendsSheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  friendsSheetAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.mintLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  friendsSheetAvatarEmoji: {
    fontSize: 22,
  },
  friendsSheetName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  friendsSheetHandle: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  friendsSheetNameNight: { color: ON_DARK_SURFACE.primary },
  friendsSheetHandleNight: { color: ON_DARK_SURFACE.secondary },
  friendsJoinedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  friendsJoinedAvatars: {
    flexDirection: 'row',
  },
  friendsJoinedAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.mintLight,
    borderWidth: 1.5,
    borderColor: COLORS.cream,
    alignItems: 'center',
    justifyContent: 'center',
  },
  friendsJoinedAvatarEmoji: {
    fontSize: 11,
  },
  friendsJoinedText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  friendsJoinedSeeAll: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.sageLight,
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
    color: COLORS.textSecondary,
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
    color: COLORS.xpBlueDark,
  },
  rankTabBar: {
    flexDirection: 'row',
    marginHorizontal: SPACING.md,
    marginTop: 4,
    marginBottom: 4,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.earth,
    overflow: 'hidden',
  },
  rankTab: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  rankTabActive: { backgroundColor: COLORS.forest },
  rankTabText: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
  rankTabTextActive: { color: COLORS.white },
  pagerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: SPACING.md,
    marginBottom: SPACING.lg,
  },
  pagerArrow: { paddingHorizontal: 10, paddingVertical: 6 },
  pagerArrowText: { fontSize: 20, fontWeight: '700', color: COLORS.forest },
  pagerDisabled: { color: COLORS.textLight },
  pagerBtn: {
    minWidth: 32,
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  pagerBtnActive: { borderColor: COLORS.forest, backgroundColor: COLORS.forest },
  pagerBtnText: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary },
  pagerBtnTextActive: { color: COLORS.white },
  pagerEllipsis: { fontSize: 13, color: COLORS.textMuted, marginHorizontal: 2 },
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
    color: COLORS.textPrimary,
    letterSpacing: -1,
  },
  yourRankOfDark: {
    fontSize: 14,
    color: COLORS.textSecondary,
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
  },
  leaderRowRest: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  groupedList: {
    marginBottom: 4,
  },
  rowDivider: {
    height: 1,
    backgroundColor: 'rgba(160,114,74,0.25)',
    marginHorizontal: 14,
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
  seeAllButton: {
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginTop: 4,
    marginBottom: 8,
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.sageLight,
  },
  addFriendPanel: {
    gap: 8,
  },
  addFriendSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    borderRadius: RADIUS.full,
    borderWidth: 1.5,
    borderColor: COLORS.warmBrown,
    paddingLeft: 16,
    paddingRight: 12,
    paddingVertical: 4,
  },
  addFriendInputDark: {
    flex: 1,
    backgroundColor: 'transparent',
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  addFriendCloseDark: {
    fontSize: 16,
    color: COLORS.textSecondary,
    fontWeight: '600',
    paddingHorizontal: 4,
  },
  searchEmptyDark: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 8,
    marginBottom: 4,
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
    color: COLORS.textPrimary,
  },
  activityTimeDark: {
    fontSize: 11,
    color: COLORS.textMuted,
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
