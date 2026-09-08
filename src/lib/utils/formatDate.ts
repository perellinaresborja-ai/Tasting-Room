export function formatDate(dateStr: string, locale: string, includeYear = false) {
  try {
    const date = new Date(dateStr);
    const options: Intl.DateTimeFormatOptions = {
      day: 'numeric',
      month: 'long',
    };
    if (includeYear) {
      options.year = 'numeric';
    }
    return new Intl.DateTimeFormat(locale, options).format(date);
  } catch (e) {
    return dateStr;
  }
}

export function formatDayOfWeek(dateStr: string, locale: string) {
  try {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat(locale, {
      weekday: 'long'
    }).format(date);
  } catch (e) {
    return "";
  }
}

export function formatTime(timeStr?: string) {
  if (!timeStr) return "";
  // Assuming postgres TIME format "HH:MM:SS", we just take "HH:MM"
  return timeStr.slice(0, 5);
}
