import { useCallback, useEffect, useRef, useState } from 'react'
import { Heart, MessageCircle, Repeat2, Share, User } from 'lucide-react'
import { usePhone } from '../../context/PhoneContext'
import { fetchNui } from '../../hooks/useNui'
import ChirpAuth from './components/ChirpAuth'
import ChirpBottomNav, { ChirpScreenHeader } from './components/ChirpShell'
import ChirpCompose from './components/ChirpCompose'
import ChirpEditProfile from './components/ChirpEditProfile'
import ChirpPostDetail from './components/ChirpPostDetail'
import ChirpMediaPicker from './components/ChirpMediaPicker'
import ChirpPostImage from './components/ChirpPostImage'
import ChirpProfile from './components/ChirpProfile'
import ChirpQuoteCompose from './components/ChirpQuoteCompose'
import ChirpQuotedPost from './components/ChirpQuotedPost'
import ChirpRepostMenu from './components/ChirpRepostMenu'
import ChirpSearch from './components/ChirpSearch'
import ChirpVerifiedBadge from './components/ChirpVerifiedBadge'
import {
  MOCK_FEED,
  filterSearchUsers,
  findProfileMeta,
  normalizeComment,
  normalizePost,
  normalizeQuotedPost,
  normalizeUser,
} from './utils'
import { SOCIAL_APP_NAME } from '../../config/socialAppBranding'
import './chirp.css'

