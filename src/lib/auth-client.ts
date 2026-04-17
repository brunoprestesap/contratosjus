import { logoutAction } from "@/actions/auth";

export async function performLogout() {
  await logoutAction();
  window.location.href = "/login";
}
