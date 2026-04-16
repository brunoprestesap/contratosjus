export type ActionResponse<T = undefined> = {
  success: boolean;
  data?: T;
  error?: string;
};
