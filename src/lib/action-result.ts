export type ActionResult =
  | { ok: true }
  | { ok: false; error: string };

/** Za akcije koje vraćaju podatak (npr. id novokreiranog zapisa). */
export type ActionResultWith<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export function actionErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return "Došlo je do greške";
}
