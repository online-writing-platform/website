import { Navigate } from "react-router-dom";

import useAuth from "../hooks/useAuth";

export default function SettingsPage() {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  return (
    <Navigate
      replace
      to={`/users/${encodeURIComponent(user.username)}?settings=profile`}
    />
  );
}
