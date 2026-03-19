export interface ApifyInstagramData {
  username: string;
  followersCount: number;
  followsCount: number;
  postsCount: number;
  biography: string;
  profilePicUrl: string;
  latestPosts: string[];
}

export async function fetchInstagramProfile(username: string, apiKey: string): Promise<ApifyInstagramData | null> {
  try {
    console.log(`[Apify] Buscando dados para @${username}...`);
    const response = await fetch(`https://api.apify.com/v2/acts/apify~instagram-profile-scraper/run-sync-get-dataset-items?token=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usernames: [username] })
    });
    
    if (!response.ok) {
      console.error('[Apify] Erro na requisição:', await response.text());
      return null;
    }
    
    const data = await response.json();
    if (!data || data.length === 0) return null;
    
    const profile = data[0];
    return {
      username: profile.username,
      followersCount: profile.followersCount,
      followsCount: profile.followsCount,
      postsCount: profile.postsCount,
      biography: profile.biography,
      profilePicUrl: profile.profilePicUrl,
      latestPosts: (profile.latestPosts || []).map((p: any) => p.caption).filter(Boolean).slice(0, 5)
    };
  } catch (error) {
    console.error('[Apify] Erro ao buscar perfil:', error);
    return null;
  }
}
