import { NoteType } from '../fns/notesTable';

let url = '';

/**
 * The config.json file will be generated the first time the API is deployed for use in local development.
 * When the UI is deployed, a custom resource will supply the config.json file.
 * If your stack isn't named `CdkThreeTierServerlessStack`, you'll need to update the constant below.
 * @returns the url as a string
 */
const getUrl = async () => {
  if (url) {
    return url;
  }
  const response = await fetch('./config.json');
  url = `${
    (await response.json()).CdkThreeTierServerlessStack.HttpApiUrl
  }/notes`;
  return url;
};

export const getNotes = async () => {
  const result = await fetch(await getUrl());

  return await result.json();
};

export const saveNote = async (note: NoteType) => {
  await fetch(await getUrl(), {
    body: JSON.stringify(note),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
    mode: 'cors',
  });
};
