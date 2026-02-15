// ── Pagination ──────────────────────────────────────────────
export interface Pagination {
  page: number;
  pages: number;
  per_page: number;
  items: number;
  urls: { last?: string; next?: string };
}

// ── Folders ─────────────────────────────────────────────────
export interface DiscogsFolder {
  id: number;
  name: string;
  count: number;
  resource_url: string;
}

export interface FoldersResponse {
  folders: DiscogsFolder[];
}

// ── Collection Releases ─────────────────────────────────────
export interface CollectionArtist {
  name: string;
  id: number;
  resource_url: string;
}

export interface CollectionLabel {
  name: string;
  catno: string;
  resource_url: string;
}

export interface CollectionFormat {
  name: string;
  qty: string;
  descriptions?: string[];
}

export interface CollectionRelease {
  id: number;
  instance_id: number;
  folder_id: number;
  date_added: string;
  basic_information: {
    id: number;
    title: string;
    year: number;
    resource_url: string;
    thumb: string;
    cover_image: string;
    artists: CollectionArtist[];
    labels: CollectionLabel[];
    formats: CollectionFormat[];
    genres: string[];
    styles: string[];
  };
}

export interface CollectionReleasesResponse {
  pagination: Pagination;
  releases: CollectionRelease[];
}

// ── Release Detail ──────────────────────────────────────────
export interface Track {
  position: string;
  title: string;
  duration: string;
}

export interface ReleaseImage {
  type: string;
  uri: string;
  uri150: string;
  width: number;
  height: number;
  resource_url: string;
}

export interface ReleaseVideo {
  uri: string;
  title: string;
  duration: number;
}

export interface ReleaseCommunity {
  rating: { average: number; count: number };
  have: number;
  want: number;
}

export interface ReleaseDetail {
  id: number;
  title: string;
  year: number;
  artists: CollectionArtist[];
  labels: CollectionLabel[];
  formats: CollectionFormat[];
  genres: string[];
  styles: string[];
  tracklist: Track[];
  images: ReleaseImage[];
  videos: ReleaseVideo[];
  community: ReleaseCommunity;
  thumb: string;
}

// ── Identity ────────────────────────────────────────────────
export interface Identity {
  id: number;
  username: string;
  resource_url: string;
  consumer_name: string;
}
