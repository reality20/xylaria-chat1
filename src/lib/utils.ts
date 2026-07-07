import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateId(): string {
  return crypto.randomUUID();
}

export function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function generateTitleFromMessage(content: string): string {
  const trimmed = content.trim();
  return trimmed.length <= 30 ? trimmed : trimmed.slice(0, 30) + '...';
}

// Easter egg: konami code tracker
const KONAMI = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
let konamiIndex = 0;

export function checkEasterEgg(key: string): string | null {
  if (key === KONAMI[konamiIndex]) {
    konamiIndex++;
    if (konamiIndex === KONAMI.length) {
      konamiIndex = 0;
      return 'konami';
    }
  } else {
    konamiIndex = key === KONAMI[0] ? 1 : 0;
  }
  // Secret: type "xyzzy" for matrix mode
  if (key === 'Escape') return 'reset';
  return null;
}

export function getSystemPromptWithDate(basePrompt: string): string {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
  const timeStr = now.toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', timeZoneName: 'short'
  });
  return basePrompt
    .replace('{date}', dateStr)
    .replace('{time}', timeStr)
    .replace('{datetime}', now.toISOString());
}
