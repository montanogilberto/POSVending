// In-memory hand-off of the ticket photo to /egresos/resumen: the photo is
// several MB, too big for router/history state.
let pendingPhoto: string | null = null;

export const setOperationPhoto = (photo: string) => { pendingPhoto = photo; };

/** Returns the pending photo once and clears it, so reopening the page starts clean. */
export const takeOperationPhoto = (): string | null => {
  const photo = pendingPhoto;
  pendingPhoto = null;
  return photo;
};
