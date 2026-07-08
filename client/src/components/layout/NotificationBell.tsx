import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { listNotifications, markAllRead, markRead, Notification } from "@/api/notifications";
import { formatDateTime } from "@/utils/format";

const POLL_INTERVAL_MS = 60_000;

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  function load() {
    listNotifications()
      .then(setNotifications)
      .catch(() => {
        // Non-critical: a failed notification fetch shouldn't disrupt the rest of the app.
      });
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  async function handleOpen() {
    setOpen((o) => !o);
  }

  async function handleNotificationClick(n: Notification) {
    if (n.read) return;
    setNotifications((prev) => prev.map((p) => (p.id === n.id ? { ...p, read: true } : p)));
    try {
      await markRead(n.id);
    } catch {
      // if this fails, the next poll will resync the true state
    }
  }

  async function handleMarkAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await markAllRead();
    } catch {
      // next poll resyncs
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={handleOpen}
        aria-label="Notifications"
        className="relative rounded-lg p-2 text-ink-500 hover:bg-ink-50 hover:text-ink-800"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-ink-100 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3">
            <p className="text-sm font-semibold text-ink-800">Notifications</p>
            {unreadCount > 0 && (
              <button onClick={handleMarkAllRead} className="text-xs font-medium text-brand-700 hover:underline">
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-ink-400">You're all caught up.</p>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`block w-full border-b border-ink-50 px-4 py-3 text-left text-sm last:border-0 hover:bg-ink-50 ${
                    n.read ? "text-ink-500" : "bg-brand-50/60 font-medium text-ink-800"
                  }`}
                >
                  <p>{n.message}</p>
                  <p className="mt-1 text-xs text-ink-400">{formatDateTime(n.createdAt)}</p>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
