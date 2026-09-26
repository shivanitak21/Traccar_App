import { InteractionManager, Platform } from 'react-native';
import { router as globalRouter } from 'expo-router';
import type { Router } from 'expo-router';

type RouterLike = Pick<Router, 'replace' | 'dismissAll' | 'canDismiss'>;

let loginNavigationPending = false;
let appNavigationPending = false;

function runAfterReady(task: () => void) {
  InteractionManager.runAfterInteractions(() => {
    if (Platform.OS === 'web') {
      task();
      return;
    }
    requestAnimationFrame(task);
  });
}

function getRouter(router?: RouterLike): RouterLike {
  return router ?? globalRouter;
}

/** Reset stack and show the login route once. */
export function navigateToLogin(router?: RouterLike) {
  if (loginNavigationPending) return;
  loginNavigationPending = true;
  appNavigationPending = false;

  const nav = getRouter(router);

  runAfterReady(() => {
    try {
      if (nav.canDismiss?.()) {
        nav.dismissAll();
      }
      nav.replace('/');
    } catch (error) {
      console.warn('Navigate to login failed, retrying...', error);
      try {
        nav.replace('/');
      } catch (retryError) {
        console.error('Navigate to login retry failed', retryError);
      }
    } finally {
      setTimeout(() => {
        loginNavigationPending = false;
      }, 800);
    }
  });
}

/** Enter the main app tabs once after authentication. */
export function navigateToApp(router?: Pick<Router, 'replace'>) {
  if (appNavigationPending) return;
  appNavigationPending = true;

  const nav = getRouter(router as RouterLike);

  runAfterReady(() => {
    try {
      nav.replace('/(tabs)');
    } catch (error) {
      console.warn('Navigate to app failed', error);
    } finally {
      setTimeout(() => {
        appNavigationPending = false;
      }, 800);
    }
  });
}
