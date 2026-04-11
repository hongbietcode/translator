import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";

interface PermissionDetail {
  granted: boolean;
  name: string;
  description: string;
}

interface AllPermissions {
  screen_recording: PermissionDetail;
  microphone: PermissionDetail;
  accessibility: PermissionDetail;
  all_granted: boolean;
}

const PERMISSION_KEYS = [
  "screen_recording",
  "microphone",
  "accessibility",
] as const;

const PERMISSION_ICONS: Record<string, string> = {
  screen_recording: "🖥",
  microphone: "🎙",
  accessibility: "⌨",
};

const PERMISSION_INSTRUCTIONS: Record<string, string> = {
  screen_recording:
    'Click "Open Settings", find Translator in the list, and toggle it ON. You may need to restart the app.',
  microphone:
    'Click "Open Settings", find Translator in the list, and toggle it ON.',
  accessibility:
    'Click "Open Settings", click the "+" button, navigate to Applications, and add Translator.',
};

export function OnboardingApp() {
  const [permissions, setPermissions] = useState<AllPermissions | null>(null);
  const [checking, setChecking] = useState(false);

  const refreshPermissions = useCallback(async () => {
    setChecking(true);
    try {
      const result = await invoke<AllPermissions>("check_all_permissions");
      setPermissions(result);
      if (result.all_granted) {
        setTimeout(() => getCurrentWindow().destroy(), 800);
      }
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    refreshPermissions();
  }, [refreshPermissions]);

  useEffect(() => {
    const interval = setInterval(refreshPermissions, 3000);
    return () => clearInterval(interval);
  }, [refreshPermissions]);

  const handleOpenSettings = async (permissionType: string) => {
    if (permissionType === "screen_recording") {
      await invoke("request_screen_recording");
    }
    await invoke("open_permission_settings", {
      permissionType,
    });
  };

  if (!permissions) {
    return (
      <div style={styles.container}>
        <div style={styles.spinner} />
      </div>
    );
  }

  const grantedCount = PERMISSION_KEYS.filter(
    (k) => permissions[k].granted,
  ).length;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.appIcon}>🌐</div>
        <h1 style={styles.title}>Welcome to Translator</h1>
        <p style={styles.subtitle}>
          Grant the following permissions to get started
        </p>
      </div>

      <div style={styles.progressBar}>
        <div
          style={{
            ...styles.progressFill,
            width: `${(grantedCount / PERMISSION_KEYS.length) * 100}%`,
          }}
        />
      </div>
      <p style={styles.progressText}>
        {grantedCount} of {PERMISSION_KEYS.length} permissions granted
      </p>

      <div style={styles.permissionList}>
        {PERMISSION_KEYS.map((key) => {
          const perm = permissions[key];
          return (
            <div
              key={key}
              style={{
                ...styles.permissionCard,
                borderColor: perm.granted
                  ? "var(--color-success)"
                  : "var(--color-border)",
                background: perm.granted
                  ? "var(--color-success-light)"
                  : "var(--color-muted)",
              }}
            >
              <div style={styles.permissionHeader}>
                <span style={styles.permissionIcon}>
                  {PERMISSION_ICONS[key]}
                </span>
                <div style={styles.permissionInfo}>
                  <div style={styles.permissionName}>
                    {perm.name}
                    <span
                      style={{
                        ...styles.badge,
                        background: perm.granted
                          ? "var(--color-success)"
                          : "var(--color-warning)",
                      }}
                    >
                      {perm.granted ? "Granted" : "Required"}
                    </span>
                  </div>
                  <div style={styles.permissionDesc}>{perm.description}</div>
                </div>
              </div>

              {!perm.granted && (
                <div style={styles.permissionAction}>
                  <p style={styles.instruction}>
                    {PERMISSION_INSTRUCTIONS[key]}
                  </p>
                  <button
                    style={styles.openButton}
                    onClick={() => handleOpenSettings(key)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background =
                        "var(--color-accent-dark)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background =
                        "var(--color-accent)";
                    }}
                  >
                    Open Settings
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {permissions.all_granted && (
        <div style={styles.allDone}>
          <span style={styles.checkmark}>✓</span>
          All set! Starting Translator...
        </div>
      )}

      {!permissions.all_granted && (
        <button
          style={styles.refreshButton}
          onClick={refreshPermissions}
          disabled={checking}
        >
          {checking ? "Checking..." : "Refresh Status"}
        </button>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "32px 28px 24px",
    height: "100%",
    overflow: "auto",
    background: "var(--color-background)",
  },
  spinner: {
    width: 24,
    height: 24,
    border: "2px solid var(--color-border)",
    borderTopColor: "var(--color-accent)",
    borderRadius: "50%",
    animation: "spin 0.6s linear infinite",
  },
  header: {
    textAlign: "center" as const,
    marginBottom: 16,
  },
  appIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 700,
    color: "var(--color-foreground)",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: "var(--color-text-2)",
  },
  progressBar: {
    width: "100%",
    height: 4,
    borderRadius: 2,
    background: "var(--color-border)",
    marginBottom: 6,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
    background: "var(--color-success)",
    transition: "width 0.4s ease",
  },
  progressText: {
    fontSize: 12,
    color: "var(--color-text-3)",
    marginBottom: 16,
  },
  permissionList: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    width: "100%",
  },
  permissionCard: {
    borderRadius: "var(--radius-md)",
    border: "1px solid",
    padding: "12px 14px",
    transition: "all 0.3s ease",
  },
  permissionHeader: {
    display: "flex",
    alignItems: "flex-start",
    gap: 10,
  },
  permissionIcon: {
    fontSize: 22,
    lineHeight: 1,
    marginTop: 2,
  },
  permissionInfo: {
    flex: 1,
  },
  permissionName: {
    fontSize: 14,
    fontWeight: 600,
    color: "var(--color-foreground)",
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  badge: {
    fontSize: 10,
    fontWeight: 600,
    color: "#fff",
    padding: "1px 7px",
    borderRadius: 10,
  },
  permissionDesc: {
    fontSize: 12,
    color: "var(--color-text-2)",
    marginTop: 2,
  },
  permissionAction: {
    marginTop: 10,
    marginLeft: 32,
  },
  instruction: {
    fontSize: 11,
    color: "var(--color-text-3)",
    marginBottom: 8,
    lineHeight: 1.4,
  },
  openButton: {
    fontSize: 12,
    fontWeight: 600,
    color: "#fff",
    background: "var(--color-accent)",
    border: "none",
    borderRadius: "var(--radius-sm)",
    padding: "6px 16px",
    cursor: "pointer",
    transition: "background 0.15s ease",
  },
  allDone: {
    marginTop: 20,
    fontSize: 15,
    fontWeight: 600,
    color: "var(--color-success)",
    display: "flex",
    alignItems: "center",
    gap: 8,
    animation: "fade-in-up 0.3s ease",
  },
  checkmark: {
    fontSize: 20,
    fontWeight: 700,
  },
  refreshButton: {
    marginTop: 16,
    fontSize: 12,
    fontWeight: 500,
    color: "var(--color-text-2)",
    background: "var(--color-muted)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-sm)",
    padding: "6px 16px",
    cursor: "pointer",
  },
};
