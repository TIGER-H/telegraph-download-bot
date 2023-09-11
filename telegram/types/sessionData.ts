export interface sessionData {
  history: Array<
    { link: string; timestamp: number; fromId: number; title: string }
  >;
}
