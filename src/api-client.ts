export type ApiOptions = { method?: string; body?: unknown; userId?: string };

export async function api<T = any>(path: string, options: ApiOptions = {}): Promise<T> {
  const response = await fetch(`/api/${path.replace(/^\//,'')}`, {
    method: options.method || 'GET',
    headers: { 'content-type':'application/json', ...(options.userId ? {'x-user-id': options.userId} : {}) },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `API ${response.status}`);
  return data;
}

export const socialApi = {
  me: () => api('auth/me'),
  feed: () => api('feed/for-you'),
  following: () => api('feed/following'),
  friends: () => api('friends'),
  search: (q:string) => api(`search?q=${encodeURIComponent(q)}`),
  video: (id:string) => api(`videos/${id}`),
  createVideo: (body:unknown) => api('videos',{method:'POST',body}),
  like: (id:string) => api(`videos/${id}/like`,{method:'POST'}),
  unlike: (id:string) => api(`videos/${id}/like`,{method:'DELETE'}),
  comment: (videoId:string, body:unknown) => api(`videos/${videoId}/comments`,{method:'POST',body}),
  comments: (videoId:string) => api(`videos/${videoId}/comments`),
  follow: (id:string) => api(`users/${id}/follow`,{method:'POST'}),
  unfollow: (id:string) => api(`users/${id}/follow`,{method:'DELETE'}),
  notifications: () => api('notifications'),
  stories: () => api('stories'),
  playlists: () => api('playlists'),
  conversations: () => api('messages'),
  sendMessage: (conversationId:string, body:unknown) => api(`messages/${conversationId}`,{method:'POST',body}),
  studio: () => api('studio/overview'),
  promote: () => api('promote'),
  createCampaign: (body:unknown) => api('promote',{method:'POST',body}),
  monetization: () => api('monetization/dashboard'),
  credits: () => api('credits'),
  generateVideo: (body:unknown) => api('ai-video/generate',{method:'POST',body}),
  aiJob: (id:string) => api(`ai-video/${id}`),
};
