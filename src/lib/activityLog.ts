import { apiFetch } from './apiClient';

export const logActivity = async (userId: string, action: string, details: any) => {
  try {
    await apiFetch('/api/logs/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        action,
        details,
      }),
    });
  } catch (error) {
    console.error('Error logging activity:', error);
  }
};
