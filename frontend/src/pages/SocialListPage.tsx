import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { apiRequest } from "../lib/api";
import { getErrorMessage } from "../lib/error-message";

interface SocialUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
}

interface SocialPageResponse {
  data: {
    users: SocialUser[];
    pagination: { hasMore: boolean; nextCursor: string | null };
  };
}

export default function SocialListPage({
  kind,
}: {
  kind: "followers" | "following";
}) {
  const { username = "" } = useParams();
  const [users, setUsers] = useState<SocialUser[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void apiRequest<SocialPageResponse>(
      `/api/v1/users/${encodeURIComponent(username)}/${kind}?limit=50`,
    )
      .then((response) => {
        if (active) {
          setUsers(response.data.users);
          setError(null);
        }
      })
      .catch((cause) => {
        if (active) setError(getErrorMessage(cause));
      });

    return () => {
      active = false;
    };
  }, [kind, username]);

  return (
    <main className="page-shell narrow-shell">
      <header className="page-heading">
        <div>
          <p className="eyebrow">@{username}</p>
          <h1>{kind === "followers" ? "دنبال‌کنندگان" : "دنبال‌شده‌ها"}</h1>
        </div>
      </header>

      {error ? (
        <p className="status-message status-message--error" role="alert">{error}</p>
      ) : users.length === 0 ? (
        <p className="empty-state">کاربری برای نمایش وجود ندارد.</p>
      ) : (
        <ul className="simple-list">
          {users.map((item) => (
            <li key={item.id}>
              <Link to={`/users/${encodeURIComponent(item.username)}`}>
                <strong>{item.displayName}</strong>
                <span>@{item.username}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
