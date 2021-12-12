import { NoteType } from '../fns/notesTable';

let url = '';

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
