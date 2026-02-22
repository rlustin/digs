import { discogsRequest } from "./client";
import type {
  FoldersResponse,
  CollectionReleasesResponse,
  ReleaseDetail,
} from "./types";

export function fetchFolders(username: string, signal?: AbortSignal) {
  return discogsRequest<FoldersResponse>(
    `/users/${username}/collection/folders`,
    "GET",
    3,
    signal
  );
}

export function fetchReleasesInFolder(
  username: string,
  folderId: number,
  page: number = 1,
  perPage: number = 100,
  signal?: AbortSignal
) {
  return discogsRequest<CollectionReleasesResponse>(
    `/users/${username}/collection/folders/${folderId}/releases?per_page=${perPage}&page=${page}`,
    "GET",
    3,
    signal
  );
}

export function fetchReleaseDetail(releaseId: number, signal?: AbortSignal) {
  return discogsRequest<ReleaseDetail>(`/releases/${releaseId}`, "GET", 3, signal);
}
