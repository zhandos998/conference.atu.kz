export const conferenceTypes = ['republican', 'international'];
export const defaultConferenceType = 'republican';

export function isConferenceType(value) {
  return conferenceTypes.includes(value);
}

export function normalizeConferenceType(value) {
  return isConferenceType(value) ? value : defaultConferenceType;
}

export function getConferenceFromPath(pathname = window.location.pathname) {
  const segments = pathname.replace(/\/+$/, '').split('/').filter(Boolean);
  const candidate = segments[0] === 'moderator' ? segments[1] : segments[0];

  return normalizeConferenceType(candidate);
}

export function userConferenceBase(conferenceType) {
  const normalized = normalizeConferenceType(conferenceType);

  return normalized === defaultConferenceType ? '/republican' : `/${normalized}`;
}

export function userApplicationPath(conferenceType, applicationId) {
  return `${userConferenceBase(conferenceType)}/applications/${applicationId}`;
}

export function moderatorConferenceBase(conferenceType) {
  const normalized = normalizeConferenceType(conferenceType);

  return normalized === defaultConferenceType ? '/moderator' : `/moderator/${normalized}`;
}

export function moderatorPagePath(conferenceType, page) {
  const base = moderatorConferenceBase(conferenceType);

  if (page === 'applications') {
    return `${base}/applications`;
  }

  if (page === 'export') {
    return `${base}/export`;
  }

  return base;
}

export function moderatorApplicationPath(conferenceType, applicationId) {
  return `${moderatorPagePath(conferenceType, 'applications')}/${applicationId}`;
}
