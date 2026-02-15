import * as BackgroundTask from "expo-background-task";
import * as TaskManager from "expo-task-manager";
import { runDetailSyncBatch } from "./engine";

const BACKGROUND_SYNC_TASK = "background-detail-sync";

// Define the task at module scope — must be imported at app root
TaskManager.defineTask(BACKGROUND_SYNC_TASK, async () => {
  try {
    await runDetailSyncBatch(10);
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch {
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

/**
 * Register the background sync task. Call once after auth is confirmed.
 */
export async function registerBackgroundSync() {
  try {
    await BackgroundTask.registerTaskAsync(BACKGROUND_SYNC_TASK, {
      minimumInterval: 15 * 60, // 15 minutes
    });
  } catch (err) {
    console.warn("Failed to register background task:", err);
  }
}

/**
 * Unregister the background sync task.
 */
export async function unregisterBackgroundSync() {
  try {
    await BackgroundTask.unregisterTaskAsync(BACKGROUND_SYNC_TASK);
  } catch {
    // Task may not be registered
  }
}
