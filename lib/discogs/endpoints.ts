import { discogsRequest } from "./client";
import type {
  FoldersResponse,
  CollectionReleasesResponse,
  ReleaseDetail,
} from "./types";

export function fetchFolders(username: string) {
  return discogsRequest<FoldersResponse>(
    `/users/${username}/collection/folders`
  );
}

export function fetchReleasesInFolder(
  username: string,
  folderId: number,
  page: number = 1,
  perPage: number = 100
) {
  return discogsRequest<CollectionReleasesResponse>(
    `/users/${username}/collection/folders/${folderId}/releases?per_page=${perPage}&page=${page}`
  );
}

export function fetchReleaseDetail(releaseId: number) {
  return discogsRequest<ReleaseDetail>(`/releases/${releaseId}`);
}
