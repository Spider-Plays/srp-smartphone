import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ChevronLeft,
  Eye,
  Home,
  Newspaper,
  PenLine,
  ScanSearch,
  Search,
} from 'lucide-react'
import FoldEmpty from '../../components/FoldEmpty'
import { usePhone } from '../../context/PhoneContext'
import { fetchNui } from '../../hooks/useNui'
import NewsCompose from './NewsCompose'

const NAV_TABS = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'browse', label: 'Browse', icon: Newspaper },
  { id: 'explore', label: 'Explore', icon: ScanSearch },
  { id: 'following', label: 'Following', icon: Eye },
]

const HEADER_TITLES = {
  home: 'WEAZEL NEWS',
  browse: 'BROWSE',
  explore: 'EXPLORE',
  following: 'FOLLOWING',
}

const EMPTY_COPY = {
  home: { icon: Newspaper, text: 'No news articles available' },
  browse: { icon: Newspaper, text: 'No articles available' },
  explore: { icon: ScanSearch, text: 'No news outlets available' },
  following: { icon: Eye, text: 'Follow some channels to see their articles here' },
}

function EmptyState({ tab }) {
  const { icon: Icon, text } = EMPTY_COPY[tab] || EMPTY_COPY.home
  return (
    <div className="news-empty">
      <Icon size={56} strokeWidth={1.5} />
      <p>{text}</p>
    </div>
  )
}

function ArticleList({ articles, onOpen }) {
  if (!articles.length) return null
  return articles.map((article) => (
    <button
      key={article.id}
      type="button"
      className="news-article-card"
      onClick={() => onOpen(article.id)}
    >
      {article.image_url && (
        <img src={article.image_url} alt="" className="news-article-thumb" />
      )}
      <div className="news-article-meta">
        {article.outlet_name}
        {article.timeAgo ? ` · ${article.timeAgo}` : ''}
      </div>
      <h3>{article.headline}</h3>
      {article.excerpt && <p className="news-article-excerpt">{article.excerpt}</p>}
    </button>
  ))
}

function OutletList({ outlets, onToggle }) {
  if (!outlets.length) return null
  return outlets.map((outlet) => (
    <div key={outlet.id} className="news-outlet-card">
      <div className="news-outlet-body">
        <h3>{outlet.name}</h3>
        {outlet.description && <p>{outlet.description}</p>}
      </div>
      <button
        type="button"
        className={`news-follow-btn ${outlet.is_following ? 'following' : ''}`}
        onClick={() => onToggle(outlet)}
      >
        {outlet.is_following ? 'Following' : 'Follow'}
      </button>
    </div>
  ))
}

function ArticleDetail({ article, onBack, onToggleFollow }) {
  return (
    <div className="news-detail">
      <div className="news-detail-header">
        <button type="button" className="news-detail-back" onClick={onBack} aria-label="Back">
          <ChevronLeft size={28} strokeWidth={2} />
        </button>
      </div>
      <div className="news-detail-content">
        <div className="news-article-meta">
          {article.outlet_name}
          {article.author_label ? ` · ${article.author_label}` : ''}
          {article.timeAgo ? ` · ${article.timeAgo}` : ''}
        </div>
        <h1>{article.headline}</h1>
        {article.image_url && (
          <img src={article.image_url} alt="" className="news-article-thumb" style={{ marginTop: 12 }} />
        )}
        <p className="news-detail-body">{article.body}</p>
        <button
          type="button"
          className={`news-follow-btn ${article.is_following ? 'following' : ''}`}
          style={{ marginTop: 20 }}
          onClick={() => onToggleFollow(article.outlet_id, article.is_following)}
        >
          {article.is_following ? 'Following channel' : 'Follow channel'}
        </button>
      </div>
    </div>
  )
}

