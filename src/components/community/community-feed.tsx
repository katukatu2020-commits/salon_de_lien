"use client";

import { Check, Heart, Loader2, MessageCircle, Pencil, Scissors, Send, Sparkles, Trash2, UserRound, X } from "lucide-react";
import { FormEvent, useState } from "react";
import type { CommunityActor, CommunityPostView } from "@/lib/community/visit-community";

function formatVisitDate(value: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "long",
    day: "numeric"
  }).format(new Date(value));
}

function formatCommentDate(value: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

export function CommunityFeed({ initialPosts, actor }: { initialPosts: CommunityPostView[]; actor: CommunityActor }) {
  const [posts, setPosts] = useState(initialPosts);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [postDrafts, setPostDrafts] = useState<Record<string, string>>({});
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [confirmDeleteKey, setConfirmDeleteKey] = useState<string | null>(null);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const endpointPrefix = actor === "staff" ? "/api/admin/community/posts" : "/api/customer/community/posts";

  async function toggleLike(postId: string) {
    const key = `like:${postId}`;
    if (pendingKey) return;
    setPendingKey(key);
    setError(null);
    try {
      const response = await fetch(`${endpointPrefix}/${postId}/like`, { method: "POST" });
      const result = (await response.json().catch(() => null)) as { error?: string; liked?: boolean; likeCount?: number } | null;
      if (!response.ok) throw new Error(result?.error || "いいねを更新できませんでした。");
      setPosts((current) => current.map((post) => post.id === postId ? {
        ...post,
        likedByCurrentUser: Boolean(result?.liked),
        likeCount: Number(result?.likeCount ?? post.likeCount)
      } : post));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "いいねを更新できませんでした。");
    } finally {
      setPendingKey(null);
    }
  }

  async function submitComment(event: FormEvent<HTMLFormElement>, postId: string) {
    event.preventDefault();
    const body = drafts[postId]?.trim() ?? "";
    if (!body || pendingKey) return;
    const key = `comment:${postId}`;
    setPendingKey(key);
    setError(null);
    try {
      const response = await fetch(`${endpointPrefix}/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body })
      });
      const result = (await response.json().catch(() => null)) as CommunityPostView["comments"][number] & { error?: string };
      if (!response.ok) throw new Error(result?.error || "コメントを保存できませんでした。");
      setPosts((current) => current.map((post) => post.id === postId ? { ...post, comments: [...post.comments, result] } : post));
      setDrafts((current) => ({ ...current, [postId]: "" }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "コメントを保存できませんでした。");
    } finally {
      setPendingKey(null);
    }
  }

  async function savePost(postId: string) {
    const caption = postDrafts[postId]?.trim() ?? "";
    if (pendingKey) return;
    const key = `post-edit:${postId}`;
    setPendingKey(key);
    setError(null);
    try {
      const response = await fetch(`${endpointPrefix}/${postId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caption })
      });
      const result = (await response.json().catch(() => null)) as { caption?: string | null; error?: string } | null;
      if (!response.ok) throw new Error(result?.error || "投稿を更新できませんでした。");
      setPosts((current) => current.map((post) => post.id === postId ? { ...post, caption: result?.caption ?? null } : post));
      setEditingPostId(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "投稿を更新できませんでした。");
    } finally {
      setPendingKey(null);
    }
  }

  async function deletePost(postId: string) {
    if (pendingKey) return;
    const key = `post-delete:${postId}`;
    setPendingKey(key);
    setError(null);
    try {
      const response = await fetch(`${endpointPrefix}/${postId}`, { method: "DELETE" });
      const result = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) throw new Error(result?.error || "投稿を削除できませんでした。");
      setPosts((current) => current.filter((post) => post.id !== postId));
      window.location.assign(actor === "staff" ? "/admin/community" : "/u/community");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "投稿を削除できませんでした。");
      setPendingKey(null);
    }
  }

  async function saveComment(postId: string, commentId: string) {
    const body = commentDrafts[commentId]?.trim() ?? "";
    if (!body || pendingKey) return;
    const key = `comment-edit:${commentId}`;
    setPendingKey(key);
    setError(null);
    try {
      const response = await fetch(`${endpointPrefix}/${postId}/comments/${commentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body })
      });
      const result = (await response.json().catch(() => null)) as { body?: string; updatedAt?: string; error?: string } | null;
      if (!response.ok) throw new Error(result?.error || "コメントを更新できませんでした。");
      setPosts((current) => current.map((post) => post.id === postId ? {
        ...post,
        comments: post.comments.map((comment) => comment.id === commentId ? {
          ...comment,
          body: result?.body ?? body,
          updatedAt: result?.updatedAt ?? new Date().toISOString()
        } : comment)
      } : post));
      setEditingCommentId(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "コメントを更新できませんでした。");
    } finally {
      setPendingKey(null);
    }
  }

  async function deleteComment(postId: string, commentId: string) {
    if (pendingKey) return;
    const key = `comment-delete:${commentId}`;
    setPendingKey(key);
    setError(null);
    try {
      const response = await fetch(`${endpointPrefix}/${postId}/comments/${commentId}`, { method: "DELETE" });
      const result = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) throw new Error(result?.error || "コメントを削除できませんでした。");
      setPosts((current) => current.map((post) => post.id === postId ? {
        ...post,
        comments: post.comments.filter((comment) => comment.id !== commentId)
      } : post));
      setConfirmDeleteKey(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "コメントを削除できませんでした。");
    } finally {
      setPendingKey(null);
    }
  }

  if (posts.length === 0) {
    return (
      <div className="rounded-[20px] border border-dashed border-[#d8cbbf] bg-white px-5 py-14 text-center">
        <Sparkles className="mx-auto h-7 w-7 text-[#8f4f42]" />
        <p className="mt-3 text-sm font-semibold">共有されたスタイルはまだありません</p>
        <p className="mt-2 text-xs leading-5 text-[#7c7168]">施術後写真のある来店履歴をお客様が公開すると、ここに表示されます。</p>
      </div>
    );
  }

  return (
    <div className="community-feed-grid grid gap-5 xl:grid-cols-2">
      {error ? <p className="rounded-xl border border-[#efc6c1] bg-[#fff4f2] px-4 py-3 text-sm text-[#9d342d] xl:col-span-2" role="alert">{error}</p> : null}
      {posts.map((post) => (
        <article key={post.id} className="community-feed-card overflow-hidden rounded-[20px] border border-[#e8ded2] bg-white shadow-[0_12px_35px_rgba(47,42,37,0.07)]">
          <header className="flex items-center justify-between gap-3 px-4 py-4 sm:px-5">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#f1dfd7] text-sm font-bold text-[#7d453a]">
                {post.customerName.slice(0, 1)}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold">{post.customerName}</span>
                <span className="block text-xs text-[#8b8178]">{formatVisitDate(post.visitDate)}</span>
              </span>
            </div>
            {actor === "staff" ? (
              <span className="rounded-full bg-[#eef5ee] px-3 py-1 text-[11px] font-semibold text-[#567157]">公開中</span>
            ) : null}
          </header>

          <div className={`community-feed-media grid gap-1 bg-[#eee7df] ${post.photos.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
            {post.photos.slice(0, 4).map((photo) => (
              <a key={photo.id} href={photo.url} target="_blank" rel="noreferrer" className="community-feed-photo group relative aspect-[4/3] min-w-0 overflow-hidden focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-[#e9c9be]" aria-label="施術後写真を拡大表示">
                <span className="absolute inset-0 bg-cover bg-center transition duration-200 group-hover:scale-[1.02] motion-reduce:transition-none" style={{ backgroundImage: `url(${photo.url})` }} />
                {photo.caption ? <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 pb-3 pt-10 text-xs text-white">{photo.caption}</span> : null}
              </a>
            ))}
          </div>

          <div className="community-feed-content p-4 sm:p-5">
            <div className="community-feed-meta flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-2xl bg-[#fbf7f0] px-3 py-2.5 text-sm sm:grid sm:grid-cols-2 sm:gap-2 sm:p-3">
              <p className="flex items-center gap-2"><Scissors className="h-4 w-4 text-[#8f4f42]" /><span className="font-semibold">{post.menu}</span></p>
              <p className="flex items-center gap-2 text-[#6f6259]"><UserRound className="h-4 w-4" />担当 {post.stylistName}</p>
            </div>

            {editingPostId === post.id ? (
              <div className="mt-3 rounded-2xl border border-[#decfc2] bg-[#fffdfb] p-3">
                <label className="block text-xs font-semibold text-[#6f6259]" htmlFor={`post-caption-${post.id}`}>投稿文を編集</label>
                <textarea
                  id={`post-caption-${post.id}`}
                  value={postDrafts[post.id] ?? ""}
                  onChange={(event) => setPostDrafts((current) => ({ ...current, [post.id]: event.target.value }))}
                  maxLength={300}
                  rows={3}
                  className="mt-2 min-h-24 w-full resize-y rounded-xl border border-[#e8ded2] bg-white px-3 py-2 text-base leading-6 outline-none focus:border-[#8f4f42] focus:ring-4 focus:ring-[#e9c9be]/40 sm:text-sm"
                />
                <div className="mt-2 flex justify-end gap-2">
                  <button type="button" onClick={() => setEditingPostId(null)} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#e8ded2] bg-white px-4 text-sm font-semibold text-[#5b5149] hover:bg-[#f6efe6]">
                    <X className="h-4 w-4" />戻る
                  </button>
                  <button type="button" onClick={() => void savePost(post.id)} disabled={Boolean(pendingKey)} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#8f4f42] px-4 text-sm font-semibold text-white hover:bg-[#7d453a] disabled:opacity-50">
                    {pendingKey === `post-edit:${post.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}保存
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-3 flex items-start justify-between gap-3">
                <p className={`min-w-0 flex-1 whitespace-pre-wrap break-words text-sm leading-6 ${post.caption ? "text-[#5b5149]" : "text-[#9a8f86]"}`}>
                  {post.caption || "投稿文はありません。"}
                </p>
                {(post.canEdit || post.canDelete) ? (
                  <div className="flex shrink-0 items-center gap-1">
                    {post.canEdit ? (
                      <button type="button" onClick={() => { setEditingPostId(post.id); setPostDrafts((current) => ({ ...current, [post.id]: post.caption ?? "" })); setConfirmDeleteKey(null); }} className="inline-flex h-11 w-11 items-center justify-center rounded-full text-[#6f6259] hover:bg-[#f6efe6]" aria-label="投稿を編集">
                        <Pencil className="h-4 w-4" />
                      </button>
                    ) : null}
                    {post.canDelete ? (
                      <button type="button" onClick={() => setConfirmDeleteKey(`post:${post.id}`)} className="inline-flex h-11 w-11 items-center justify-center rounded-full text-[#9d4a43] hover:bg-[#fff0ee]" aria-label="投稿を削除">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            )}

            {confirmDeleteKey === `post:${post.id}` ? (
              <div className="mt-3 flex flex-col gap-3 rounded-2xl border border-[#efc6c1] bg-[#fff4f2] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-semibold text-[#8c3832]">この投稿をスタイル共有から削除しますか？</p>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setConfirmDeleteKey(null)} className="min-h-11 rounded-full border border-[#e4cfc9] bg-white px-4 text-sm font-semibold">戻る</button>
                  <button type="button" onClick={() => void deletePost(post.id)} disabled={Boolean(pendingKey)} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#9d443c] px-4 text-sm font-semibold text-white disabled:opacity-50">
                    {pendingKey === `post-delete:${post.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}削除する
                  </button>
                </div>
              </div>
            ) : null}

            <div className="mt-3 flex items-center gap-3 border-b border-[#eee4da] pb-3 sm:mt-4 sm:pb-4">
              <button type="button" onClick={() => void toggleLike(post.id)} disabled={Boolean(pendingKey)} className={`inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold transition ${post.likedByCurrentUser ? "bg-[#f9e2df] text-[#9b3e36]" : "bg-[#f6efe6] text-[#6f6259] hover:bg-[#f1e5d9]"}`} aria-pressed={post.likedByCurrentUser}>
                {pendingKey === `like:${post.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Heart className={`h-4 w-4 ${post.likedByCurrentUser ? "fill-current" : ""}`} />}
                {post.likeCount}
              </button>
              <span className="inline-flex items-center gap-2 text-sm text-[#7c7168]"><MessageCircle className="h-4 w-4" />{post.comments.length}件</span>
            </div>

            {post.comments.length > 0 ? (
              <div className="mt-4 grid gap-3">
                {post.comments.map((comment) => (
                  <div key={comment.id} className={`rounded-2xl px-4 py-3 ${comment.isStylistComment ? "border border-[#d9e6d8] bg-[#f2f7f1]" : "bg-[#fbf7f0]"}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 flex-wrap items-center gap-2 text-xs">
                        <span className="font-semibold text-[#2f2a25]">{comment.authorDisplayName}</span>
                        {comment.isStylistComment ? <span className="rounded-full bg-[#789778] px-2 py-0.5 font-semibold text-white">スタイリスト</span> : null}
                        <span className="text-[#9a8f86]">{formatCommentDate(comment.createdAt)}</span>
                        {comment.updatedAt !== comment.createdAt ? <span className="text-[#9a8f86]">編集済み</span> : null}
                      </div>
                      {(comment.canEdit || comment.canDelete) && editingCommentId !== comment.id ? (
                        <div className="flex shrink-0 items-center gap-1">
                          {comment.canEdit ? (
                            <button type="button" onClick={() => { setEditingCommentId(comment.id); setCommentDrafts((current) => ({ ...current, [comment.id]: comment.body })); setConfirmDeleteKey(null); }} className="inline-flex h-11 w-11 items-center justify-center rounded-full text-[#6f6259] hover:bg-white/80" aria-label="コメントを編集">
                              <Pencil className="h-4 w-4" />
                            </button>
                          ) : null}
                          {comment.canDelete ? (
                            <button type="button" onClick={() => setConfirmDeleteKey(`comment:${comment.id}`)} className="inline-flex h-11 w-11 items-center justify-center rounded-full text-[#9d4a43] hover:bg-[#fff0ee]" aria-label="コメントを削除">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                    {editingCommentId === comment.id ? (
                      <div className="mt-2">
                        <textarea value={commentDrafts[comment.id] ?? ""} onChange={(event) => setCommentDrafts((current) => ({ ...current, [comment.id]: event.target.value }))} maxLength={300} rows={3} className="min-h-20 w-full resize-y rounded-xl border border-[#decfc2] bg-white px-3 py-2 text-base leading-6 outline-none focus:border-[#8f4f42] focus:ring-4 focus:ring-[#e9c9be]/40 sm:text-sm" aria-label="コメント内容" />
                        <div className="mt-2 flex justify-end gap-2">
                          <button type="button" onClick={() => setEditingCommentId(null)} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#e8ded2] bg-white px-4 text-sm font-semibold"><X className="h-4 w-4" />戻る</button>
                          <button type="button" onClick={() => void saveComment(post.id, comment.id)} disabled={!commentDrafts[comment.id]?.trim() || Boolean(pendingKey)} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#8f4f42] px-4 text-sm font-semibold text-white disabled:opacity-50">
                            {pendingKey === `comment-edit:${comment.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}保存
                          </button>
                        </div>
                      </div>
                    ) : <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-[#5b5149]">{comment.body}</p>}
                    {confirmDeleteKey === `comment:${comment.id}` ? (
                      <div className="mt-3 flex flex-col gap-2 border-t border-[#ead8d3] pt-3 sm:flex-row sm:items-center sm:justify-between">
                        <span className="text-xs font-semibold text-[#8c3832]">このコメントを削除しますか？</span>
                        <div className="flex gap-2">
                          <button type="button" onClick={() => setConfirmDeleteKey(null)} className="min-h-11 rounded-full border border-[#e4cfc9] bg-white px-4 text-xs font-semibold">戻る</button>
                          <button type="button" onClick={() => void deleteComment(post.id, comment.id)} disabled={Boolean(pendingKey)} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#9d443c] px-4 text-xs font-semibold text-white disabled:opacity-50">
                            {pendingKey === `comment-delete:${comment.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}削除する
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}

            <form onSubmit={(event) => void submitComment(event, post.id)} className="mt-3 flex items-end gap-2 sm:mt-4">
              <label className="min-w-0 flex-1">
                <span className="sr-only">コメント</span>
                <textarea value={drafts[post.id] ?? ""} onChange={(event) => setDrafts((current) => ({ ...current, [post.id]: event.target.value }))} maxLength={300} rows={2} placeholder={actor === "staff" ? "スタイリストとしてコメント" : "コメントを入力"} className="min-h-12 w-full resize-none rounded-2xl border border-[#e8ded2] bg-white px-4 py-3 text-base leading-6 outline-none transition placeholder:text-[#aaa097] focus:border-[#8f4f42] focus:ring-4 focus:ring-[#e9c9be]/40 sm:text-sm" />
              </label>
              <button type="submit" disabled={!drafts[post.id]?.trim() || Boolean(pendingKey)} className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#8f4f42] text-white shadow-sm transition hover:bg-[#7d453a] disabled:cursor-not-allowed disabled:opacity-45" aria-label="コメントを送信">
                {pendingKey === `comment:${post.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </form>
          </div>
        </article>
      ))}
    </div>
  );
}
