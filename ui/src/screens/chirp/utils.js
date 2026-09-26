export const MOCK_FEED = [
  {
    id: '1',
    author: 'John Doe',
    username: '@johndoe',
    content: 'Just got my new car! Loving the city vibes 🚗',
    timestamp: '2h ago',
    likes: 24,
    comments: 5,
    reposts: 2,
    isLiked: false,
    isFollowing: true,
  },
  {
    id: '2',
    author: 'Jane Smith',
    username: '@janesmith',
    content: 'Anyone know a good mechanic in the area?',
    timestamp: '4h ago',
    likes: 12,
    comments: 8,
    reposts: 1,
    isLiked: true,
    isFollowing: false,
  },
  {
    id: '3',
    author: 'Mike Johnson',
    username: '@mikej',
    content: 'Best sunset view from the pier tonight! 🌅',
    timestamp: '6h ago',
    likes: 45,
    comments: 12,
    reposts: 5,
    isLiked: false,
    isFollowing: true,
  },
]

export const MOCK_SEARCH_USERS = [
  {
    author: 'John Doe',
    username: '@johndoe',
    bio: 'Car enthusiast | City explorer',
    followers: 1234,
    following: 345,
    posts: 42,
    isFollowing: true,
  },
  {
    author: 'Jane Smith',
    username: '@janesmith',
    bio: 'Mechanic | Helping people fix their rides',
    followers: 856,
    following: 123,
    posts: 67,
    isFollowing: false,
  },
  {
    author: 'Mike Johnson',
    username: '@mikej',
    bio: 'Photography | Sunset lover 🌅',
    followers: 2341,
    following: 567,
    posts: 128,
    isFollowing: true,
  },
  {
    author: 'Sarah Williams',
    username: '@sarahw',
    bio: 'Food blogger | Always hungry',
    followers: 3456,
    following: 234,
    posts: 234,
    isFollowing: false,
  },
  {
    author: 'Tom Brown',
    username: '@tombrown',
    bio: "Fitness coach | Let's get fit!",
    followers: 1890,
    following: 456,
    posts: 89,
    isFollowing: false,
  },
]

export function formatUsername(username) {
  if (!username) return '@unknown'
  return username.startsWith('@') ? username : `@${username}`
}

export function formatCount(n) {
  const num = Number(n) || 0
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
  if (num >= 1_000) return `${(num / 1_000).toFixed(1).replace(/\.0$/, '')}K`
  return String(num)
}

export function normalizeQuotedPost(post) {
  if (!post) return null
  return {
    id: String(post.id),
    author: post.author || post.displayName || 'Unknown',
    username: formatUsername(post.username),
    content: post.content,
    timestamp: post.timestamp || post.timeAgo || 'now',
  }
}

export function normalizePost(post) {
  return {
    id: String(post.id),
    author: post.author || post.displayName || 'Unknown',
    username: formatUsername(post.username),
    content: post.content,
    timestamp: post.timestamp || post.timeAgo || 'now',
    likes: post.likes ?? 0,
    comments: post.comments ?? post.replies ?? 0,
    reposts: post.reposts ?? 0,
    isReposted: post.isReposted ?? post.reposted ?? false,
    isLiked: post.isLiked ?? post.liked ?? false,
    isFollowing: post.isFollowing ?? false,
    imageUrl: post.imageUrl || post.image_url || '',
    avatarUrl: post.avatarUrl || post.avatar_url || '',
    verified: post.verified === true || post.verified === 1,
    quotePost: normalizeQuotedPost(post.quotePost),
  }
}

export function normalizeUser(user) {
  if (!user) return null
  const username = formatUsername(user.username)
  return {
    name: user.name || user.displayName || 'You',
    username,
    bio: user.bio || '',
    avatarUrl: user.avatarUrl || user.avatar_url || '',
    bannerUrl: user.bannerUrl || user.banner_url || '',
    verified: user.verified === true || user.verified === 1,
  }
}

export function normalizeComment(comment) {
  return {
    id: String(comment.id),
    author: comment.author || comment.displayName || 'Unknown',
    username: formatUsername(comment.username),
    content: comment.content,
    timestamp: comment.timestamp || comment.timeAgo || 'now',
    imageUrl: comment.imageUrl || comment.image_url || '',
    verified: comment.verified === true || comment.verified === 1,
  }
}

export function filterSearchUsers(query) {
  const q = query.toLowerCase()
  return MOCK_SEARCH_USERS.filter(
    (user) =>
      user.author.toLowerCase().includes(q) || user.username.toLowerCase().includes(q)
  )
}

export function findProfileMeta(username, posts, searchResults) {
  const fromPost = posts.find((post) => post.username === username)
  const fromSearch = searchResults.find((row) => row.username === username)
  const fromMock = MOCK_SEARCH_USERS.find((row) => row.username === username)
  const source = fromSearch || fromMock
  return {
    name: fromPost?.author || source?.author || 'User',
    username,
    bio: source?.bio || fromPost?.bio || '',
    avatarUrl: fromPost?.avatarUrl || source?.avatarUrl || '',
    bannerUrl: fromPost?.bannerUrl || source?.bannerUrl || '',
    verified: fromPost?.verified || source?.verified || false,
    followers: source?.followers ?? 0,
    following: source?.following ?? 0,
    posts: source?.posts ?? posts.filter((p) => p.username === username).length,
    isFollowing: fromPost?.isFollowing ?? source?.isFollowing ?? false,
  }
}