export default function NewsScreen() {
  const { bootstrap, phoneFlipped, foldLayout } = usePhone()
  const folded = phoneFlipped && foldLayout?.mode === 'span'
  const appName = bootstrap?.newsConfig?.appName || 'WEAZEL NEWS'
  const canPublish = Boolean(bootstrap?.newsConfig?.canPublish)

  const [tab, setTab] = useState('home')
  const [composing, setComposing] = useState(false)
  const [browseTab, setBrowseTab] = useState('trending')
  const [search, setSearch] = useState('')
  const [articles, setArticles] = useState([])
  const [outlets, setOutlets] = useState([])
  const [loading, setLoading] = useState(true)
  const [articleId, setArticleId] = useState(null)
  const [articleDetail, setArticleDetail] = useState(null)

  const searchPlaceholder = useMemo(() => {
    if (tab === 'explore') return 'Search outlets'
    return 'Search articles'
  }, [tab])

  const articleScope = useMemo(() => {
    if (tab === 'following') return 'following'
    if (tab === 'browse' && browseTab === 'following') return 'following'
    return 'home'
  }, [tab, browseTab])

  const loadArticles = useCallback(async () => {
    setLoading(true)
    const scope = articleScope
    const rows = await fetchNui('getNewsArticles', {
      scope,
      search: search.trim() || undefined,
    })
    setArticles(Array.isArray(rows) ? rows : [])
    setLoading(false)
  }, [articleScope, search])

  const loadOutlets = useCallback(async () => {
    setLoading(true)
    const rows = await fetchNui('getNewsOutlets', {
      search: search.trim() || undefined,
    })
    setOutlets(Array.isArray(rows) ? rows : [])
    setLoading(false)
  }, [search])

  useEffect(() => {
    if (tab === 'explore') {
      loadOutlets()
      return
    }
    loadArticles()
  }, [tab, loadArticles, loadOutlets])

  const openArticle = async (id) => {
    const res = await fetchNui('getNewsArticle', { id })
    if (res?.ok && res.article) {
      setArticleDetail(res.article)
      setArticleId(id)
    }
  }

  const closeArticle = () => {
    setArticleId(null)
    setArticleDetail(null)
  }

  const openCompose = () => {
    closeArticle()
    setComposing(true)
  }

  const closeCompose = () => setComposing(false)

  const onPublished = (article) => {
    setComposing(false)
    setTab('home')
    setSearch('')
    if (article) {
      const normalized = {
        ...article,
        excerpt: article.excerpt || (article.body ? `${article.body.slice(0, 160)}${article.body.length > 160 ? '...' : ''}` : ''),
        timeAgo: article.timeAgo || 'Just now',
      }
      setArticles((prev) => [
        normalized,
        ...prev.filter((a) => a.id !== normalized.id),
      ])
    }
    loadArticles()
  }

  const toggleFollow = async (outletId, wasFollowing) => {
    const res = await fetchNui('toggleNewsFollow', { outletId })
    if (!res?.ok) return

    if (articleDetail && articleDetail.outlet_id === outletId) {
      setArticleDetail({ ...articleDetail, is_following: res.following ? 1 : 0 })
    }

    if (tab === 'explore') {
      setOutlets((prev) =>
        prev.map((o) =>
          o.id === outletId ? { ...o, is_following: res.following ? 1 : 0 } : o
        )
      )
    } else {
      loadArticles()
    }
  }

  const onOutletToggle = (outlet) => {
    toggleFollow(outlet.id, outlet.is_following)
  }

  const headerTitle = tab === 'home' ? appName.toUpperCase() : HEADER_TITLES[tab]

  const showSearch = tab !== 'following'
  const showBrowseTabs = tab === 'browse'

  let mainContent
  if (loading && !articles.length && !outlets.length) {
    mainContent = null
  } else if (tab === 'explore') {
    mainContent = outlets.length ? (
      <OutletList outlets={outlets} onToggle={onOutletToggle} />
    ) : (
      <EmptyState tab="explore" />
    )
  } else {
    mainContent = articles.length ? (
      <ArticleList articles={articles} onOpen={openArticle} />
    ) : (
      <EmptyState tab={tab} />
    )
  }

  if (composing && !folded) {
    return (
      <div className="news-app">
        <NewsCompose onBack={closeCompose} onPublished={onPublished} />
      </div>
    )
  }

  return (
    <div className={`news-app${folded ? ' news-fold' : ''}`}>
      <header className="news-header">
        <div className="news-brand">
          <Newspaper className="news-brand-icon" size={22} strokeWidth={2} />
          <h1 className="news-brand-title">{headerTitle}</h1>
        </div>
        {canPublish && (
          <button
            type="button"
            className="news-publish-btn"
            onClick={openCompose}
            aria-label="Publish story"
          >
            <PenLine size={18} strokeWidth={2} />
            <span>Publish</span>
          </button>
        )}
      </header>

      {showSearch && (
        <div className="news-search">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
          />
          <Search className="news-search-icon" size={18} strokeWidth={2} />
        </div>
      )}

      {showBrowseTabs && (
        <div className="news-browse-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            className={`news-browse-tab ${browseTab === 'trending' ? 'active' : ''}`}
            onClick={() => setBrowseTab('trending')}
          >
            Trending
          </button>
          <button
            type="button"
            role="tab"
            className={`news-browse-tab ${browseTab === 'following' ? 'active' : ''}`}
            onClick={() => setBrowseTab('following')}
          >
            Following
          </button>
        </div>
      )}

      <div className="news-content">{mainContent}</div>

      <nav className="news-nav" aria-label="News navigation">
        {NAV_TABS.map((t) => {
          const Icon = t.icon
          return (
            <button
              key={t.id}
              type="button"
              className={`news-nav-item ${tab === t.id ? 'active' : ''}`}
              onClick={() => {
                setTab(t.id)
                setSearch('')
                closeArticle()
              }}
            >
              <Icon size={20} strokeWidth={2} />
              <span>{t.label}</span>
            </button>
          )
        })}
      </nav>

      {folded && composing && (
        <div className="fold-detail-dock">
          <NewsCompose onBack={closeCompose} onPublished={onPublished} />
        </div>
      )}

      {articleDetail && (
        <ArticleDetail
          article={articleDetail}
          onBack={closeArticle}
          onToggleFollow={(outletId, isFollowing) => toggleFollow(outletId, isFollowing)}
        />
      )}

      {folded && !articleDetail && !composing && (
        <div className="fold-detail-dock">
          <FoldEmpty title="Select a story" subtitle="Articles you open show up on this screen." />
        </div>
      )}
    </div>
  )
}
