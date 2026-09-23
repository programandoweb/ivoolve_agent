import { explicitlyAuthorizedGoogleApi } from './hermes-google-policy';

describe('Hermes explicit Google API opt-in', () => {
  it('does not interpret Google search in Chrome as API consent', () => {
    expect(explicitlyAuthorizedGoogleApi('Busca en Google e imágenes usando Chrome')).toBe(false);
    expect(explicitlyAuthorizedGoogleApi('Si falla Chrome usa Google')).toBe(false);
    expect(explicitlyAuthorizedGoogleApi('No autorizo Google API')).toBe(false);
  });
  it('requires an explicit authorization line in the current human input', () => {
    expect(explicitlyAuthorizedGoogleApi('Investiga en Chrome.\nAUTORIZO GOOGLE API')).toBe(true);
    expect(explicitlyAuthorizedGoogleApi('AUTORIZO GOOGLE API')).toBe(true);
  });
});