export default function ChirpApp() {
  const { goHome, notify, pendingChirpImage, setPendingChirpImage } = usePhone()

  const [authView, setAuthView] = useState('login')
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [user, setUser] = useState(null)
  const [view, setView] = useState('login')
  const [posts, setPosts] = useState([])
  const [selectedPost, setSelectedPost] = useState(null)
  const [profileUsername, setProfileUsername] = useState(null)
  const [postText, setPostText] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [loading, setLoading] = useState(true)
  const [editName, setEditName] = useState('')
  const [editBio, setEditBio] = useState('')
  const [loginUsername, setLoginUsername] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [signupName, setSignupName] = useState('')
  const [signupUsername, setSignupUsername] = useState('')
  const [signupPassword, setSignupPassword] = useState('')
  const [signupConfirm, setSignupConfirm] = useState('')
  const [comments, setComments] = useState([])
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [repostMenuPost, setRepostMenuPost] = useState(null)
  const [quoteTarget, setQuoteTarget] = useState(null)
  const [quoteText, setQuoteText] = useState('')
  const [postImage, setPostImage] = useState('')
  const [quoteImage, setQuoteImage] = useState('')
  const [replyImage, setReplyImage] = useState('')
  const [editAvatarUrl, setEditAvatarUrl] = useState('')
  const [editBannerUrl, setEditBannerUrl] = useState('')
  const [mediaPickerTarget, setMediaPickerTarget] = useState(null)
  const [verificationPrice, setVerificationPrice] = useState(25000)
  const [buyingVerification, setBuyingVerification] = useState(false)
  const replyInputRef = useRef(null)

  const showBottomNav = isLoggedIn && ['feed', 'search', 'profile'].includes(view)
  const navActive =
    view === 'feed' ? 'home' : view === 'search' ? 'search' : view === 'profile' ? 'profile' : 'home'

  const loadFeed = useCallback(async () => {
    setLoading(true)
    const data = await fetchNui('chirpGetFeed')
    const feed = (Array.isArray(data) ? data : MOCK_FEED).map(normalizePost)
    setPosts(feed)
    setLoading(false)
  }, [])

  const checkAuth = useCallback(async () => {
    setLoading(true)
    const account = await fetchNui('chirpGetAccount')
    if (account?.username) {
      const normalized = normalizeUser(account)
      setUser(normalized)
      setIsLoggedIn(true)
      setView('feed')
      await loadFeed()
    } else {
      setIsLoggedIn(false)
      setUser(null)
      setView('login')
      setLoading(false)
    }
  }, [loadFeed])

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  useEffect(() => {
    if (!isLoggedIn) return
    fetchNui('chirpGetConfig').then((cfg) => {
      if (cfg?.verificationPrice) setVerificationPrice(cfg.verificationPrice)
    })
  }, [isLoggedIn])

  useEffect(() => {
    if (!pendingChirpImage || !isLoggedIn) return
    setPostImage(pendingChirpImage)
    setView('compose')
    setPendingChirpImage(null)
  }, [pendingChirpImage, isLoggedIn, setPendingChirpImage])

  const handleMediaSelect = (url) => {
    switch (mediaPickerTarget) {
      case 'avatar':
        setEditAvatarUrl(url)
        break
      case 'banner':
        setEditBannerUrl(url)
        break
      case 'post':
        setPostImage(url)
        break
      case 'quote':
        setQuoteImage(url)
        break
      case 'reply':
        setReplyImage(url)
        break
      default:
        break
    }
    setMediaPickerTarget(null)
  }

  const openMediaPicker = (target) => setMediaPickerTarget(target)

  const handleLogin = async () => {
    if (!loginUsername.trim() || !loginPassword.trim()) {
      notify('Login Error', 'Please fill in all fields', 'message')
      return
    }
    const result = await fetchNui('chirpLogin', {
      username: loginUsername.trim(),
      password: loginPassword,
    })
    if (result?.success || result?.ok) {
      const nextUser = normalizeUser(
        result.user || { name: 'You', username: loginUsername.trim(), bio: '' }
      )
      setUser(nextUser)
      setIsLoggedIn(true)
      setView('feed')
      await loadFeed()
      notify(`Welcome to ${SOCIAL_APP_NAME}`, `Logged in as ${nextUser.name}`, 'message')
    } else {
      notify('Login Failed', result?.error || 'Invalid username or password', 'message')
    }
  }

  const handleSignup = async () => {
    if (!signupName.trim() || !signupUsername.trim() || !signupPassword.trim()) {
      notify('Signup Error', 'Please fill in all fields', 'message')
      return
    }
    if (signupPassword !== signupConfirm) {
      notify('Signup Error', 'Passwords do not match', 'message')
      return
    }
    if (signupPassword.length < 6) {
      notify('Signup Error', 'Password must be at least 6 characters', 'message')
      return
    }
    const result = await fetchNui('chirpRegister', {
      displayName: signupName.trim(),
      username: signupUsername.trim(),
      password: signupPassword,
    })
    if (result?.success || result?.ok) {
      const nextUser = normalizeUser({
        name: signupName.trim(),
        username: signupUsername.trim(),
        bio: '',
      })
      setUser(nextUser)
      setIsLoggedIn(true)
      setView('feed')
      await loadFeed()
      notify(`Welcome to ${SOCIAL_APP_NAME}`, `Account created for ${signupName.trim()}`, 'message')
    } else {
      notify(
        'Signup Failed',
        result?.error === 'username_taken' ? 'Username already taken' : result?.error || 'Username already taken',
        'message'
      )
    }
  }

  const handleLogout = async () => {
    await fetchNui('chirpLogout')
    setIsLoggedIn(false)
    setUser(null)
    setPosts([])
    setView('login')
    setAuthView('login')
    notify(SOCIAL_APP_NAME, 'Logged out successfully', 'message')
  }

  const likePost = async (postId) => {
    setPosts((current) =>
      current.map((post) =>
        post.id === postId
          ? {
              ...post,
              isLiked: !post.isLiked,
              likes: post.isLiked ? post.likes - 1 : post.likes + 1,
            }
          : post
      )
    )
    if (selectedPost?.id === postId) {
      setSelectedPost((post) =>
        post
          ? {
              ...post,
              isLiked: !post.isLiked,
              likes: post.isLiked ? post.likes - 1 : post.likes + 1,
            }
          : post
      )
    }
    await fetchNui('chirpLike', { postId })
  }

  const applyRepostState = (postId, nextReposted) => {
    const id = String(postId)
    const update = (post) => {
      if (String(post.id) !== id) return post
      const delta = nextReposted && !post.isReposted ? 1 : !nextReposted && post.isReposted ? -1 : 0
      return {
        ...post,
        isReposted: nextReposted,
        reposts: Math.max(0, post.reposts + delta),
      }
    }
    setPosts((current) => current.map(update))
    setSelectedPost((post) => (post && String(post.id) === id ? update(post) : post))
    setRepostMenuPost((post) => (post && String(post.id) === id ? update(post) : post))
  }

  const simpleRepost = async (postId) => {
    const id = String(postId)
    const post =
      posts.find((item) => String(item.id) === id) ||
      (selectedPost && String(selectedPost.id) === id ? selectedPost : null) ||
      repostMenuPost
    if (!post || post.isReposted) return
    applyRepostState(postId, true)
    await fetchNui('chirpRepost', { postId })
    notify(SOCIAL_APP_NAME, 'Reposted to your timeline', 'message')
  }

  const undoRepost = async (postId) => {
    const id = String(postId)
    const post =
      posts.find((item) => String(item.id) === id) ||
      (selectedPost && String(selectedPost.id) === id ? selectedPost : null) ||
      repostMenuPost
    if (!post || !post.isReposted) return
    applyRepostState(postId, false)
    await fetchNui('chirpRepost', { postId })
    notify(SOCIAL_APP_NAME, 'Removed repost', 'message')
  }

  const openRepostMenu = (post) => {
    const id = String(post.id)
    const current =
      posts.find((item) => String(item.id) === id) ||
      (selectedPost && String(selectedPost.id) === id ? selectedPost : post)
    setRepostMenuPost(current)
  }

  const openQuote = (post) => {
    const id = String(post.id)
    const current =
      posts.find((item) => String(item.id) === id) ||
      (selectedPost && String(selectedPost.id) === id ? selectedPost : post)
    setQuoteTarget(current)
    setQuoteText('')
    setQuoteImage('')
    setRepostMenuPost(null)
    setView('quote')
  }

  const submitQuotePost = async () => {
    if (!quoteTarget) return
    if (!quoteText.trim() && !quoteImage) return
    const result = await fetchNui('chirpPost', {
      content: quoteText.trim(),
      quotePostId: quoteTarget.id,
      imageUrl: quoteImage || undefined,
    })
    if (result?.ok) {
      if (!quoteTarget.isReposted) {
        applyRepostState(quoteTarget.id, true)
      }
      const newPost = normalizePost({
        id: result.id || Date.now().toString(),
        author: user?.name || 'You',
        username: user?.username || '@you',
        content: quoteText.trim(),
        timestamp: 'now',
        likes: 0,
        comments: 0,
        reposts: 0,
        isLiked: false,
        isReposted: false,
        isFollowing: false,
        imageUrl: quoteImage,
        avatarUrl: user?.avatarUrl || '',
        verified: user?.verified || false,
        quotePost: normalizeQuotedPost(quoteTarget),
      })
      setPosts((current) => [newPost, ...current])
      setQuoteTarget(null)
      setQuoteText('')
      setQuoteImage('')
      setView('feed')
      notify(SOCIAL_APP_NAME, 'Quote posted', 'message')
    } else {
      notify('Post Failed', result?.error || 'Could not post quote', 'message')
    }
  }

  const bumpCommentCount = (postId) => {
    const id = String(postId)
    const bump = (post) =>
      String(post.id) === id ? { ...post, comments: (post.comments ?? 0) + 1 } : post
    setPosts((current) => current.map(bump))
    setSelectedPost((post) => (post && String(post.id) === id ? bump(post) : post))
  }

  const loadComments = useCallback(async (postId) => {
    setCommentsLoading(true)
    const data = await fetchNui('chirpGetComments', { postId })
    setComments((Array.isArray(data) ? data : []).map(normalizeComment))
    setCommentsLoading(false)
  }, [])

  const openPost = useCallback(
    async (post, { focusReply = false } = {}) => {
      setSelectedPost(post)
      setView('post')
      setReplyText('')
      setReplyImage('')
      await loadComments(post.id)
      if (focusReply) {
        setTimeout(() => replyInputRef.current?.focus(), 100)
      }
    },
    [loadComments]
  )

  const openReply = (post) => openPost(post, { focusReply: true })

  const submitReply = async () => {
    if ((!replyText.trim() && !replyImage) || !selectedPost) return
    const result = await fetchNui('chirpReply', {
      postId: selectedPost.id,
      content: replyText.trim(),
      imageUrl: replyImage || undefined,
    })
    if (result?.success || result?.ok) {
      const newComment = normalizeComment(
        result.comment || {
          id: result.id || Date.now().toString(),
          author: user?.name || 'You',
          username: user?.username || '@you',
          content: replyText.trim(),
          timestamp: 'now',
          imageUrl: replyImage,
          verified: user?.verified || false,
        }
      )
      setComments((current) => [...current, newComment])
      bumpCommentCount(selectedPost.id)
      setReplyText('')
      setReplyImage('')
    } else {
      notify('Reply Failed', result?.error || 'Could not post reply', 'message')
    }
  }

  const followUser = async (username) => {
    setPosts((current) =>
      current.map((post) =>
        post.username === username ? { ...post, isFollowing: !post.isFollowing } : post
      )
    )
    setSearchResults((current) =>
      current.map((result) =>
        result.username === username ? { ...result, isFollowing: !result.isFollowing } : result
      )
    )
    await fetchNui('chirpFollowUser', { username })
  }

  const createPost = async () => {
    if (!postText.trim() && !postImage) return
    const newPost = normalizePost({
      id: Date.now().toString(),
      author: user?.name || 'You',
      username: user?.username || '@you',
      content: postText.trim(),
      timestamp: 'now',
      likes: 0,
      comments: 0,
      reposts: 0,
      isLiked: false,
      isFollowing: false,
      imageUrl: postImage,
      avatarUrl: user?.avatarUrl || '',
      verified: user?.verified || false,
    })
    await fetchNui('chirpPost', { content: postText.trim(), imageUrl: postImage || undefined })
    setPosts((current) => [newPost, ...current])
    setPostText('')
    setPostImage('')
    setView('feed')
  }

  const openProfile = (username, { fromNav = false } = {}) => {
    setProfileUsername(username)
    if (user && username === user.username && !fromNav) {
      setView('profile')
      return
    }
    if (user && username === user.username && fromNav) {
      setView('profile')
      return
    }
    setView('profile')
  }

  const openOwnProfile = () => {
    if (user?.username) openProfile(user.username, { fromNav: true })
  }

  const saveProfile = async () => {
    if (!editName.trim()) {
      notify('Profile Error', 'Name cannot be empty', 'message')
      return
    }
    const username = user?.username?.replace(/^@/, '') || ''
    const result = await fetchNui('chirpUpdateProfile', {
      displayName: editName.trim(),
      username,
      bio: editBio,
      avatarUrl: editAvatarUrl,
      bannerUrl: editBannerUrl,
    })
    if (result?.success || result?.ok) {
      const updated = normalizeUser({
        name: editName.trim(),
        username,
        bio: editBio,
        avatarUrl: editAvatarUrl,
        bannerUrl: editBannerUrl,
        verified: user?.verified || false,
        ...(result.user || {}),
      })
      setUser(updated)
      setView('profile')
      notify('Profile Updated', 'Your profile has been updated', 'message')
    } else {
      notify('Update Failed', result?.error || 'Failed to update profile', 'message')
    }
  }

  const buyVerification = async () => {
    if (user?.verified || buyingVerification) return
    setBuyingVerification(true)
    const result = await fetchNui('chirpBuyVerification')
    setBuyingVerification(false)
    if (result?.ok || result?.success) {
      setUser((current) => (current ? { ...current, verified: true } : current))
      notify(SOCIAL_APP_NAME, 'Verification badge purchased!', 'message')
    } else if (result?.error === 'insufficient_funds') {
      notify('Purchase Failed', `You need $${Number(result.price || verificationPrice).toLocaleString()} in your bank.`, 'message')
    } else if (result?.error === 'already_verified') {
      setUser((current) => (current ? { ...current, verified: true } : current))
      notify(SOCIAL_APP_NAME, 'You are already verified.', 'message')
    } else {
      notify('Purchase Failed', result?.error || 'Could not buy verification', 'message')
    }
  }

  const searchUsers = async (query) => {
    setSearchQuery(query)
    if (!query.trim()) {
      setSearchResults([])
      return
    }
    const data = await fetchNui('chirpSearch', { query })
    if (Array.isArray(data) && data.length > 0) {
      setSearchResults(
        data.map((item) => ({
          author: item.author || item.displayName,
          username: item.username?.startsWith('@') ? item.username : `@${item.username}`,
          bio: item.bio || '',
          followers: item.followers ?? 0,
          following: item.following ?? 0,
          posts: item.posts ?? 0,
          isFollowing: item.isFollowing ?? false,
        }))
      )
    } else {
      setSearchResults(filterSearchUsers(query))
    }
  }

  const handleBack = () => {
    if (!isLoggedIn) {
      goHome()
      return
    }
    if (view === 'feed') {
      goHome()
      return
    }
    if (view === 'post') {
      setSelectedPost(null)
      setComments([])
      setReplyText('')
      setView('feed')
      return
    }
    if (view === 'editProfile') {
      setView('profile')
      return
    }
    if (view === 'profile' && profileUsername && user && profileUsername !== user.username) {
      setView('feed')
      return
    }
    if (view === 'compose' || view === 'search' || view === 'quote') {
      if (view === 'quote') {
        setQuoteTarget(null)
        setQuoteText('')
        setQuoteImage('')
      }
      if (view === 'compose') {
        setPostImage('')
      }
      setView('feed')
      return
    }
    setView('feed')
  }

  const renderPost = (post, showActions = true) => (
    <div key={post.id} className="chirp-post">
      <div className="post-avatar" onClick={() => openProfile(post.username)} role="presentation">
        {post.avatarUrl ? <img src={post.avatarUrl} alt="" /> : <User size={40} />}
      </div>
      <div className="post-content">
        <div className="post-header">
          <div className="post-author" onClick={() => openProfile(post.username)} role="presentation">
            <span className="author-name">
              {post.author}
              {post.verified ? <ChirpVerifiedBadge size={14} /> : null}
            </span>
            <span className="author-username">{post.username}</span>
          </div>
          <span className="post-time">{post.timestamp}</span>
        </div>
        <div className="post-text" onClick={() => openPost(post)} role="presentation">
          {post.content ? <p className="post-text-content">{post.content}</p> : null}
          {post.quotePost ? (
            <ChirpQuotedPost
              post={post.quotePost}
              compact
              onClick={(quoted) => {
                const source = posts.find((item) => String(item.id) === String(quoted.id))
                openPost(source || quoted)
              }}
            />
          ) : null}
          {post.imageUrl ? <ChirpPostImage src={post.imageUrl} compact /> : null}
        </div>
        {showActions && (
          <div className="post-actions">
            <button
              type="button"
              className="chirp-action-btn reply-btn"
              onClick={(e) => {
                e.stopPropagation()
                openReply(post)
              }}
              aria-label="Reply"
            >
              <MessageCircle size={18} />
              <span>{post.comments}</span>
            </button>
            <button
              type="button"
              className={`chirp-action-btn ${post.isReposted ? 'reposted' : ''}`}
              onClick={(e) => {
                e.stopPropagation()
                openRepostMenu(post)
              }}
              aria-label="Repost"
            >
              <Repeat2 size={18} />
              <span>{post.reposts}</span>
            </button>
            <button
              type="button"
              className={`chirp-action-btn ${post.isLiked ? 'liked' : ''}`}
              onClick={(e) => {
                e.stopPropagation()
                likePost(post.id)
              }}
              aria-label="Like"
            >
              <Heart size={18} fill={post.isLiked ? 'currentColor' : 'none'} />
              <span>{post.likes}</span>
            </button>
            <button type="button" className="chirp-action-btn" aria-label="Share">
              <Share size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  )

  const baseProfileMeta =
    profileUsername && findProfileMeta(profileUsername, posts, searchResults)
  const profileMeta =
    baseProfileMeta && user && profileUsername === user.username
      ? {
          ...baseProfileMeta,
          name: user.name,
          bio: user.bio,
          avatarUrl: user.avatarUrl,
          bannerUrl: user.bannerUrl,
          verified: user.verified,
        }
      : baseProfileMeta
  const isOwnProfile = Boolean(user && profileUsername === user.username)
  const profilePosts = profileUsername
    ? posts.filter((post) => post.username === profileUsername)
    : []

  const renderHeader = () => {
    if (!isLoggedIn) {
      return <ChirpScreenHeader variant="auth" onBack={goHome} />
    }
    if (view === 'feed') {
      return <ChirpScreenHeader variant="feed" onProfile={openOwnProfile} />
    }
    if (view === 'search') {
      return null
    }
    if (view === 'compose') {
      return (
        <ChirpScreenHeader
          variant="compose"
          title="New tweet"
          onBack={handleBack}
        />
      )
    }
    if (view === 'quote') {
      return (
        <ChirpScreenHeader
          variant="compose"
          title="Quote"
          onBack={handleBack}
          onAction={submitQuotePost}
          actionLabel="Post"
        />
      )
    }
    if (view === 'post') {
      return <ChirpScreenHeader title="Post" onBack={handleBack} />
    }
    if (view === 'profile' && profileMeta) {
      return (
        <ChirpScreenHeader
          title={profileMeta.name}
          subtitle={`${profileMeta.posts} posts`}
          onBack={handleBack}
        />
      )
    }
    if (view === 'editProfile') {
      return (
        <ChirpScreenHeader
          title="Edit profile"
          onBack={handleBack}
          onAction={saveProfile}
          actionLabel="Save"
          actionDisabled={!editName.trim()}
        />
      )
    }
    return <ChirpScreenHeader title={SOCIAL_APP_NAME} onBack={handleBack} />
  }

  const modalOpen = Boolean(mediaPickerTarget || repostMenuPost)

  useEffect(() => {
    if (!modalOpen) return undefined
    const screenContent = document.querySelector('.screen-content')
    screenContent?.classList.add('chirp-modal-scroll-lock')
    return () => screenContent?.classList.remove('chirp-modal-scroll-lock')
  }, [modalOpen])

  return (
    <div className={`phone-app chirp-app${modalOpen ? ' chirp-app-modal-open' : ''}`}>
      {renderHeader()}

      <div className="chirp-content">
        {!isLoggedIn ? (
          <ChirpAuth
            mode={authView}
            loginUsername={loginUsername}
            loginPassword={loginPassword}
            signupName={signupName}
            signupUsername={signupUsername}
            signupPassword={signupPassword}
            signupConfirm={signupConfirm}
            onLoginUsername={setLoginUsername}
            onLoginPassword={setLoginPassword}
            onSignupName={setSignupName}
            onSignupUsername={setSignupUsername}
            onSignupPassword={setSignupPassword}
            onSignupConfirm={setSignupConfirm}
            onLogin={handleLogin}
            onSignup={handleSignup}
            onSwitchMode={setAuthView}
          />
        ) : (
          <>
            {view === 'feed' &&
              (loading ? (
                <div className="chirp-feed-loading">
                  <MessageCircle size={40} />
                  <p>Loading your timeline...</p>
                </div>
              ) : posts.length === 0 ? (
                <div className="chirp-x-empty">
                  <MessageCircle size={40} />
                  <p>No posts yet. Be the first to tweet!</p>
                </div>
              ) : (
                <div className="posts-feed">{posts.map((post) => renderPost(post))}</div>
              ))}

            {view === 'search' && (
              <ChirpSearch
                searchQuery={searchQuery}
                searchResults={searchResults}
                onSearch={searchUsers}
                onOpenProfile={openProfile}
                onFollow={followUser}
              />
            )}

            {view === 'compose' && (
              <ChirpCompose
                postText={postText}
                imageUrl={postImage}
                onChange={setPostText}
                onSubmit={createPost}
                onAttach={() => openMediaPicker('post')}
                onRemoveImage={() => setPostImage('')}
              />
            )}

            {view === 'quote' && quoteTarget && (
              <ChirpQuoteCompose
                quoteText={quoteText}
                quoteImageUrl={quoteImage}
                quotedPost={quoteTarget}
                onChange={setQuoteText}
                onSubmit={submitQuotePost}
                onAttach={() => openMediaPicker('quote')}
                onRemoveImage={() => setQuoteImage('')}
              />
            )}

            {view === 'post' && selectedPost && (
              <ChirpPostDetail
                post={selectedPost}
                comments={comments}
                commentsLoading={commentsLoading}
                replyText={replyText}
                replyImageUrl={replyImage}
                replyInputRef={replyInputRef}
                onReplyText={setReplyText}
                onSubmitReply={submitReply}
                onAttachReply={() => openMediaPicker('reply')}
                onRemoveReplyImage={() => setReplyImage('')}
                onLike={likePost}
                onOpenRepostMenu={openRepostMenu}
                onOpenProfile={openProfile}
                onFocusReply={() => replyInputRef.current?.focus()}
                onOpenQuotedPost={(quoted) => {
                  const source = posts.find((item) => String(item.id) === String(quoted.id))
                  openPost(source || quoted)
                }}
              />
            )}

            {view === 'profile' && profileUsername && profileMeta && (
              <ChirpProfile
                profile={profileMeta}
                isOwnProfile={isOwnProfile}
                onFollow={followUser}
                onEdit={() => {
                  setEditName(user?.name || profileMeta.name)
                  setEditBio(user?.bio || profileMeta.bio || '')
                  setEditAvatarUrl(user?.avatarUrl || profileMeta.avatarUrl || '')
                  setEditBannerUrl(user?.bannerUrl || profileMeta.bannerUrl || '')
                  setView('editProfile')
                }}
                renderPost={renderPost}
                userPosts={profilePosts}
              />
            )}

            {view === 'editProfile' && (
              <ChirpEditProfile
                user={user}
                editName={editName}
                editBio={editBio}
                editAvatarUrl={editAvatarUrl}
                editBannerUrl={editBannerUrl}
                verified={user?.verified}
                verificationPrice={verificationPrice}
                buyingVerification={buyingVerification}
                onEditName={setEditName}
                onEditBio={setEditBio}
                onPickAvatar={() => openMediaPicker('avatar')}
                onPickBanner={() => openMediaPicker('banner')}
                onSave={saveProfile}
                onBuyVerification={buyVerification}
                onLogout={handleLogout}
              />
            )}
          </>
        )}
      </div>

      {repostMenuPost && (
        <ChirpRepostMenu
          post={repostMenuPost}
          onRepost={simpleRepost}
          onUndoRepost={undoRepost}
          onQuote={openQuote}
          onClose={() => setRepostMenuPost(null)}
        />
      )}

      {mediaPickerTarget && (
        <ChirpMediaPicker
          open
          title={
            mediaPickerTarget === 'avatar'
              ? 'Profile photo'
              : mediaPickerTarget === 'banner'
                ? 'Banner photo'
                : 'Add image'
          }
          onClose={() => setMediaPickerTarget(null)}
          onSelect={handleMediaSelect}
        />
      )}

      {showBottomNav && (
        <ChirpBottomNav
          active={navActive}
          onHome={() => setView('feed')}
          onSearch={() => setView('search')}
          onCompose={() => {
            setPostText('')
            setPostImage('')
            setView('compose')
          }}
          onProfile={openOwnProfile}
        />
      )}
    </div>
  )
}
